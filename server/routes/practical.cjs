const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { findUserById, listUsers } = require('../repositories/authRepo.cjs');
const {
  CRITERIA,
  RESULTS,
  getByUserId,
  listMine,
  upsertEvaluation,
  normalizeResult,
  validateEvaluationDate,
  isTheoryApproved,
} = require('../repositories/practicalRepo.cjs');
const { getTrainingStatus } = require('../repositories/adminRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

const PASS_TOTAL = 30;

function cleanId(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

async function auditInsert(userId, action, entityId, description, req) {
  try {
    await saveAuditLog({
      user_id: userId || null,
      action,
      entity_type: 'PRACTICAL_EVALUATION',
      entity_id: entityId != null ? String(entityId) : null,
      description: description || '',
      ip_address: (req && req.ip) || null,
      user_agent: (req && req.headers && req.headers['user-agent']) || null,
    });
  } catch (e) { console.warn('[PRACTICAL/audit]', action, e.message); }
}

function evalView(row) {
  if (!row) return null;
  let criteria = [];
  if (Array.isArray(row.criteria)) criteria = row.criteria;
  else { try { criteria = row.criteria_data ? JSON.parse(row.criteria_data) : []; } catch { criteria = []; } }
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name,
    evaluator_id: row.evaluator_id,
    evaluator_name: row.evaluator_name,
    evaluator_title: row.evaluator_title,
    evaluation_date: row.evaluation_date,
    result: row.result,
    observations: row.observations,
    criteria,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ========================
// POST /api/practical — registra/atualiza avaliação (EVALUATOR + ADMIN).
// STUDENT é barrado pelo requireRole (403).
// ========================
router.post('/', authenticateToken, requireRole('ADMIN', 'TECHNICAL_EVALUATOR'), async (req, res) => {
  try {
    const { user_id, evaluation_date, result, observations, criteria, evaluator_title } = req.body || {};
    const targetId = cleanId(user_id);
    if (!targetId) return res.status(400).json({ error: 'user_id inválido.' });
    const normResult = normalizeResult(result);
    if (!normResult) return res.status(400).json({ error: 'result deve ser APTO ou NAO_APTO.' });
    const dateCheck = validateEvaluationDate(evaluation_date);
    if (!dateCheck.valid) {
      return res.status(400).json({
        error: dateCheck.reason === 'future_date'
          ? 'Data da avaliação não pode ser futura.'
          : 'evaluation_date inválida (AAAA-MM-DD).',
      });
    }
    const crit = Array.isArray(criteria) ? criteria.filter(c => CRITERIA.includes(c)) : [];
    const obs = typeof observations === 'string' ? observations.trim().slice(0, 2000) : null;
    const title = typeof evaluator_title === 'string' && evaluator_title.trim() ? evaluator_title.trim().slice(0, 200) : null;

    const target = await findUserById(targetId);
    if (!target) return res.status(404).json({ error: 'Profissional não encontrado.' });
    if ((target.role || 'STUDENT') === 'ADMIN') return res.status(400).json({ error: 'ADMIN não é avaliado.' });
    // A prática pressupõe aprovação teórica (fluxo sem atalhos)
    if (!(await isTheoryApproved(targetId))) return res.status(422).json({ error: 'Avaliação prática exige aprovação teórica (23/30) prévia.' });

    const existing = await getByUserId(targetId);
    const row = await upsertEvaluation(targetId, {
      evaluator_id: req.user.id,
      evaluator_name: req.user.name || null,
      evaluator_title: title,
      evaluation_date,
      result: normResult,
      observations: obs,
      criteria: crit,
    });
    if (!existing) {
      await auditInsert(req.user.id, 'PRACTICAL_EVALUATION_CREATED', row.id, `Avaliação prática criada para user_id=${targetId}`, req);
    }
    await auditInsert(req.user.id, normResult === 'APTO' ? 'PRACTICAL_EVALUATION_APPROVED' : 'PRACTICAL_EVALUATION_NOT_APPROVED',
      row.id, `Avaliação prática ${normResult} para user_id=${targetId}`, req);
    const out = evalView({ ...row, user_name: target.name });
    res.status(existing ? 200 : 201).json({ evaluation: out });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao registrar avaliação.' }); }
});

async function listActiveStudents() {
  const out = [];
  let page = 1;
  for (;;) {
    const { items } = await listUsers({}, { page, pageSize: 200 });
    if (!items.length) break;
    for (const u of items) {
      if ((u.role || 'STUDENT') === 'STUDENT' && u.is_active !== false) out.push(u);
    }
    if (items.length < 200) break;
    page += 1;
  }
  out.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  return out;
}

// ========================
// GET /api/practical/overview — todos os profissionais com situação da prática
// (EVALUATOR + ADMIN). Permite avaliar direto mesmo fora da fila de pendentes.
// ========================
router.get('/overview', authenticateToken, requireRole('ADMIN', 'TECHNICAL_EVALUATOR'), async (req, res) => {
  try {
    const students = await listActiveStudents();
    const list = [];
    for (const s of students) {
      const st = await getTrainingStatus(s.id);
      list.push({
        user_id: s.id, user_name: s.name,
        lessons: st.academic.lessons,
        theory: st.quiz.approved ? { score: st.quiz.score, total: PASS_TOTAL } : null,
        practical: st.practical ? { result: st.practical.result, evaluation_date: st.practical.evaluation_date, evaluator_name: st.practical.evaluator_name } : null,
      });
    }
    res.json({ total: list.length, professionals: list, criteria: CRITERIA });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

// ========================
// GET /api/practical/pending — aguardando avaliação (EVALUATOR + ADMIN)
// Teoria aprovada + sem avaliação APTO vigente.
// ========================
router.get('/pending', authenticateToken, requireRole('ADMIN', 'TECHNICAL_EVALUATOR'), async (req, res) => {
  try {
    const students = await listActiveStudents();
    const list = [];
    for (const s of students) {
      const st = await getTrainingStatus(s.id);
      if (!st.quiz.approved) continue;
      if (st.practical && st.practical.result === 'APTO') continue;
      list.push({
        user_id: s.id, user_name: s.name,
        lessons: st.academic.lessons,
        checkpoints: st.academic.checkpoints,
        theory: { score: st.quiz.score, total: PASS_TOTAL },
        practical: st.practical ? st.practical.result : null,
      });
    }
    res.json({ total: list.length, pending: list, criteria: CRITERIA });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

// ========================
// GET /api/practical/mine — avaliações do avaliador logado
// ========================
router.get('/mine', authenticateToken, requireRole('ADMIN', 'TECHNICAL_EVALUATOR'), async (req, res) => {
  try {
    const rows = await listMine(req.user.id);
    const evaluations = [];
    for (const p of rows) {
      const u = await findUserById(p.user_id).catch(() => null);
      evaluations.push(evalView({ ...p, user_name: u ? u.name : null }));
    }
    res.json({ total: evaluations.length, evaluations });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

// ========================
// GET /api/practical/user/:userId — avaliação de um profissional
// (EVALUATOR + ADMIN; STUDENT só a própria via /api/certificates/my)
// ========================
router.get('/user/:userId', authenticateToken, requireRole('ADMIN', 'TECHNICAL_EVALUATOR'), async (req, res) => {
  try {
    const row = await getByUserId(req.params.userId);
    if (!row) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    const u = await findUserById(row.user_id).catch(() => null);
    res.json({ evaluation: evalView({ ...row, user_name: u ? u.name : null }) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro.' }); }
});

module.exports = router;
module.exports.CRITERIA = CRITERIA;
module.exports.RESULTS = RESULTS;
