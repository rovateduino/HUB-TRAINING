const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, admin } = require('./_base.cjs');

const COL_CHECKPOINTS = 'lesson_checkpoints';
const COL_OPTIONS = 'checkpoint_options';
const COL_ANSWERS = 'checkpoint_answers';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

function _answerDocId(userId, checkpointId) {
  return `${String(userId)}_${String(checkpointId)}`;
}

async function getCheckpointsByLesson(lessonId) {
  if (!lessonId) return [];
  const lidC = _coerceInt(lessonId);
  try {
    const q = collection(COL_CHECKPOINTS)
      .where('lesson_id', '==', lidC)
      .orderBy('order_num', 'asc');
    return await parseDocs(q);
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const rows = await parseDocs(collection(COL_CHECKPOINTS).where('lesson_id', '==', lidC));
    const mine = rows.filter((c) => String(c.lesson_id) === String(lessonId));
    mine.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));
    return mine;
  }
}

async function getCheckpointById(checkpointId) {
  if (!checkpointId) return null;
  return parseDoc(await docRef(COL_CHECKPOINTS, String(checkpointId)).get());
}

async function getCheckpointOptions(checkpointId) {
  if (!checkpointId) return [];
  const cidC = _coerceInt(checkpointId);
  let rows;
  try {
    const q = collection(COL_OPTIONS)
      .where('checkpoint_id', '==', cidC)
      .orderBy('order_num', 'asc');
    rows = await parseDocs(q);
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const all = await parseDocs(collection(COL_OPTIONS).where('checkpoint_id', '==', cidC));
    rows = all.filter((o) => String(o.checkpoint_id) === String(checkpointId));
    rows.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));
  }
  return rows.map((r) => {
    const { is_correct, ...safe } = r;
    return safe;
  });
}

async function getCheckpointOptionsWithCorrect(checkpointId) {
  if (!checkpointId) return [];
  const cidC = _coerceInt(checkpointId);
  try {
    const q = collection(COL_OPTIONS)
      .where('checkpoint_id', '==', cidC)
      .orderBy('order_num', 'asc');
    return await parseDocs(q);
  } catch {
    // Fallback sem índice composto: filtro simples + ordenação client-side
    const all = await parseDocs(collection(COL_OPTIONS).where('checkpoint_id', '==', cidC));
    const mine = all.filter((o) => String(o.checkpoint_id) === String(checkpointId));
    mine.sort((a, b) => (Number(a.order_num) || 0) - (Number(b.order_num) || 0));
    return mine;
  }
}

async function getCheckpointsWithOptionsByLesson(lessonId, { includeCorrect = false } = {}) {
  const checkpoints = await getCheckpointsByLesson(lessonId);
  const fn = includeCorrect ? getCheckpointOptionsWithCorrect : getCheckpointOptions;
  const out = [];
  for (const c of checkpoints) {
    const options = await fn(c.id);
    out.push({ ...c, options });
  }
  return out;
}

async function getOptionById(optionId, checkpointId = null) {
  if (!optionId) return null;
  const opt = await parseDoc(await docRef(COL_OPTIONS, String(optionId)).get());
  if (!opt) return null;
  if (checkpointId != null && String(opt.checkpoint_id) !== String(checkpointId)) return null;
  return opt;
}

