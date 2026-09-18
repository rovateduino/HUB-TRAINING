const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, counter, batch } = require('./_base.cjs');
const { promoteUserRole: authPromote, setUserActive: authSetActive, listUsers, findUserById, findUserByEmail } = require('./authRepo.cjs');
const { createModule, createLesson, listModules, getAllLessons } = require('./trainingRepo.cjs');
const { deleteAttemptAndAnswers, deleteAttemptsByUser, getQuizAttemptsByUser, getQuizAttemptFull } = require('./quizRepo.cjs');
const { getProgress } = require('./progressRepo.cjs');
const { countAnsweredCheckpoints } = require('./checkpointRepo.cjs');
const { getMyCertificates } = require('./certificateRepo.cjs');

const COL_INVITE = 'invite_tokens';
const COL_RESET = 'password_reset_tokens';
const COL_PRACTICAL = 'practical_evaluations';
const COL_SETTINGS = 'certificate_settings';
const COL_WORKLOAD = 'module_workload';
const COL_ANSWERS = 'quiz_answers';
const COL_USERS = 'users';
const COL_MODULES = 'training_modules';
const COL_LESSONS = 'training_lessons';
const COL_CHECKPOINTS = 'lesson_checkpoints';
const COL_COPT = 'checkpoint_options';
const COL_QUES = 'questions';
const COL_QOPT = 'question_options';
const COL_ATTEMPTS = 'quiz_attempts';
const COL_PROGRESS = 'lesson_progress';
const COL_CERT = 'certificates';

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function promoteUserRole(userId, newRole) {
  return authPromote(userId, newRole);
}

async function setUserActive(userId, isActive) {
  return authSetActive(userId, isActive);
}

async function getAllUsersCsvFields() {
  const { items } = await listUsers({}, { page: 1, pageSize: 5000 });
  return items.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    identifier: u.identifier || null,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    last_login_at: u.last_login_at || null,
  }));
}

async function bulkImportContent(modules = [], lessons = []) {
  const b = batch();
  const modIds = [];
  for (const m of modules) {
    const id = m.id || crypto.randomUUID().replace(/-/g, '');
    modIds.push(id);
    const data = { ...m };
    delete data.id;
    if (typeof data.order_num === 'undefined') data.order_num = 0;
    if (typeof data.status === 'undefined') data.status = 'PENDING_TECHNICAL_VALIDATION';
    data.created_at = data.created_at || now();
    data.updated_at = now();
    b.set(docRef(COL_MODULES, String(id)), data);
  }
  const lesIds = [];
  for (const l of lessons) {
    const id = l.id || crypto.randomUUID().replace(/-/g, '');
    lesIds.push(id);
    const data = { ...l };
    delete data.id;
    if (typeof data.order_num === 'undefined') data.order_num = 0;
    if (typeof data.status === 'undefined') data.status = 'PENDING_TECHNICAL_VALIDATION';
    if (data.module_id != null) data.module_id = _coerceInt(data.module_id);
    data.created_at = data.created_at || now();
    data.updated_at = now();
    b.set(docRef(COL_LESSONS, String(id)), data);
  }
  const commitLimit = 500;
  const count = modules.length + lessons.length;
  if (count <= commitLimit) {
    await b.commit();
  } else {
    await _commitInChunks([...modules.map(m => ({ col: COL_MODULES, ...m })), ...lessons.map(l => ({ col: COL_LESSONS, ...l }))]);
  }
  return { imported_modules: modIds.length, imported_lessons: lesIds.length, module_ids: modIds, lesson_ids: lesIds };
}

async function _commitInChunks(ops) {
  while (ops.length > 0) {
    const chunk = ops.splice(0, 490);
    const b = batch();
    for (const it of chunk) {
      const id = it.id || crypto.randomUUID().replace(/-/g, '');
      const data = { ...it };
      delete data.col;
      delete data.id;
      data.updated_at = now();
      b.set(docRef(it.col, String(id)), data, { merge: true });
    }
    await b.commit();
  }
}

// =================== INVITE TOKENS ===================

async function createInviteToken({ email, ttl_hours = 168, max_uses = 1, created_by }) {
  const token = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + Number(ttl_hours || 168) * 3600 * 1000).toISOString();
  const payload = {
    id,
    token,
    email_restriction: email ? String(email).trim().toLowerCase() : null,
    created_by: created_by != null ? _coerceInt(created_by) : null,
    max_uses: Number(max_uses) || 1,
    remaining_uses: Number(max_uses) || 1,
    expires_at: expiresAt,
    revoked: false,
    revoked_by: null,
    revoked_at: null,
    used_by: null,
    created_at: now(),
  };
  const ref = docRef(COL_INVITE, id);
  await ref.set(payload);
  return parseDoc(await ref.get());
}

