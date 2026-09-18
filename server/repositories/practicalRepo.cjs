const crypto = require('crypto');
const { collection, docRef, parseDoc, parseDocs, now, batch } = require('./_base.cjs');

const COL = 'practical_evaluations';

const CRITERIA = [
  'infra_understanding',
  'equipment_identification',
  'energy_path',
  'panels_systems',
  'measurements_understanding',
  'instruments_use',
  'abnormality_identification',
  'procedures_understanding',
  'safety_attention',
  'follow_guidance',
];

const RESULTS = ['APTO', 'NAO_APTO'];

function _coerceInt(v) {
  if (v == null) return v;
  const n = Number(v);
  return Number.isFinite(n) && String(v).match(/^-?\d+$/) ? n : v;
}

async function getByUserId(userId) {
  if (!userId) return null;
  const uidC = _coerceInt(userId);
  let rows;
  try {
    rows = await parseDocs(collection(COL).where('user_id', '==', uidC).limit(1));
  } catch {
    const all = await parseDocs(collection(COL));
    rows = all.filter((r) => String(r.user_id) === String(userId)).slice(0, 1);
  }
  return rows && rows[0] ? rows[0] : null;
}

async function getById(id) {
  if (!id) return null;
  return parseDoc(await docRef(COL, String(id)).get());
}

async function listMine(evaluatorId) {
  if (!evaluatorId) return [];
  const evIdC = _coerceInt(evaluatorId);
  let rows;
  try {
    rows = await parseDocs(collection(COL).where('evaluator_id', '==', evIdC).orderBy('updated_at', 'desc'));
  } catch {
    const all = await parseDocs(collection(COL));
    rows = all.filter((r) => String(r.evaluator_id) === String(evaluatorId));
    rows.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
  }
  return rows;
}

async function listAll() {
  return parseDocs(collection(COL).orderBy('updated_at', 'desc').limit(5000));
}

async function upsertEvaluation(userId, payload = {}) {
  if (!userId) throw new Error('upsertEvaluation: userId obrigatório');
  const uidC = _coerceInt(userId);
  const existing = await getByUserId(userId);
  let id;
  const data = { ...payload };
  delete data.id;
  delete data.user_id;
  if (data.evaluator_id != null) data.evaluator_id = _coerceInt(data.evaluator_id);
  if (Array.isArray(data.criteria)) {
    data.criteria_data = JSON.stringify(data.criteria.filter((c) => CRITERIA.includes(c)));
    delete data.criteria;
  }
  if (existing) {
    id = existing.id;
    data.updated_at = now();
    await docRef(COL, String(id)).update(data);
  } else {
    id = data.id || crypto.randomUUID().replace(/-/g, '');
    delete data.id;
    data.user_id = uidC;
    data.created_at = data.created_at || now();
    data.updated_at = now();
    await docRef(COL, String(id)).set(data);
  }
  return getById(id);
}

async function deleteEvaluation(id) {
  if (!id) return false;
  await docRef(COL, String(id)).delete();
  return true;
}

function normalizeResult(result) {
  const r = String(result || '').toUpperCase();
  return RESULTS.includes(r) ? r : null;
}

function validateEvaluationDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr || ''))) return { valid: false, reason: 'invalid_format' };
  if (String(dateStr) > new Date().toISOString().slice(0, 10)) return { valid: false, reason: 'future_date' };
  return { valid: true };
}

// Funções de ajuda agregadas (usam outros repositórios; a rota também pode implementar)
async function isTheoryApproved(userId, { passScore = 23, passTotal = 30 } = {}) {
  try {
    const quiz = require('./quizRepo.cjs');
    const lastPassed = await quiz.getLastPassedAttempt(userId);
    if (!lastPassed) return false;
    if (Number(lastPassed.score || 0) < passScore) return false;
    const full = await quiz.getQuizAttemptFull(lastPassed.id);
    if (full && Array.isArray(full.answers) && full.answers.length !== passTotal) return false;
    return true;
  } catch {
    return false;
  }
}

async function getTheorySnapshot(userId, { passScore = 23, passTotal = 30 } = {}) {
  try {
    const quiz = require('./quizRepo.cjs');
    const lastPassed = await quiz.getLastPassedAttempt(userId);
    if (!lastPassed) return { approved: false, score: null, total: passTotal };
    const approved = Number(lastPassed.score || 0) >= passScore;
    return { approved, score: lastPassed.score, total: lastPassed.total || passTotal };
  } catch {
    return { approved: false, score: null, total: passTotal };
  }
}

module.exports = {
  CRITERIA,
  RESULTS,
  getByUserId,
  getById,
  listMine,
  listAll,
  upsertEvaluation,
  deleteEvaluation,
  normalizeResult,
  validateEvaluationDate,
  isTheoryApproved,
  getTheorySnapshot,
};