async function saveCheckpointAnswer(userId, checkpointId, selectedOptionId, isCorrect = null, lessonId = null, extra = {}) {
  if (!userId || !checkpointId || !selectedOptionId) {
    throw new Error('saveCheckpointAnswer: userId, checkpointId, selectedOptionId obrigatórios');
  }
  const docId = _answerDocId(userId, checkpointId);
  const ref = docRef(COL_ANSWERS, docId);
  const snap = await ref.get();
  if (snap.exists) {
    return { already_answered: true, answer: parseDoc(snap) };
  }
  let resolvedCorrect = isCorrect;
  if (resolvedCorrect == null) {
    const opt = await getOptionById(selectedOptionId, checkpointId);
    resolvedCorrect = !!(opt && (opt.is_correct === true || opt.is_correct === 1));
  }
  const lidC = lessonId != null ? _coerceInt(lessonId) : null;
  const payload = {
    id: docId,
    user_id: _coerceInt(userId),
    checkpoint_id: _coerceInt(checkpointId),
    selected_option_id: _coerceInt(selectedOptionId),
    is_correct: !!resolvedCorrect,
    attempt_number: extra && extra.attempt_number != null ? extra.attempt_number : 1,
    answered_at: now(),
  };
  if (lidC != null) payload.lesson_id = lidC;
  if (extra && extra.by_admin != null) payload.by_admin = extra.by_admin ? true : false;
  await ref.set(payload);
  return { already_answered: false, answer: await parseDoc(await ref.get()) };
}

async function hasAnswered(userId, checkpointId) {
  if (!userId || !checkpointId) return false;
  const ref = docRef(COL_ANSWERS, _answerDocId(userId, checkpointId));
  return (await ref.get()).exists;
}

async function getMyAnswers(userId, lessonId = null) {
  if (!userId) return [];
  const uidC = _coerceInt(userId);
  if (lessonId != null) {
    const lidC = _coerceInt(lessonId);
    try {
      const q = collection(COL_ANSWERS)
        .where('user_id', '==', uidC)
        .where('lesson_id', '==', lidC);
      return parseDocs(q);
    } catch {
      const all = await parseDocs(collection(COL_ANSWERS).where('user_id', '==', uidC));
      return all.filter((a) => String(a.lesson_id) === String(lessonId));
    }
  }
  return parseDocs(collection(COL_ANSWERS).where('user_id', '==', uidC));
}

async function countAnsweredCheckpoints(userId) {
  const answers = await getMyAnswers(userId);
  const set = new Set();
  for (const a of answers) set.add(String(a.checkpoint_id));
  return set.size;
}

async function createCheckpoint(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (payload.checkpoint_id) delete payload.checkpoint_id;
  if (payload.lesson_id != null) payload.lesson_id = _coerceInt(payload.lesson_id);
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_CHECKPOINTS, String(id));
  await ref.set(payload);
  return getCheckpointById(id);
}

async function updateCheckpoint(id, patch) {
  if (!id) throw new Error('updateCheckpoint: id obrigatório');
  const ref = docRef(COL_CHECKPOINTS, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return getCheckpointById(id);
}

async function deleteCheckpoint(id) {
  if (!id) return false;
  await docRef(COL_CHECKPOINTS, String(id)).delete();
  return true;
}

async function createOption(data) {
  const payload = { ...data };
  const id = payload.id || crypto.randomUUID().replace(/-/g, '');
  delete payload.id;
  if (typeof payload.order_num === 'undefined') payload.order_num = 0;
  if (payload.checkpoint_id != null) payload.checkpoint_id = _coerceInt(payload.checkpoint_id);
  if (typeof payload.is_correct === 'undefined') payload.is_correct = false;
  payload.created_at = payload.created_at || now();
  payload.updated_at = now();
  const ref = docRef(COL_OPTIONS, String(id));
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function updateOption(id, patch) {
  if (!id) throw new Error('updateOption: id obrigatório');
  const ref = docRef(COL_OPTIONS, String(id));
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.update(data);
  return parseDoc(await ref.get());
}

async function deleteOption(id) {
  if (!id) return false;
  await docRef(COL_OPTIONS, String(id)).delete();
  return true;
}

module.exports = {
  getCheckpointsByLesson,
  getCheckpointById,
  getCheckpointOptions,
  getCheckpointOptionsWithCorrect,
  getCheckpointsWithOptionsByLesson,
  getOptionById,
  saveCheckpointAnswer,
  hasAnswered,
  getMyAnswers,
  countAnsweredCheckpoints,
  createCheckpoint,
  updateCheckpoint,
  deleteCheckpoint,
  createOption,
  updateOption,
  deleteOption,
};
