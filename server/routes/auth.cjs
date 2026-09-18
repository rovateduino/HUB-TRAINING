const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { JWT_SECRET, JWT_EXPIRES } = require('../middleware/auth.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { findUserByEmail, findUserById, createUser, updateUser } = require('../repositories/authRepo.cjs');
const {
  findInviteTokenByToken,
  consumeInviteToken,
  createResetToken,
  findResetToken,
  countActiveResetTokens,
  consumeResetToken,
} = require('../repositories/adminRepo.cjs');
const { saveAuditLog } = require('../repositories/auditRepo.cjs');
const { authLoginLimiter, authRegisterLimiter, authResetLimiter } = require('../middleware/rateLimit.cjs');

const PWD_MIN_LEN = 6;
const RESET_MAX_ACTIVE_PER_USER = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isoNow() { return new Date().toISOString(); }

function isExpired(iso) {
  if (!iso) return true;
  return new Date(iso).getTime() < Date.now();
}

function isValidEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v);
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
  } catch (e) { console.warn('[AUTH/audit]', action, e.message); }
}

// POST /api/auth/register — requer Token de Convite válido gerado pelo ADM
router.post('/register', authRegisterLimiter, async (req, res) => {
  try {
    const { email, password, name, identifier, invite_token } = req.body || {};
    if (!email || !password || !name || !invite_token) {
      return res.status(400).json({ error: 'Campos obrigatórios: email, password, name, invite_token.' });
    }
    if (String(password).length < PWD_MIN_LEN) {
      return res.status(400).json({ error: `Senha deve ter ao menos ${PWD_MIN_LEN} caracteres.` });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }
    const tokenClean = String(invite_token).trim();
    if (!tokenClean) return res.status(400).json({ error: 'Token de convite inválido.' });

    const tok = await findInviteTokenByToken(tokenClean);
    if (!tok || tok.revoked || (Number(tok.remaining_uses) | 0) <= 0 || isExpired(tok.expires_at)) {
      return res.status(400).json({ error: 'Token de convite inválido, expirado, revogado ou consumido.' });
    }
    if (tok.email_restriction && String(tok.email_restriction).toLowerCase() !== String(email).toLowerCase()) {
      return res.status(400).json({ error: 'Token de convite não autorizado para este email.' });
    }
    const exists = await findUserByEmail(email);
    if (exists) { return res.status(409).json({ error: 'E-mail já cadastrado.' }); }

    const hash = await bcrypt.hash(String(password), 10);
    const user = await createUser({
      email: String(email).toLowerCase(),
      password_hash: hash,
      name: String(name),
      identifier: identifier || null,
      role: 'STUDENT',
      is_active: true,
    });
    const userId = user.id;

    // Consome o token de convite
    const consumed = await consumeInviteToken(tokenClean, userId);
    const remaining = consumed && consumed.token ? (Number(consumed.token.remaining_uses) | 0) : 0;

    await auditInsert(userId, 'USER_REGISTER', 'USER', userId,
      `Registro de profissional via invite_token id=${tok.id} restante=${remaining}`, req);

    res.status(201).json({ id: userId, email: String(email).toLowerCase(), name: String(name) });
  } catch (e) {
    console.error('[AUTH/register]', e);
    res.status(500).json({ error: 'Erro ao registrar.' });
  }
});

// POST /api/auth/login — inalterado em assinatura, aplica rate-limit e valida is_active
router.post('/login', authLoginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email e password são obrigatórios.' });
    const u = await findUserByEmail(email, { includeSensitive: true });
    if (!u || !u.is_active) {
      await auditInsert(u ? u.id : null, 'LOGIN_FALHA', 'USER', u ? u.id : null,
        `Falha de login para email=${String(email).toLowerCase()} (credencial inválida ou inativo)`, req);
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    const ok = await bcrypt.compare(String(password), u.password_hash);
    if (!ok) {
      await auditInsert(u.id, 'LOGIN_FALHA', 'USER', u.id,
        `Falha de login para email=${u.email} (senha incorreta)`, req);
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    const role = u.role || 'STUDENT';
    await auditInsert(u.id, 'LOGIN', 'USER', u.id, 'Login efetuado', req);

    const token = jwt.sign({ sub: u.id, email: u.email, role, name: u.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.json({ token, expiresIn: JWT_EXPIRES, user: { id: u.id, email: u.email, name: u.name, role } });
  } catch (e) { console.error('[AUTH/login]', e); res.status(500).json({ error: 'Erro no login.' }); }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await auditInsert(req.user.id, 'LOGOUT', 'USER', req.user.id, 'Logout efetuado', req);
    res.status(204).end();
  } catch (e) { console.error('[AUTH/logout]', e); res.status(500).json({ error: 'Erro no logout.' }); }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/reset/request (rate-limited). Resposta genérica — nunca revela se email existe.
router.post('/reset/request', authResetLimiter, async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Campo email obrigatório.' });
    const emailLow = String(email).toLowerCase();
    const u = await findUserByEmail(emailLow);

    if (u && u.is_active) {
      const activeCount = await countActiveResetTokens(u.id);
      if (activeCount >= RESET_MAX_ACTIVE_PER_USER) {
        return res.status(200).json({
          message: 'Se o email existir, um link será enviado. (Limite temporário de recuperações atingido.)',
          token_visible_for_copy: false,
        });
      }
      const { token, expires_at } = await createResetToken(u.id, 1);
      await auditInsert(u.id, 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_TOKEN', null,
        'Pedido de recuperação de senha — token exibido em tela', req);
      return res.status(200).json({
        message: 'Token de recuperação gerado. Copie e use na etapa 2.',
        token_visible_for_copy: true,
        token,
        expires_at,
      });
    }
    return res.status(200).json({
      message: 'Se o email existir, um token será disponibilizado.',
      token_visible_for_copy: false,
    });
  } catch (e) {
    console.error('[AUTH/reset-request]', e);
    res.status(500).json({ error: 'Erro no pedido de recuperação.' });
  }
});

// POST /api/auth/reset/confirm
router.post('/reset/confirm', authResetLimiter, async (req, res) => {
  try {
    const { token, new_password, confirm_password } = req.body || {};
    if (!token || !new_password || !confirm_password) {
      return res.status(400).json({ error: 'Campos obrigatórios: token, new_password, confirm_password.' });
    }
    if (String(new_password).length < PWD_MIN_LEN) {
      return res.status(400).json({ error: `Nova senha deve ter ao menos ${PWD_MIN_LEN} caracteres.` });
    }
    if (String(new_password) !== String(confirm_password)) {
      return res.status(400).json({ error: 'Senhas não conferem.' });
    }
    const tokenClean = String(token).trim();
    const row = await findResetToken(tokenClean);
    if (!row || row.used || row.consumed_at || row.revoked || row.used_by || isExpired(row.expires_at)) {
      return res.status(400).json({ error: 'Token inválido, expirado, revogado ou já utilizado.' });
    }
    const user = await findUserById(row.user_id);
    if (!user) { return res.status(400).json({ error: 'Usuário associado não existe.' }); }
    const hash = await bcrypt.hash(String(new_password), 10);
    await updateUser(user.id, { password_hash: hash });
    await consumeResetToken(tokenClean, user.id);
    await auditInsert(user.id, 'PASSWORD_RESET_CONFIRM', 'USER', user.id,
      `Senha redefinida via token id=${row.id}`, req);
    res.status(200).json({ message: 'Senha redefinida com sucesso. Faça login.' });
  } catch (e) {
    console.error('[AUTH/reset-confirm]', e);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