async function listInviteTokens({ status = 'all' } = {}) {
  const rows = await parseDocs(collection(COL_INVITE).orderBy('created_at', 'desc'));
  const nowMs = Date.now();
  const enriched = rows.map((r) => {
    const expired = new Date(r.expires_at || 0).getTime() < nowMs;
    let derived = 'active';
    if (r.revoked) derived = 'revoked';
    else if (Number(r.remaining_uses || 0) <= 0) derived = 'used';
    else if (expired) derived = 'expired';
    return { ...r, status: derived };
  });
  if (status && status !== 'all') return enriched.filter((r) => r.status === status);
  return enriched;
}

async function revokeInviteToken(id, revokedBy) {
  if (!id) return null;
  const ref = docRef(COL_INVITE, String(id));
  const snap = await ref.get();
  if (!snap.exists) return null;
  if (snap.data().revoked) return parseDoc(snap);
  await ref.update({
    revoked: true,
    revoked_by: revokedBy != null ? _coerceInt(revokedBy) : null,
    revoked_at: now(),
    updated_at: now(),
  });
  return parseDoc(await ref.get());
}

async function findInviteTokenByToken(token) {
  if (!token) return null;
  try {
    const rows = await parseDocs(collection(COL_INVITE).where('token', '==', String(token)).limit(1));
    return rows && rows[0] ? rows[0] : null;
  } catch {
    const all = await parseDocs(collection(COL_INVITE));
    return all.find((r) => r.token === token) || null;
  }
}

async function consumeInviteToken(token, usedBy) {
  const it = await findInviteTokenByToken(token);
  if (!it) return null;
  if (it.revoked) return { valid: false, reason: 'revoked', token: it };
  if (Number(it.remaining_uses || 0) <= 0) return { valid: false, reason: 'used', token: it };
  if (new Date(it.expires_at || 0).getTime() < Date.now()) return { valid: false, reason: 'expired', token: it };
  const ref = docRef(COL_INVITE, String(it.id));
  const patch = { remaining_uses: counter(-1), used_by: usedBy != null ? _coerceInt(usedBy) : it.used_by, updated_at: now() };
  await ref.update(patch);
  return { valid: true, token: parseDoc(await ref.get()) };
}

// =================== PASSWORD RESET TOKENS ===================

async function createResetToken(userId, ttl_hours = 1) {
  if (!userId) throw new Error('createResetToken: userId obrigatório');
  const uidC = _coerceInt(userId);
  const token = crypto.randomBytes(20).toString('hex');
  const id = crypto.randomUUID().replace(/-/g, '');
  const expiresAt = new Date(Date.now() + Number(ttl_hours || 1) * 3600 * 1000).toISOString();
  const payload = {
    id, token, user_id: uidC, expires_at: expiresAt,
    used: false, consumed_at: null, created_at: now(),
  };
  await docRef(COL_RESET, id).set(payload);
  return { token, expires_at: expiresAt, user_id: uidC, id };
}

async function findResetToken(token) {
  if (!token) return null;
  try {
    const rows = await parseDocs(collection(COL_RESET).where('token', '==', String(token)).limit(1));
    return rows && rows[0] ? rows[0] : null;
  } catch {
    const all = await parseDocs(collection(COL_RESET));
    return all.find((r) => r.token === token) || null;
  }
}

async function countActiveResetTokens(userId) {
  if (userId == null) return 0;
  const nowMs = Date.now();
  const isActive = (r) => !r.used && !r.consumed_at && !r.revoked && !r.used_by
    && new Date(r.expires_at || 0).getTime() > nowMs;
  try {
    const rows = await parseDocs(collection(COL_RESET).where('user_id', '==', _coerceInt(userId)));
    const mine = rows.filter((r) => String(r.user_id) === String(userId));
    return mine.filter(isActive).length;
  } catch {
    const all = await parseDocs(collection(COL_RESET));
    return all.filter((r) => String(r.user_id) === String(userId)).filter(isActive).length;
  }
}

async function consumeResetToken(token, usedBy) {
  const row = await findResetToken(token);
  if (!row) return null;
  if (row.used || row.consumed_at || row.revoked || row.used_by) return { valid: false, token: row };
  if (new Date(row.expires_at || 0).getTime() < Date.now()) return { valid: false, token: row };
  const ref = docRef(COL_RESET, String(row.id));
  await ref.update({
    used: true,
    consumed_at: now(),
    used_by: usedBy != null ? _coerceInt(usedBy) : null,
    updated_at: now(),
  });
  return { valid: true, token: parseDoc(await ref.get()) };
}

