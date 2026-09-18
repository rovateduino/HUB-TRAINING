const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth.cjs');
const {
  listQuestions,
  listQuestionsFull,
  getQuizAttempt,
  getQuizAttemptFull,
  getQuizAttemptsByUser,
  getOptionById,
  saveQuizAttempt,
  saveQuizAnswer,
  listAttemptsAdmin,
} = require('../repositories/quizRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');

const PASS_SCORE = 23;
const PASS_TOTAL = 30;
const MAX_ATTEMPTS = 3;

function isPassed(a) {
  return !!(a && (a.passed === true || a.passed === 1));
}

async function auditInsert(uid, action, entityType, entityId, newValue, description, req) {
  try {
    await saveAuditLog({
      user_id: uid || null,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      new_value: newValue != null ? newValue : null,
      description: description || '',
      ip_address: (req && req.ip) || null,
      user_agent: (req && req.headers && req.headers['user-agent']) || null,
    });
  } catch (e) { console.warn('[QUIZ/audit]', action, e.message); }
}

// GET /api/quiz/questions — STUDENT sem gabarito (nunca expõe is_correct); ADMIN com gabarito
router.get('/questions', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const out = isAdmin ? await listQuestionsFull(PASS_TOTAL) : await listQuestions(PASS_TOTAL);
    res.json({ total: out.length, pass_score: PASS_SCORE, questions: out });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao listar questões.' }); }
});

// POST /api/quiz/submit — cálculo EXCLUSIVAMENTE no backend. Ignora qualquer score enviado pelo cliente.
// Regras: (1) obrigatório responder TODAS as 30; (2) máx 3 tentativas (1 + 2 chances); (3) aprovado não submete de novo.
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'answers é obrigatório: { questionId: optionId }' });
    const answeredCount = Object.keys(answers).length;
    if (answeredCount !== PASS_TOTAL) return res.status(400).json({ error: `É obrigatório responder todas as ${PASS_TOTAL} questões antes de finalizar. Respondidas: ${answeredCount}/${PASS_TOTAL}.` });
    const qs = await listQuestions(PASS_TOTAL);
    if (qs.length !== PASS_TOTAL) { return res.status(500).json({ error: `Simulado incompleto no banco (${qs.length}/${PASS_TOTAL}).` }); }
    // Todas as questões devem estar presentes no payload
    const missing = qs.filter(q => (answers[String(q.id)] ?? answers[q.id]) == null);
    if (missing.length > 0) { return res.status(400).json({ error: `Faltam ${missing.length} resposta(s). É obrigatório ir até o final e validar todas.` }); }
    // Limite de tentativas: 1 inicial + 2 chances
    const prev = await getQuizAttemptsByUser(req.user.id, 0);
    const used = prev.length;
    const alreadyPassed = prev.some(isPassed);
    if (alreadyPassed) { return res.status(403).json({ error: 'Você já foi APROVADO. Não há novas tentativas.' }); }
    if (used >= MAX_ATTEMPTS) { return res.status(403).json({ error: `Limite de ${MAX_ATTEMPTS} tentativas esgotado (1 + 2 chances).` }); }
    let score = 0;
    const details = [];
    for (const q of qs) {
      const selId = answers[String(q.id)] ?? answers[q.id];
      const opt = selId ? await getOptionById(selId, q.id) : null;
      const correct = !!(opt && (opt.is_correct === true || opt.is_correct === 1));
      if (correct) score++;
      details.push({ question_id: q.id, selected_option_id: selId || null, is_correct: correct });
    }
    const passed = score >= PASS_SCORE;
    const attemptNumber = used + 1;
    const attempt = await saveQuizAttempt(req.user.id, {
      score,
      total: PASS_TOTAL,
      passed,
      attempt_number: attemptNumber,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
    });
    for (const d of details) {
      await saveQuizAnswer(attempt.id, d.question_id, d.selected_option_id, d.is_correct);
    }
    await auditInsert(req.user.id, 'QUIZ_SUBMIT', 'QUIZ_ATTEMPT', attempt.id,
      JSON.stringify({ score, total: PASS_TOTAL, passed }), 'Simulado submetido', req);

    res.json({ attempt_id: attempt.id, result: passed ? 'APROVADO' : 'NÃO APROVADO', attempt_number: attemptNumber, max_attempts: MAX_ATTEMPTS, remaining: MAX_ATTEMPTS - attemptNumber });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao submeter simulado.' }); }
});

async function buildMyAttempts(userId) {
  const rows = await getQuizAttemptsByUser(userId, 0);
  const used = rows.length;
  const alreadyPassed = rows.some(isPassed);
  return { attempts: rows.map(r => ({ id: r.id, result: isPassed(r) ? 'APROVADO' : 'NÃO APROVADO', completed_at: r.completed_at || null, attempt_number: r.attempt_number || null })), max_attempts: MAX_ATTEMPTS, used, remaining: Math.max(0, MAX_ATTEMPTS - used), already_passed: alreadyPassed };
}

// GET /api/quiz/my-attempts — profissional vê somente próprios resultados resumidos
router.get('/my-attempts', authenticateToken, async (req, res) => {
  try {
    // expõe APROVADO/NÃO APROVADO + data; NÃO expõe score detalhado? Requisito §7: profissional NÃO vê score/acertos/erros.
    // Mantemos apenas resultado + data para o profissional.
    res.json(await buildMyAttempts(req.user.id));
  } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

// GET /api/quiz/attempts — próprias tentativas (STUDENT) ou todas paginado (ADMIN)
router.get('/attempts', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const page = Math.max(1, Number(req.query.page) || 1);
      const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 100));
      const data = await listAttemptsAdmin({ user: req.query.user || null, result: req.query.result || null, from: req.query.from || null, to: req.query.to || null, page, pageSize });
      return res.json(data);
    }
    res.json(await buildMyAttempts(req.user.id));
  } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

// GET /api/quiz/my-attempt/:id — detalhe profissional: somente resultado
router.get('/my-attempt/:id', authenticateToken, async (req, res) => {
  try {
    const a = await getQuizAttempt(req.params.id);
    if (!a) { return res.status(404).json({ error: 'Tentativa não encontrada.' }); }
    if (String(a.user_id) !== String(req.user.id) && req.user.role !== 'ADMIN') { return res.status(403).json({ error: 'Acesso negado (IDOR/BOLA).' }); }
    if (req.user.role !== 'ADMIN') { return res.json({ attempt_id: a.id, result: isPassed(a) ? 'APROVADO' : 'NÃO APROVADO' }); }
    const full = await getQuizAttemptFull(req.params.id);
    return res.json({ attempt: full });
  } catch (e) { res.status(500).json({ error: 'Erro.' }); }
});

module.exports = router;
