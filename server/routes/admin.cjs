const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { findUserById, listUsers } = require('../repositories/authRepo.cjs');
const {
  promoteUserRole,
  setUserActive,
  createInviteToken,
  listInviteTokens,
  revokeInviteToken,
  deleteInviteToken,
  deleteInviteTokens,
  createResetToken,
  getDashboardCounts,
  hardDeleteUser,
  getCertificateSettings,
  updateCertificateSettings,
  listModuleWorkload,
  setModuleWorkload,
  getTrainingStatus,
  getPracticalByUserId,
  TRAINING_NAME_DEFAULT,
} = require('../repositories/adminRepo.cjs');
const {
  listAttemptsAdmin,
  getQuizAttempt,
  getQuizAttemptFull,
  getQuizAttemptsByUser,
  getQuestionById,
  getQuestionOptionsWithCorrect,
  getOptionById,
  deleteAttemptAndAnswers,
  deleteAttemptsByUser,
} = require('../repositories/quizRepo.cjs');
const {
  createCertificate,
  getCertificateById,
  getValidCertificateByUser,
  getMyCertificates,
  listAllCertificates,
  revokeCertificate,
  generateYearlyCertificateNumber,
} = require('../repositories/certificateRepo.cjs');
const {
  getCheckpointsByLesson,
  getCheckpointOptionsWithCorrect,
  hasAnswered,
  saveCheckpointAnswer,
} = require('../repositories/checkpointRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');
const QRCode = require('qrcode');

const DEFAULT_TTL_HOURS = 168; // 7 dias
const DEFAULT_RESET_TTL_HOURS = 1;
const MAX_USES_CEIL = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRAINING_NAME = TRAINING_NAME_DEFAULT;
const PASS_SCORE_VIEW = 23;
const PROMOTABLE_ROLES = ['ADMIN', 'TECHNICAL_EVALUATOR', 'STUDENT'];

function cleanId(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s : null;
}

function isPassed(a) {
  return !!(a && (a.passed === true || a.passed === 1));
}

async function auditInsert(uid, action, entityType, entityId, description, req) {
  try {
    await saveAuditLog({
      user_id: uid || null,
      action,
      entity_type: entityType,
      entity_id: entityId != null ? String(entityId) : null,
      description: description || '',
      ip_address: (req && req.ip) || null,
      user_agent: (req && req.headers && req.headers['user-agent']) || null,
    });
  } catch (e) { console.warn('[ADMIN/audit]', action, e.message); }
}

async function usersMap() {
  const map = new Map();
  let page = 1;
  for (;;) {
    const { items } = await listUsers({}, { page, pageSize: 200 });
    if (!items.length) break;
    for (const u of items) map.set(String(u.id), u);
    if (items.length < 200) break;
    page += 1;
  }
  return map;
}

function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  return `${proto}://${req.get('host')}`;
}

router.use(authenticateToken, requireRole('ADMIN'));

