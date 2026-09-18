const jwt = require('jsonwebtoken');
const { findUserById } = require('../repositories/authRepo.cjs');

const JWT_SECRET = process.env.JWT_SECRET || 'HUB-TRAINING-SECRET-MUDAR-2026';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

// Autentica JWT (Firestore como fonte primária). Anexa req.user = { id, email, name, role, is_active }
async function authenticateToken(req, res, next) {
  const header = req.headers['authorization'] || '';
  let token = null;
  if (header.startsWith('Bearer ')) token = header.slice(7);
  else if (req.query && req.query.token) token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token ausente. Faça login.' });
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    if (e.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expirado. Faça login novamente.', code: 'TOKEN_EXPIRED' });
    return res.status(401).json({ error: 'Token inválido.', code: 'TOKEN_INVALID' });
  }
  try {
    const u = await findUserById(payload.sub);
    if (!u) return res.status(401).json({ error: 'Usuário inativo ou inexistente.' });
    if (u.is_active === false) return res.status(401).json({ error: 'Usuário inativo ou inexistente.', code: 'INACTIVE_ACCOUNT' });
    req.user = {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role || 'STUDENT',
      is_active: u.is_active !== false,
    };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Falha ao validar usuário.', code: 'TOKEN_INVALID' });
  }
}

// Exige um dos papéis
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Acesso negado para o papel ' + req.user.role });
    next();
  };
}

// Permite acesso ao próprio recurso ou ADMIN. Parâmetro :userId ou body.user_id
function requireSelfOrAdmin(getId) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado.' });
    const target = getId(req);
    if (req.user.role === 'ADMIN') return next();
    if (String(target) === String(req.user.id)) return next();
    return res.status(403).json({ error: 'Acesso negado: recurso pertence a outro usuário (IDOR/BOLA bloqueado).' });
  };
}

module.exports = { authenticateToken, requireRole, requireSelfOrAdmin, JWT_SECRET, JWT_EXPIRES };