// =================== PRACTICAL RECORDS (CRUD) ===================

async function listPracticalEvaluations({ evaluator_id = null, user_id = null } = {}) {
  let rows = await parseDocs(collection(COL_PRACTICAL).orderBy('updated_at', 'desc').limit(5000));
  if (evaluator_id != null) rows = rows.filter((r) => String(r.evaluator_id) === String(evaluator_id));
  if (user_id != null) rows = rows.filter((r) => String(r.user_id) === String(user_id));
  return rows;
}

async function getPracticalByUserId(userId) {
  if (!userId) return null;
  const rows = await listPracticalEvaluations({ user_id: userId });
  return rows[0] || null;
}

async function upsertPracticalEvaluation(userId, payload = {}) {
  if (!userId) throw new Error('upsertPracticalEvaluation: userId obrigatório');
  const uidC = _coerceInt(userId);
  const existing = await getPracticalByUserId(userId);
  let id;
  if (existing) {
    id = existing.id;
    const ref = docRef(COL_PRACTICAL, String(id));
    const data = { ...payload };
    delete data.id;
    delete data.user_id;
    if (data.evaluator_id != null) data.evaluator_id = _coerceInt(data.evaluator_id);
    data.updated_at = now();
    await ref.update(data);
  } else {
    id = payload.id || crypto.randomUUID().replace(/-/g, '');
    const data = { ...payload };
    delete data.id;
    data.user_id = uidC;
    if (data.evaluator_id != null) data.evaluator_id = _coerceInt(data.evaluator_id);
    data.created_at = data.created_at || now();
    data.updated_at = now();
    await docRef(COL_PRACTICAL, String(id)).set(data);
  }
  return parseDoc(await docRef(COL_PRACTICAL, String(id)).get());
}

// =================== DASHBOARD COUNTS ===================

async function getDashboardCounts() {
  const cols = [COL_MODULES, COL_LESSONS, COL_CHECKPOINTS, COL_ATTEMPTS, COL_USERS, COL_CERT, COL_PROGRESS];
  const out = { modules: 0, lessons: 0, checkpoints: 0, attempts: 0, passed: 0, users: 0, certificates: 0 };
  for (const colName of [COL_MODULES, COL_LESSONS, COL_CHECKPOINTS, COL_ATTEMPTS, COL_USERS, COL_CERT]) {
    try {
      const rows = await parseDocs(collection(colName).limit(5000));
      if (colName === COL_MODULES) out.modules = rows.length;
      if (colName === COL_LESSONS) out.lessons = rows.length;
      if (colName === COL_CHECKPOINTS) out.checkpoints = rows.length;
      if (colName === COL_ATTEMPTS) {
        out.attempts = rows.length;
        out.passed = rows.filter((r) => r.passed === true || r.passed === 1).length;
      }
      if (colName === COL_USERS) out.users = rows.length;
      if (colName === COL_CERT) out.certificates = rows.length;
    } catch { /* ignore per-collection errors */ }
  }
  out.failed = (out.attempts || 0) - (out.passed || 0);
  return out;
}

// =================== CONTENT CRUD DELEGATES ===================

async function deleteModuleById(id) {
  if (!id) return false;
  await docRef(COL_MODULES, String(id)).delete();
  return true;
}

async function deleteLessonById(id) {
  if (!id) return false;
  await docRef(COL_LESSONS, String(id)).delete();
  return true;
}

async function deleteCheckpointById(id) {
  if (!id) return false;
  await docRef(COL_CHECKPOINTS, String(id)).delete();
  return true;
}

async function deleteQuestionById(id) {
  if (!id) return false;
  await docRef(COL_QUES, String(id)).delete();
  return true;
}

// =================== INVITE TOKENS DELETE ===================

async function deleteInviteToken(id) {
  if (!id) return false;
  const ref = docRef(COL_INVITE, String(id));
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

async function deleteInviteTokens(ids = []) {
  let deleted = 0;
  for (const id of ids || []) {
    if (await deleteInviteToken(id)) deleted += 1;
  }
  return deleted;
}

// =================== CERTIFICATE SETTINGS ===================

async function getCertificateSettings() {
  const ref = docRef(COL_SETTINGS, '1');
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({ id: '1', created_at: now(), updated_at: now() });
    return parseDoc(await ref.get());
  }
  return parseDoc(snap);
}

