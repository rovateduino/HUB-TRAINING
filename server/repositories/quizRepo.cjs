const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, batch, admin } = require('./_base.cjs');

const COL_QUESTIONS = 'questions';
const COL_QOPTIONS = 'question_options';
const COL_ATTEMPTS = 'quiz_attempts';
const COL_ANSWERS = 'quiz_answers';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

function _sortQuestions(rows) {
  return rows.sort((a, b) => {
    const oa = Number(a.order_num) || 0;
    const ob = Number(b.order_num) || 0;
    if (oa !== ob) return oa - ob;
    return String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0;
  });
}

function _bankOf(q) {
  const c = String((q && q.category) || '');
  if (/^NR-10/.test(c)) return 'nr10';
  if (/^AC(\s|-|$)/.test(c)) return 'ac';
  return 'base';
}

// Simulado final: cobertura estratificada determinística entre os 3 bancos
// (base + NR-10 + AC), preservando a ordem interna de cada banco.
function _stratifyBanks(rows, perBank) {
  const banks = { base: [], nr10: [], ac: [] };
  for (const r of rows) banks[_bankOf(r)].push(r);
  const out = [];
  for (const k of ['base', 'nr10', 'ac']) out.push(...banks[k].slice(0, perBank));
  // Defesa: se algum banco tiver menos que perBank, completa com o restante do pool em ordem.
  if (out.length < perBank * 3) {
    const inOut = new Set(out.map((r) => String(r.id)));
    for (const r of rows) {
      if (out.length >= perBank * 3) break;
      if (!inOut.has(String(r.id))) out.push(r);
    }
  }
  return out;
}

async function listQuestions(count = 30, shuffleSeed = null) {
  let rows;
  try {
    const q = collection(COL_QUESTIONS).where('is_active', '==', true).orderBy('order_num', 'asc').orderBy('id', 'asc');
    rows = await parseDocs(q.limit(500));
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const all = await parseDocs(collection(COL_QUESTIONS).where('is_active', '==', true));
    const mine = all.filter((r) => r.is_active === true || r.is_active === 1);
    rows = _sortQuestions(mine);
  }
  if (Number(count) === 30) {
    rows = _stratifyBanks(rows, 10);
  } else if (Number(count) > 0) {
    rows = rows.slice(0, Math.min(Number(count), 500));
  }
  if (shuffleSeed != null) {
    let seed = Number(shuffleSeed) || Array.from(String(shuffleSeed)).reduce((a, c) => a + c.charCodeAt(0), 0);
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    rows = [...rows].sort(() => rnd() - 0.5);
  }
  const withOpts = [];
  for (const qu of rows) {
    const opts = await _getQuestionOptions(qu.id, false);
    withOpts.push({ ...qu, options: opts });
  }
  return withOpts;
}

async function listQuestionsFull(count = 30) {
  const rows = await listQuestions(count);
  const out = [];
  for (const q of rows) {
    const fullOpts = await _getQuestionOptions(q.id, true);
    out.push({ ...q, options: fullOpts });
  }
  return out;
}

async function _getQuestionOptions(questionId, includeCorrect = false) {
  const qidC = _coerceInt(questionId);
  let rows;
  try {
    const q = collection(COL_QOPTIONS).where('question_id', '==', qidC).orderBy('order_num', 'asc');
    rows = await parseDocs(q);
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const all = await parseDocs(collection(COL_QOPTIONS).where('question_id', '==', qidC));
    rows = all.filter((o) => String(o.question_id) === String(questionId));
    rows.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));
  }
  if (includeCorrect) return rows;
  return rows.map((r) => {
    const { is_correct, ...safe } = r;
    return safe;
  });
}

async function getQuestionById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL_QUESTIONS, String(id)).get());
}

async function getQuestionOptionsWithCorrect(questionId) {
  return _getQuestionOptions(questionId, true);
}

async function getOptionById(optionId, questionId = null) {
  if (!optionId) return null;
  const opt = await parseDoc(await docRef(COL_QOPTIONS, String(optionId)).get());
  if (!opt) return null;
  if (questionId != null && String(opt.question_id) !== String(questionId)) return null;
  return opt;
}

async function saveQuizAttempt(userId, payload = {}) {
  if (!userId) throw new Error('saveQuizAttempt: userId obrigatório');
  const uidC = _coerceInt(userId);
  const attemptId = payload.id || crypto.randomUUID().replace(/-/g, '');
  const data = { ...payload };
  delete data.id;
  data.user_id = uidC;
  data.created_at = data.created_at || now();
  data.started_at = data.started_at || now();
  data.completed_at = data.completed_at || now();
  if (typeof data.total === 'undefined') data.total = 30;
  if (typeof data.passed === 'undefined') data.passed = false;
  if (typeof data.attempt_number === 'undefined') {
    const used = await countAttemptsByUser(userId);
    data.attempt_number = used + 1;
  }
  const ref = docRef(COL_ATTEMPTS, String(attemptId));
  await ref.set(data);
  return getQuizAttempt(attemptId);
}