// GET /api/admin/attempts?user=&result=&from=&to=
router.get('/attempts', async (req, res) => {
  try {
    const { user, result, from, to } = req.query;
    const data = await listAttemptsAdmin({ user: user || null, result: result || null, from: from || null, to: to || null, page: 1, pageSize: 200 });
    const umap = await usersMap();
    const out = data.attempts.map((r) => {
      const u = umap.get(String(r.user_id));
      const score = Number(r.score) || 0;
      const total = Number(r.total) || 0;
      return {
        id: r.id, user_id: r.user_id,
        user_name: u ? u.name : (r.user_name || null),
        user_email: u ? u.email : (r.user_email || null),
        date: r.completed_at || null, score, total,
        correct: score, wrong: total - score,
        result: isPassed(r) ? 'APROVADO' : 'NÃO APROVADO',
      };
    });
    res.json({ total: out.length, attempts: out });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

router.get('/attempt/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const a = await getQuizAttemptFull(id);
    if (!a) return res.status(404).json({ error: 'Tentativa não encontrada.' });
    const u = await findUserById(a.user_id).catch(() => null);
    const score = Number(a.score) || 0;
    const total = Number(a.total) || 0;
    const answers = [];
    for (const ans of (a.answers || [])) {
      const q = await getQuestionById(ans.question_id).catch(() => null);
      let givenText = null, correctText = null;
      if (ans.selected_option_id != null) {
        const sel = await getOptionById(ans.selected_option_id, ans.question_id).catch(() => null);
        givenText = sel ? sel.option_text : null;
      }
      const fullOpts = await getQuestionOptionsWithCorrect(ans.question_id).catch(() => []);
      const corr = fullOpts.find((o) => o.is_correct === true || o.is_correct === 1);
      correctText = corr ? corr.option_text : null;
      answers.push({
        ...ans,
        question_text: q ? q.question : null,
        category: q ? (q.category || null) : null,
        given_text: givenText,
        correct_text: correctText,
      });
    }
    answers.sort((x, y) => String(x.question_id) < String(y.question_id) ? -1 : 1);
    res.json({
      attempt: {
        id: a.id, user: u ? u.name : null, email: u ? u.email : null,
        date: a.completed_at || null, score, total, correct: score, wrong: total - score,
        result: isPassed(a) ? 'APROVADO' : 'NÃO APROVADO',
      },
      answers,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

router.get('/users', async (req, res) => {
  try {
    const umap = await usersMap();
    const users = [...umap.values()].reverse().map((u) => ({
      id: u.id, email: u.email, name: u.name,
      identifier: u.identifier != null ? u.identifier : null,
      role: u.role || 'STUDENT',
      is_active: u.is_active !== false,
      created_at: u.created_at || null,
    }));
    res.json({ users });
  } catch (e) { res.status(500).json({ error: 'Erro ADM.' }); }
});

router.get('/dashboard', async (req, res) => {
  try {
    const c = await getDashboardCounts();
    res.json({ modules: c.modules, lessons: c.lessons, checkpoints: c.checkpoints, attempts: c.attempts, passed: c.passed, failed: c.failed });
  } catch (e) { res.status(500).json({ error: 'Erro ADM.' }); }
});

// ==================== INVITE TOKENS ====================

// POST /api/admin/invite-tokens
router.post('/invite-tokens', async (req, res) => {
  try {
    let { email, ttl_hours, max_uses } = req.body || {};
    ttl_hours = Number(ttl_hours || DEFAULT_TTL_HOURS);
    max_uses = Number(max_uses || 1);
    if (!Number.isFinite(ttl_hours) || ttl_hours < 1 || ttl_hours > 8760) {
      return res.status(400).json({ error: 'ttl_hours deve ser entre 1 hora e 8760 (1 ano).' });
    }
    if (!Number.isFinite(max_uses) || max_uses < 1 || max_uses > MAX_USES_CEIL) {
      return res.status(400).json({ error: `max_uses deve ser entre 1 e ${MAX_USES_CEIL}.` });
    }
    email = typeof email === 'string' && email.trim() ? String(email).trim().toLowerCase() : null;
    if (email && !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email de restrição inválido.' });
    }
    const created = await createInviteToken({ email, ttl_hours, max_uses, created_by: req.user.id });
    await auditInsert(req.user.id, 'INVITE_TOKEN_CREATE', 'INVITE_TOKEN', created.id,
      `Criado token ${max_uses} usos, expira em ${created.expires_at}, email=${email || '(livre)'}`, req);
    res.status(201).json({
      id: created.id, token: created.token, email_restriction: email,
      expires_at: created.expires_at, max_uses, remaining_uses: max_uses,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao criar token de convite.' }); }
});

// GET /api/admin/invite-tokens?status=active|used|revoked|expired|all
router.get('/invite-tokens', async (req, res) => {
  try {
    const status = String(req.query.status || 'all').toLowerCase();
    const rows = await listInviteTokens({ status });
    const umap = await usersMap();
    const enriched = rows.map((r) => ({
      ...r,
      created_by_name: r.created_by != null && umap.get(String(r.created_by)) ? umap.get(String(r.created_by)).name : null,
      used_by_email: r.used_by != null && umap.get(String(r.used_by)) ? umap.get(String(r.used_by)).email : null,
      used_by_name: r.used_by != null && umap.get(String(r.used_by)) ? umap.get(String(r.used_by)).name : null,
      revoked_by_name: r.revoked_by != null && umap.get(String(r.revoked_by)) ? umap.get(String(r.revoked_by)).name : null,
    }));
    res.json({ total: enriched.length, tokens: enriched });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// PATCH /api/admin/invite-tokens/:id/revoke
router.patch('/invite-tokens/:id/revoke', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const all = await listInviteTokens({ status: 'all' });
    const row = all.find((t) => String(t.id) === String(id));
    if (!row) return res.status(404).json({ error: 'Token não encontrado.' });
    if (row.revoked) return res.status(200).json({ id, revoked: true, message: 'Já revogado.' });
    const revoked = await revokeInviteToken(id, req.user.id);
    await auditInsert(req.user.id, 'INVITE_TOKEN_REVOKE', 'INVITE_TOKEN', id,
      `Revogado token id=${id} (${String(row.token).slice(0, 8)}...)`, req);
    res.status(200).json({ id, revoked: true, revoked_at: revoked.revoked_at || null });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao revogar token.' }); }
});

// POST /api/admin/users/:id/reset-token — gera token de reset manualmente (atendimento)
router.post('/users/:id/reset-token', async (req, res) => {
  try {
    const userId = cleanId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'ID inválido.' });
    const u = await findUserById(userId);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const { token, expires_at } = await createResetToken(u.id, DEFAULT_RESET_TTL_HOURS);
    await auditInsert(req.user.id, 'ADMIN_PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_TOKEN', null,
      `ADMIN gerou reset token p/ user_id=${u.id} (${u.email})`, req);
    res.status(201).json({
      message: 'Token de reset gerado. Entregue ao usuário para uso no fluxo de recuperação.',
      token, expires_at, user_id: u.id, email: u.email,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao gerar token de reset.' }); }
});

// POST /api/admin/users/:id/promote — promoção de papel (default ADMIN)
router.post('/users/:id/promote', async (req, res) => {
  try {
    const userId = cleanId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'ID inválido.' });
    const role = String((req.body || {}).role || 'ADMIN').trim().toUpperCase();
    if (!PROMOTABLE_ROLES.includes(role)) {
      return res.status(400).json({ error: `Papel inválido. Permitidos: ${PROMOTABLE_ROLES.join(', ')}.` });
    }
    const u = await findUserById(userId);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await promoteUserRole(userId, role);
    await auditInsert(req.user.id, 'PROMOTE_ADMIN', 'USER', userId,
      `ADMIN promoveu user_id=${userId} (${u.email}) para ${role}`, req);
    res.json({ ok: true, id: userId, role });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao promover usuário.' }); }
});

// PATCH /api/admin/users/:id/active — ativa/inativa (bloqueia auto-desativação)
router.patch('/users/:id/active', async (req, res) => {
  try {
    const userId = cleanId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'ID inválido.' });
    const body = req.body || {};
    const raw = body.is_active != null ? body.is_active : req.query.is_active;
    if (raw == null) return res.status(400).json({ error: 'Informe is_active (true/false).' });
    const isActive = raw === true || raw === 'true' || raw === 1 || raw === '1';
    if (String(userId) === String(req.user.id) && !isActive) {
      return res.status(400).json({ error: 'Você não pode desativar seu próprio usuário.' });
    }
    const u = await findUserById(userId);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    await setUserActive(userId, isActive);
    await auditInsert(req.user.id, 'USER_ACTIVE_CHANGE', 'USER', userId,
      `ADMIN definiu is_active=${isActive} p/ user_id=${userId} (${u.email})`, req);
    res.json({ ok: true, id: userId, is_active: isActive });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao alterar status do usuário.' }); }
});

// ==================== EXCLUSÕES ====================

async function deleteAttemptsByIds(ids, adminId, req) {
  let deleted = 0;
  for (const id of ids) {
    const existing = await getQuizAttempt(id).catch(() => null);
    if (!existing) continue;
    await deleteAttemptAndAnswers(id);
    deleted += 1;
  }
  if (deleted > 0) {
    await auditInsert(adminId, 'QUIZ_ATTEMPT_DELETE', 'QUIZ_ATTEMPT', null,
      `ADMIN excluiu ${deleted} avaliação(ões): ids=${ids.slice(0, 50).join(',')}${ids.length > 50 ? '...' : ''}`, req);
  }
  return deleted;
}

// DELETE /api/admin/attempts/:id — exclui uma avaliação (unitário)
router.delete('/attempts/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const deleted = await deleteAttemptsByIds([id], req.user.id, req);
    if (!deleted) return res.status(404).json({ error: 'Avaliação não encontrada.' });
    res.json({ ok: true, deleted });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir avaliação.' }); }
});

// DELETE /api/admin/attempts — exclui em massa { ids:[...] } ou { all:true } (+ filtros ?user=&result=&from=&to=)
router.delete('/attempts', async (req, res) => {
  try {
    const { ids, all } = req.body || {};
    let targetIds = [];
    if (all) {
      const data = await listAttemptsAdmin({
        user: req.query.user || null, result: req.query.result || null,
        from: req.query.from || null, to: req.query.to || null, page: 1, pageSize: 200,
      });
      const more = data.total > data.attempts.length
        ? (await listAttemptsAdmin({ user: req.query.user || null, result: req.query.result || null, from: req.query.from || null, to: req.query.to || null, page: 1, pageSize: Math.min(data.total, 200) })).attempts
        : data.attempts;
      targetIds = more.map((r) => r.id);
    } else if (Array.isArray(ids) && ids.length) {
      targetIds = ids.map((v) => cleanId(v)).filter(Boolean);
    } else {
      return res.status(400).json({ error: 'Informe ids:[...] ou { all:true }.' });
    }
    if (!targetIds.length) return res.json({ ok: true, deleted: 0 });
    const deleted = await deleteAttemptsByIds(targetIds, req.user.id, req);
    res.json({ ok: true, deleted });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir avaliações.' }); }
});

async function deleteUsersByIds(ids, adminId, req) {
  let deleted = 0;
  for (const id of ids) {
    if (String(id) === String(adminId)) continue; // nunca exclui a si mesmo
    const u = await findUserById(id).catch(() => null);
    if (!u) continue;
    if ((u.role || 'STUDENT') === 'ADMIN') continue; // protege administradores
    await hardDeleteUser(id);
    deleted += 1;
    if (u.email) {
      // Firebase Auth (best-effort, por email — não bloqueia a resposta)
      try {
        const { getAuth, isFirebaseEnabled, isInitialized } = require('../services/firebase.cjs');
        if (isFirebaseEnabled() && isInitialized()) {
          const auth = getAuth();
          if (auth) {
            auth.getUserByEmail(u.email).then((fb) => auth.deleteUser(fb.uid)).catch(() => { /* usuário pode não existir no Auth */ });
          }
        }
      } catch { /* best-effort */ }
    }
  }
  if (deleted > 0) {
    await auditInsert(adminId, 'USER_DELETE', 'USER', null,
      `ADMIN excluiu ${deleted} usuário(s): ids=${ids.slice(0, 50).join(',')}`, req);
  }
  return deleted;
}

// DELETE /api/admin/users/:id — exclui um profissional (não-ADMIN, nunca a si mesmo)
router.delete('/users/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    if (String(id) === String(req.user.id)) return res.status(400).json({ error: 'Você não pode excluir seu próprio usuário.' });
    const deleted = await deleteUsersByIds([id], req.user.id, req);
    if (!deleted) return res.status(404).json({ error: 'Usuário não encontrado ou protegido (ADMIN).' });
    res.json({ ok: true, deleted });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir usuário.' }); }
});

// DELETE /api/admin/users — massa { ids:[...] } ou { all:true } (protege ADMINs e a si mesmo)
router.delete('/users', async (req, res) => {
  try {
    const { ids, all } = req.body || {};
    let targetIds = [];
    if (all) {
      const umap = await usersMap();
      targetIds = [...umap.keys()];
    } else if (Array.isArray(ids) && ids.length) {
      targetIds = ids.map((v) => cleanId(v)).filter(Boolean);
    } else {
      return res.status(400).json({ error: 'Informe ids:[...] ou { all:true }.' });
    }
    if (!targetIds.length) return res.json({ ok: true, deleted: 0 });
    const deleted = await deleteUsersByIds(targetIds, req.user.id, req);
    res.json({ ok: true, deleted });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir usuários.' }); }
});

// DELETE /api/admin/invite-tokens/:id — exclui um token de convite
router.delete('/invite-tokens/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const ok = await deleteInviteToken(id);
    if (!ok) return res.status(404).json({ error: 'Token não encontrado.' });
    await auditInsert(req.user.id, 'INVITE_TOKEN_DELETE', 'INVITE_TOKEN', id, `ADMIN excluiu token id=${id}`, req);
    res.json({ ok: true, deleted: 1 });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir token.' }); }
});

// DELETE /api/admin/invite-tokens — massa { ids:[...] } ou { all:true } (+ ?status=)
router.delete('/invite-tokens', async (req, res) => {
  try {
    const { ids, all } = req.body || {};
    let targetIds = [];
    if (all) {
      const status = String(req.query.status || 'all').toLowerCase();
      const rows = await listInviteTokens({ status });
      targetIds = rows.map((r) => r.id);
    } else if (Array.isArray(ids) && ids.length) {
      targetIds = ids.map((v) => cleanId(v)).filter(Boolean);
    } else {
      return res.status(400).json({ error: 'Informe ids:[...] ou { all:true }.' });
    }
    if (!targetIds.length) return res.json({ ok: true, deleted: 0 });
    const deleted = await deleteInviteTokens(targetIds);
    await auditInsert(req.user.id, 'INVITE_TOKEN_DELETE', 'INVITE_TOKEN', null,
      `ADMIN excluiu ${deleted} token(s): ids=${targetIds.slice(0, 50).join(',')}`, req);
    res.json({ ok: true, deleted });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ao excluir tokens.' }); }
});

// ==================== CERTIFICADOS ====================

// GET /api/admin/certificates?name=&code=&from=&to=&status=VALID|REVOKED|all
router.get('/certificates', async (req, res) => {
  try {
    const { name, code, from, to, status } = req.query;
    const [rows, umap] = await Promise.all([listAllCertificates(), usersMap()]);
    let list = rows;
    if (name) list = list.filter((c) => String((umap.get(String(c.user_id)) || {}).name || '').toLowerCase().includes(String(name).toLowerCase()));
    if (code) list = list.filter((c) => String(c.certificate_number || '').toUpperCase().includes(String(code).toUpperCase()));
    if (from) list = list.filter((c) => String(c.issue_date || '') >= String(from));
    if (to) list = list.filter((c) => String(c.issue_date || '') <= String(to));
    if (status === 'VALID' || status === 'REVOKED') list = list.filter((c) => c.status === status);
    res.json({
      total: list.length,
      certificates: list.map((r) => {
        const u = umap.get(String(r.user_id));
        const score = Number(r.score) || 0;
        return {
          id: r.id, certificate_number: r.certificate_number, user_name: u ? u.name : null,
          training: r.training_name, issue_date: r.issue_date, completion_date: r.completion_date,
          result: score >= PASS_SCORE_VIEW ? 'APROVADO' : 'NÃO APROVADO', score, total: r.total,
          percentage: r.percentage, status: r.status,
        };
      }),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// GET /api/admin/certificates/:id/preview — dados completos p/ o ADMIN visualizar/imprimir o PDF do aluno
router.get('/certificates/:id/preview', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const row = await getCertificateById(id);
    if (!row) return res.status(404).json({ error: 'Certificado não encontrado.' });
    const [user, pract, issuer] = await Promise.all([
      findUserById(row.user_id).catch(() => null),
      row.practical_evaluation_id ? getPracticalByUserId(row.user_id).catch(() => null) : null,
      row.issued_by ? findUserById(row.issued_by).catch(() => null) : null,
    ]);
    let wDetail = [];
    if (Array.isArray(row.workload_detail)) wDetail = row.workload_detail;
    else { try { wDetail = row.workload_detail ? JSON.parse(row.workload_detail) : []; } catch { wDetail = []; } }
    const validationUrl = `${baseUrl(req)}/validar/${row.certificate_number}`;
    const qrDataUrl = await QRCode.toDataURL(validationUrl, { width: 220, margin: 1 });
    const crit = (v) => (v == null ? null : v);
    const score = Number(row.score) || 0;
    res.json({
      certificate: {
        certificate_number: row.certificate_number,
        participant: user ? user.name : null,
        training: row.training_name,
        modality: row.modality,
        workload_hours: row.workload_hours,
        completion_date: row.completion_date,
        issue_date: row.issue_date,
        result_final: 'TREINAMENTO CONCLUÍDO',
        theory: { result: score >= PASS_SCORE_VIEW ? 'APROVADO' : 'NÃO APROVADO', score, total: row.total, percentage: row.percentage },
        practical: pract ? { result: pract.result, evaluation_date: pract.evaluation_date, evaluator_name: pract.evaluator_name, evaluator_title: pract.evaluator_title } : null,
        exceptional: !!row.issue_note,
        issued_by_name: issuer ? issuer.name : null,
        workload_detail: wDetail,
        signer1_name: crit(row.signer1_name), signer1_role: crit(row.signer1_role),
        signer2_name: crit(row.signer2_name), signer2_role: crit(row.signer2_role),
        status: row.status,
        qr_data_url: qrDataUrl, validation_url: validationUrl,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// GET /api/admin/certificates/:id — detalhe (sem expor a outros alunos; ADMIN vê tudo)
router.get('/certificates/:id', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const r = await getCertificateById(id);
    if (!r) return res.status(404).json({ error: 'Certificado não encontrado.' });
    const u = await findUserById(r.user_id).catch(() => null);
    res.json({ certificate: { ...r, user_name: u ? u.name : null, user_email: u ? u.email : null } });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// POST /api/admin/certificates/:id/revoke — revogação (estrutura futura; já funcional)
router.post('/certificates/:id/revoke', async (req, res) => {
  try {
    const id = cleanId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido.' });
    const r = await getCertificateById(id);
    if (!r) return res.status(404).json({ error: 'Certificado não encontrado.' });
    await revokeCertificate(id);
    await auditInsert(req.user.id, 'CERTIFICATE_REVOKED', 'CERTIFICATE', id, `ADMIN revogou certificado ${r.certificate_number}`, req);
    res.json({ ok: true, id, status: 'REVOKED' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// GET /api/admin/certificate-settings — config atual (carga horária, assinaturas)
router.get('/certificate-settings', async (req, res) => {
  try {
    const s = await getCertificateSettings();
    res.json({ settings: s });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// PUT /api/admin/certificate-settings — atualiza carga horária e assinaturas
router.put('/certificate-settings', async (req, res) => {
  try {
    const { workload_hours, modality, signer1_name, signer1_role, signer2_name, signer2_role } = req.body || {};
    const clean = (v) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);
    const s = await updateCertificateSettings({
      workload_hours: clean(workload_hours),
      modality: clean(modality) || 'Treinamento profissional interno',
      signer1_name: clean(signer1_name), signer1_role: clean(signer1_role),
      signer2_name: clean(signer2_name), signer2_role: clean(signer2_role),
    });
    await auditInsert(req.user.id, 'CERTIFICATE_SETTINGS_UPDATE', 'CERTIFICATE_SETTINGS', 1, 'Configurações do certificado atualizadas', req);
    res.json({ ok: true, settings: s });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// ==================== CERTIFICAÇÃO FINAL: PIPELINE + EMISSÃO + CARGA HORÁRIA ====================

// GET /api/admin/certification-pipeline?name=&status=
router.get('/certification-pipeline', async (req, res) => {
  try {
    const { name, status } = req.query;
    const umap = await usersMap();
    let users = [...umap.values()].filter((u) => (u.role || 'STUDENT') === 'STUDENT' && u.is_active !== false);
    if (name) users = users.filter((u) => String(u.name || '').toLowerCase().includes(String(name).toLowerCase()));
    const list = [];
    for (const u of users) {
      const st = await getTrainingStatus(u.id);
      const certs = await getMyCertificates(u.id).catch(() => []);
      const cert = certs.find((c) => c.status === 'VALID') || null;
      const revoked = certs.filter((c) => c.status === 'REVOKED').map((c) => c.certificate_number);
      list.push({
        user_id: u.id, user_name: u.name,
        modules: st.academic.modules, lessons: st.academic.lessons, checkpoints: st.academic.checkpoints,
        theory: st.quiz.approved ? { score: st.quiz.score, total: 30 } : null,
        practical: st.practical ? { result: st.practical.result, evaluation_date: st.practical.evaluation_date, evaluator_name: st.practical.evaluator_name } : null,
        status: st.status, certificate_number: cert ? cert.certificate_number : null, revoked,
        date: cert ? cert.issue_date : (st.practical ? st.practical.evaluation_date : null),
      });
    }
    const out = status ? list.filter((r) => r.status === String(status).toUpperCase()) : list;
    res.json({ total: out.length, pipeline: out });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// POST /api/admin/certificates/issue {user_id} — EMISSÃO EXCLUSIVA DO ADMIN.
// O certificado NÃO existe antes deste clique explícito.
router.post('/certificates/issue', async (req, res) => {
  try {
    const targetId = cleanId((req.body || {}).user_id);
    if (!targetId) return res.status(400).json({ error: 'user_id inválido.' });
    const target = await findUserById(targetId);
    if (!target) return res.status(404).json({ error: 'Profissional não encontrado.' });
    if ((target.role || 'STUDENT') !== 'STUDENT') return res.status(400).json({ error: 'Somente STUDENT recebe certificado.' });
    const existing = await getValidCertificateByUser(targetId);
    if (existing) return res.status(409).json({ error: 'Certificado já emitido.', certificate_number: existing.certificate_number });
    const st = await getTrainingStatus(targetId);
    const { force, reason } = (req.body || {});
    // Emissão normal: pronto para certificação. Excepcional: ADMIN assume com justificativa,
    // exigindo ao menos a base acadêmica concluída (tudo auditado).
    let forced = false, issueNote = null, theoryScore = null, theoryApproved = false;
    if (st.status === 'READY_FOR_ADMIN_CERTIFICATION') {
      theoryScore = st.quiz.score; theoryApproved = true;
    } else if (force === true) {
      const just = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
      if (just.length < 10) return res.status(400).json({ error: 'Liberação excepcional exige justificativa (mín. 10 caracteres).' });
      if (!st.academic.done) return res.status(403).json({ error: 'Liberação excepcional exige cartilha concluída (17/17 lições + checkpoints).', status: st.status, checklist: st });
      forced = true; issueNote = just;
      const best = st._best;
      theoryScore = best ? best.score : 0; theoryApproved = best ? !!best.passed : false;
    } else {
      return res.status(403).json({ error: 'Profissional não está PRONTO PARA CERTIFICAÇÃO.', status: st.status, checklist: st });
    }

    const settings = await getCertificateSettings();
    // Snapshot da carga horária por módulo
    const mods = await listModuleWorkload();
    const detail = mods.map((m) => ({ order: m.order_num, title: m.title, hours: m.hours || null }));
    const nums = detail.map((d) => {
      if (d.hours == null) return null;
      const n = parseFloat(String(d.hours).replace(',', '.').match(/[\d.]+/)?.[0]);
      return Number.isFinite(n) ? n : null;
    });
    let workloadTotal = null;
    if (detail.length && nums.every((n) => n != null)) {
      const sum = nums.reduce((a, b) => a + b, 0);
      workloadTotal = `${Number.isInteger(sum) ? sum : Math.round(sum * 10) / 10} horas`;
    } else workloadTotal = (settings && settings.workload_hours) || null;

    const pract = await getPracticalByUserId(targetId).catch(() => null);
    const percentage = Math.round((theoryScore / 30) * 1000) / 10;
    const completionDate = (theoryApproved && pract && pract.evaluation_date && pract.evaluation_date.length === 10)
      ? pract.evaluation_date + 'T12:00:00.000Z' : new Date().toISOString();
    const number = await generateYearlyCertificateNumber('HUB');
    const row = await createCertificate(targetId, {
      certificate_number: number,
      training_name: TRAINING_NAME,
      modality: (settings && settings.modality) || 'Treinamento profissional interno',
      workload_hours: workloadTotal,
      workload_detail: detail,
      score: theoryScore, total: 30, percentage,
      completion_date: completionDate, issue_date: new Date().toISOString(),
      practical_evaluation_id: pract ? pract.id : null,
      issued_by: req.user.id, issue_note: issueNote,
      signer1_name: settings ? settings.signer1_name : null,
      signer1_role: settings ? settings.signer1_role : null,
      signer2_name: settings ? settings.signer2_name : null,
      signer2_role: settings ? settings.signer2_role : null,
      status: 'VALID',
    });
    if (!row) return res.status(500).json({ error: 'Falha ao gerar código único.' });
    await auditInsert(req.user.id, 'CERTIFICATE_ELIGIBILITY_REACHED', 'CERTIFICATE', row.id, `Pronto para certificação confirmado p/ user_id=${targetId}`, req);
    await auditInsert(req.user.id, 'CERTIFICATE_ISSUED', 'CERTIFICATE', row.id,
      forced ? `LIBERAÇÃO EXCEPCIONAL p/ user_id=${targetId}: ${issueNote}` : `ADMIN emitiu ${row.certificate_number} p/ user_id=${targetId}`, req);
    res.status(201).json({
      ok: true,
      forced,
      certificate: {
        certificate_number: row.certificate_number, participant: target.name,
        theory: { score: row.score, total: row.total, percentage: row.percentage, approved: theoryApproved },
        practical: pract ? { result: pract.result, evaluation_date: pract.evaluation_date, evaluator_name: pract.evaluator_name } : null,
        issue_date: row.issue_date,
      },
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// POST /api/admin/users/:id/reset-attempts — ADMIN zera tentativas do simulado
// (ex.: esgotou as 3 chances). Apaga tentativas + respostas; auditoria registra.
router.post('/users/:id/reset-attempts', async (req, res) => {
  try {
    const userId = cleanId(req.params.id);
    if (!userId) return res.status(400).json({ error: 'ID inválido.' });
    const u = await findUserById(userId);
    if (!u) return res.status(404).json({ error: 'Usuário não encontrado.' });
    const n = await deleteAttemptsByUser(userId);
    await auditInsert(req.user.id, 'QUIZ_ATTEMPTS_RESET', 'QUIZ_ATTEMPT', null, `ADMIN zerou ${n} tentativa(s) do simulado p/ user_id=${userId}`, req);
    res.json({ ok: true, deleted: n });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// GET /api/admin/module-workload — horas por módulo
router.get('/module-workload', async (req, res) => {
  try {
    const rows = await listModuleWorkload();
    res.json({ modules: rows });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// PUT /api/admin/module-workload { hours: { moduleId: "X h" } }
router.put('/module-workload', async (req, res) => {
  try {
    const hours = ((req.body || {}).hours) || {};
    const cleanMap = {};
    for (const [mid, h] of Object.entries(hours)) {
      if (!cleanId(mid)) continue;
      cleanMap[String(mid)] = typeof h === 'string' && h.trim() ? h.trim().slice(0, 50) : null;
    }
    await setModuleWorkload(cleanMap);
    await auditInsert(req.user.id, 'CERTIFICATE_SETTINGS_UPDATE', 'MODULE_WORKLOAD', 1, 'Carga horária por módulo atualizada', req);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

// POST /api/admin/checkpoints/complete {user_id, lesson_id?} — ADMIN registra
// checkpoints como verificados (ex.: verificação presencial). Usa a alternativa
// correta, marcada com by_admin=1 e auditoria própria. STUDENT é barrado (403).
router.post('/checkpoints/complete', async (req, res) => {
  try {
    const targetId = cleanId((req.body || {}).user_id);
    const lessonRaw = (req.body || {}).lesson_id;
    const lessonId = lessonRaw != null ? cleanId(lessonRaw) : null;
    if (!targetId) return res.status(400).json({ error: 'user_id inválido.' });
    const target = await findUserById(targetId);
    if (!target) return res.status(404).json({ error: 'Profissional não encontrado.' });
    if ((target.role || 'STUDENT') !== 'STUDENT') return res.status(400).json({ error: 'Somente STUDENT.' });
    let cps;
    if (lessonId != null) {
      cps = await getCheckpointsByLesson(lessonId);
    } else {
      const { getAllLessons } = require('../repositories/trainingRepo.cjs');
      const lessons = await getAllLessons().catch(() => []);
      const nested = await Promise.all(lessons.map((l) => getCheckpointsByLesson(l.id).catch(() => [])));
      cps = nested.flat();
    }
    let done = 0;
    for (const c of cps) {
      if (await hasAnswered(targetId, c.id)) continue;
      const opts = await getCheckpointOptionsWithCorrect(c.id).catch(() => []);
      const corr = opts.find((o) => o.is_correct === true || o.is_correct === 1);
      if (!corr) continue;
      const saved = await saveCheckpointAnswer(targetId, c.id, corr.id, true, c.lesson_id != null ? c.lesson_id : lessonId, { by_admin: true, attempt_number: 0 });
      if (!saved.already_answered) done += 1;
    }
    await auditInsert(req.user.id, 'CHECKPOINT_ADMIN_MARK', 'CHECKPOINT_ANSWER', null, `ADMIN marcou ${done} checkpoint(s) verificados p/ user_id=${targetId}`, req);
    res.json({ ok: true, completed: done });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Erro ADM.' }); }
});

module.exports = router;