async function updateCertificateSettings(patch = {}) {
  const ref = docRef(COL_SETTINGS, '1');
  const data = { ...patch };
  delete data.id;
  data.updated_at = now();
  await ref.set(data, { merge: true });
  return parseDoc(await ref.get());
}

// =================== MODULE WORKLOAD ===================

async function listModuleWorkload() {
  const [modules, rows] = await Promise.all([
    listModules().catch(() => []),
    parseDocs(collection(COL_WORKLOAD)).catch(() => []),
  ]);
  const hoursByModule = new Map(rows.map((r) => [String(r.id), r.hours != null ? r.hours : null]));
  return modules.map((m) => ({
    id: m.id,
    order_num: m.order_num,
    title: m.title,
    hours: hoursByModule.has(String(m.id)) ? hoursByModule.get(String(m.id)) : null,
  }));
}

async function setModuleWorkload(hoursMap = {}) {
  for (const [mid, h] of Object.entries(hoursMap || {})) {
    if (mid == null || String(mid).trim() === '') continue;
    const v = typeof h === 'string' && h.trim() ? h.trim().slice(0, 50) : null;
    await docRef(COL_WORKLOAD, String(mid)).set({ id: String(mid), hours: v, updated_at: now() }, { merge: true });
  }
  return true;
}

// =================== TRAINING STATUS (pipeline / emissão) ===================

const TRAINING_NAME_DEFAULT = 'Treinamento de Manutenção Elétrica — HUBs, Sites e Data Centers';
const STATUS = {
  TRAINING_IN_PROGRESS: 'TRAINING_IN_PROGRESS',
  THEORY_NOT_COMPLETED: 'THEORY_NOT_COMPLETED',
  THEORY_FAILED: 'THEORY_FAILED',
  THEORY_APPROVED: 'THEORY_APPROVED',
  PRACTICAL_EVALUATION_PENDING: 'PRACTICAL_EVALUATION_PENDING',
  PRACTICAL_NOT_APPROVED: 'PRACTICAL_NOT_APPROVED',
  PRACTICAL_APPROVED: 'PRACTICAL_APPROVED',
  READY_FOR_ADMIN_CERTIFICATION: 'READY_FOR_ADMIN_CERTIFICATION',
  CERTIFICATE_ISSUED: 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED: 'CERTIFICATE_REVOKED',
};

function _practicalView(row) {
  if (!row) return null;
  let criteria = row.criteria_data != null ? row.criteria_data : row.criteria;
  if (typeof criteria === 'string') {
    try { criteria = JSON.parse(criteria); } catch { criteria = []; }
  }
  if (!Array.isArray(criteria)) criteria = [];
  return {
    id: row.id, result: row.result, evaluation_date: row.evaluation_date,
    observations: row.observations, criteria,
    evaluator_name: row.evaluator_name, evaluator_title: row.evaluator_title,
  };
}