async function saveQuizAnswer(attemptId, questionId, selectedOptionId, isCorrect) {
  if (!attemptId || !questionId) throw new Error('saveQuizAnswer: attemptId e questionId obrigatórios');
  const docId = `${String(attemptId)}_${String(questionId)}`;
  const ref = docRef(COL_ANSWERS, docId);
  const payload = {
    attempt_id: _coerceInt(attemptId) ?? attemptId,
    question_id: _coerceInt(questionId),
    selected_option_id: selectedOptionId != null ? _coerceInt(selectedOptionId) ?? selectedOptionId : null,
    is_correct: !!isCorrect,
    answered_at: now(),
  };
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function getQuizAttempt(attemptId) {
  if (!attemptId) return null;
  const a = await parseDoc(await docRef(COL_ATTEMPTS, String(attemptId)).get());
  if (!a) return null;
  return a;
}

async function getQuizAttemptFull(attemptId) {
  const a = await getQuizAttempt(attemptId);
  if (!a) return null;
  let answers;
  try {
    answers = await parseDocs(collection(COL_ANSWERS).where('attempt_id', '==', _coerceInt(attemptId) ?? attemptId));
  } catch {
    const all = await parseDocs(collection(COL_ANSWERS));
    answers = all.filter((x) => String(x.attempt_id) === String(attemptId));
  }
  return { ...a, answers: answers || [] };
}

async function getQuizAttemptsByUser(userId, limit = 20) {
  if (!userId) return [];
  const uidC = _coerceInt(userId);
  let q;
  try {
    q = collection(COL_ATTEMPTS).where('user_id', '==', uidC).orderBy('created_at', 'desc');
    if (limit > 0) q = q.limit(limit);
    return await parseDocs(q);
  } catch {
    const all = await parseDocs(collection(COL_ATTEMPTS).orderBy('created_at', 'desc'));
    const filtered = all.filter((x) => String(x.user_id) === String(userId));
    return limit > 0 ? filtered.slice(0, limit) : filtered;
  }
}

async function countAttemptsByUser(userId) {
  const rows = await getQuizAttemptsByUser(userId, 0);
  return rows.length;
}

async function hasPassedAttempt(userId) {
  const rows = await getQuizAttemptsByUser(userId, 0);
  return rows.some((r) => r.passed === true || r.passed === 1);
}

async function getLastPassedAttempt(userId) {
  const rows = await getQuizAttemptsByUser(userId, 0);
  const passed = rows.filter((r) => r.passed === true || r.passed === 1);
  return passed[0] || null;
}

async function listAttemptsAdmin({ user, result, from, to, page = 1, pageSize = 100 } = {}) {
  let rows = await parseDocs(collection(COL_ATTEMPTS).orderBy('created_at', 'desc').limit(Math.min(pageSize * 5, 1000)));
  if (user) {
    const u = String(user).toLowerCase();
    rows = rows.filter((r) => {
      const n = String(r.user_name || '').toLowerCase();
      const e = String(r.user_email || '').toLowerCase();
      return n.includes(u) || e.includes(u);
    });
  }
  if (result === 'APROVADO') rows = rows.filter((r) => r.passed === true || r.passed === 1);
  if (result === 'REPROVADO' || result === 'NAO_APROVADO') rows = rows.filter((r) => !(r.passed === true || r.passed === 1));
  if (from) {
    const t = new Date(from).getTime();
    rows = rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= t);
  }
  if (to) {
    const t = new Date(to).getTime();
    rows = rows.filter((r) => r.created_at && new Date(r.created_at).getTime() <= t);
  }
  return { attempts: rows, total: rows.length, page, pageSize };
}

async function createQuestion(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (typeof payload.is_active === 'undefined') payload.is_active = true;
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_QUESTIONS, String(id));
  await ref.set(payload);
  return getQuestionById(id);
}

async function updateQuestion(id, patch) {
  if (!id) throw new Error('updateQuestion: id obrigatório');
  const ref = docRef(COL_QUESTIONS, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return getQuestionById(id);
}

async function deleteQuestion(id) {
  if (!id) return false;
  await docRef(COL_QUESTIONS, String(id)).delete();
  return true;
}

async function createQuestionOption(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (typeof payload.is_correct === 'undefined') payload.is_correct = false;
  if (payload.question_id != null) payload.question_id = _coerceInt(payload.question_id);
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_QOPTIONS, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function updateQuestionOption(id, patch) {
  if (!id) throw new Error('updateQuestionOption: id obrigatório');
  const ref = docRef(COL_QOPTIONS, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return parseDoc(await ref.get());
}

async function deleteQuestionOption(id) {
  if (!id) return false;
  await docRef(COL_QOPTIONS, String(id)).delete();
  return true;
}

async function deleteAttemptAndAnswers(attemptId) {
  if (!attemptId) return false;
  const full = await getQuizAttemptFull(attemptId);
  const b = batch();
  if (full && full.answers) {
    for (const a of full.answers) {
      b.delete(docRef(COL_ANSWERS, `${String(attemptId)}_${String(a.question_id)}`));
    }
  }
  b.delete(docRef(COL_ATTEMPTS, String(attemptId)));
  await b.commit();
  return true;
}

async function deleteAttemptsByUser(userId) {
  if (userId == null) return 0;
  const rows = await getQuizAttemptsByUser(userId, 0);
  let deleted = 0;
  for (const r of rows) {
    await deleteAttemptAndAnswers(r.id);
    deleted += 1;
  }
  return deleted;
}

module.exports = {
  listQuestions,
  listQuestionsFull,
  getQuestionById,
  getQuestionOptionsWithCorrect,
  getOptionById,
  saveQuizAttempt,
  saveQuizAnswer,
  getQuizAttempt,
  getQuizAttemptFull,
  getQuizAttemptsByUser,
  countAttemptsByUser,
  hasPassedAttempt,
  getLastPassedAttempt,
  listAttemptsAdmin,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  createQuestionOption,
  updateQuestionOption,
  deleteQuestionOption,
  deleteAttemptAndAnswers,
  deleteAttemptsByUser,
};