async function getTrainingStatus(userId) {
  const [lessons, modules, progress] = await Promise.all([
    getAllLessons().catch(() => []),
    listModules().catch(() => []),
    getProgress(userId).catch(() => []),
  ]);
  const totalLessons = lessons.length;
  const doneSet = new Set(
    progress.filter((p) => p.status === 'COMPLETED').map((p) => String(p.lesson_id))
  );
  const doneLessons = progress.filter((p) => p.status === 'COMPLETED').length;
  const totalModules = modules.length;
  let doneModules = 0;
  for (const m of modules) {
    const lids = lessons.filter((l) => String(l.module_id) === String(m.id)).map((l) => String(l.id));
    if (!lids.length) continue;
    const c = lids.filter((id) => doneSet.has(id)).length;
    if (c === lids.length) doneModules++;
  }
  const allCps = await parseDocs(collection(COL_CHECKPOINTS).limit(5000)).catch(() => []);
  const totalCheckpoints = allCps.length;
  const answeredCheckpoints = await countAnsweredCheckpoints(userId).catch(() => 0);
  const attempts = await getQuizAttemptsByUser(userId, 0).catch(() => []);
  const passedDesc = attempts
    .filter((a) => a.passed === true || a.passed === 1)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  let approved = null;
  const latest = passedDesc[0] || null;
  if (latest && Number(latest.score || 0) >= 23) {
    const full = await getQuizAttemptFull(latest.id).catch(() => null);
    if (full && (full.answers || []).length === 30) approved = latest;
  }
  const best = [...attempts].sort((a, b) =>
    (Number(b.score) || 0) - (Number(a.score) || 0) ||
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )[0] || null;
  const hasFail = attempts.some((a) => !(a.passed === true || a.passed === 1));
  const academicDone = doneLessons === totalLessons && doneModules === totalModules && answeredCheckpoints === totalCheckpoints;
  const pract = await getPracticalByUserId(userId).catch(() => null);
  const certs = await getMyCertificates(userId).catch(() => []);
  const cert = certs.find((c) => c.status === 'VALID') || null;
  const revoked = certs.filter((c) => c.status === 'REVOKED').map((c) => c.certificate_number);

  let status = STATUS.TRAINING_IN_PROGRESS;
  if (cert) status = STATUS.CERTIFICATE_ISSUED;
  else if (pract && pract.result === 'NAO_APTO') status = STATUS.PRACTICAL_NOT_APPROVED;
  else if (pract && pract.result === 'APTO' && academicDone && approved) status = STATUS.READY_FOR_ADMIN_CERTIFICATION;
  else if (pract && pract.result === 'APTO') status = STATUS.PRACTICAL_APPROVED;
  else if (approved && academicDone) status = STATUS.PRACTICAL_EVALUATION_PENDING;
  else if (approved) status = STATUS.THEORY_APPROVED;
  else if (hasFail) status = STATUS.THEORY_FAILED;
  else if (doneLessons > 0 || answeredCheckpoints > 0) status = STATUS.THEORY_NOT_COMPLETED;

  return {
    status,
    academic: {
      modules: { done: doneModules, total: totalModules },
      lessons: { done: doneLessons, total: totalLessons },
      checkpoints: { done: answeredCheckpoints, total: totalCheckpoints },
      done: academicDone,
    },
    quiz: approved
      ? { approved: true, score: approved.score, total: 30, answered: 30 }
      : { approved: false, score: null, total: 30, answered: 0 },
    practical: _practicalView(pract),
    certificate: cert ? cert.certificate_number : null,
    revoked,
    _best: best ? { score: best.score, passed: !!(best.passed === true || best.passed === 1) } : null,
  };
}

// =================== HARD DELETE USER ===================

async function hardDeleteUser(userId) {
  if (!userId) return false;
  const uidC = _coerceInt(userId);
  // Tentativas do simulado (com respostas) via helper dedicado
  try { await deleteAttemptsByUser(userId); } catch { /* ignore */ }
  // Demais coleções que referenciam user_id são removidas via sweep
  const sweepCols = [COL_PROGRESS, COL_CERT, COL_PRACTICAL, COL_RESET];
  for (const col of sweepCols) {
    let rows;
    try { rows = await parseDocs(collection(col).where('user_id', '==', uidC)); }
    catch { rows = (await parseDocs(collection(col)).catch(() => [])).filter(r => String(r.user_id) === String(userId)); }
    for (const r of rows) {
      try { await docRef(col, String(r.id)).delete(); } catch { /* ignore */ }
    }
  }
  // Tokens de convite consumidos por este usuário: libera used_by
  try {
    const invites = await listInviteTokens({ status: 'all' });
    for (const t of invites.filter((x) => String(x.used_by) === String(userId))) {
      try { await docRef(COL_INVITE, String(t.id)).update({ used_by: null, updated_at: now() }); } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  await docRef(COL_USERS, String(userId)).delete();
  return true;
}

// =================== EQUIPMENT (delega para equipmentRepo mas fallback aqui) ===================

async function listAllEquipmentAdmin() {
  try {
    const eq = require('./equipmentRepo.cjs');
    return await eq.listAllEquipment({ withTypes: true });
  } catch {
    return [];
  }
}

module.exports = {
  promoteUserRole,
  setUserActive,
  getAllUsersCsvFields,
  bulkImportContent,
  createInviteToken,
  listInviteTokens,
  revokeInviteToken,
  deleteInviteToken,
  deleteInviteTokens,
  findInviteTokenByToken,
  consumeInviteToken,
  createResetToken,
  findResetToken,
  countActiveResetTokens,
  consumeResetToken,
  listPracticalEvaluations,
  getPracticalByUserId,
  upsertPracticalEvaluation,
  getDashboardCounts,
  getCertificateSettings,
  updateCertificateSettings,
  listModuleWorkload,
  setModuleWorkload,
  getTrainingStatus,
  TRAINING_NAME_DEFAULT,
  deleteModuleById,
  deleteLessonById,
  deleteCheckpointById,
  deleteQuestionById,
  hardDeleteUser,
  listAllEquipmentAdmin,
};
