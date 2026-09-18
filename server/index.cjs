const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const { initFirebase, isFirebaseEnabled, isInitialized, getInitError, getResolvedProjectId } = require('./services/firebase.cjs');
const { authenticateToken, requireRole, JWT_SECRET } = require('./middleware/auth.cjs');
const { apiReadLimiter, apiWriteLimiter } = require('./middleware/rateLimit.cjs');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================
// FIREBASE INIT (assíncrono, não bloqueia startup)
// ========================
setTimeout(() => {
  const result = initFirebase();
  if (result.ok) {
    const pid = getResolvedProjectId();
    console.log('\x1b[32m%s\x1b[0m', `[FIREBASE] FONTE PRIMÁRIA ATIVA — Firestore (projeto: ${pid || 'n/d'})`);
  } else if (!isFirebaseEnabled()) {
    console.warn('[FIREBASE] Sync desativado via FIREBASE_SYNC_ENABLED=false');
  } else {
    console.warn('[FIREBASE] Firebase não disponível:', result.error || getInitError());
  }
}, 100);

// ========================
// MIDDLEWARE
// ========================
app.use(helmet({
  contentSecurityPolicy: false // Desabilitado para desenvolvimento
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting: leituras (GET) com teto folgado, escritas com teto restrito.
// O dashboard SPA é tagarela em GETs (módulos, aulas, checkpoints por navegação);
// o teto único antigo (100/15min) derrubava uso normal com 429.
app.use('/api/', (req, res, next) => {
  const read = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  return (read ? apiReadLimiter : apiWriteLimiter)(req, res, next);
});

// ========================
// AVISOS DE SEGURANÇA NO STARTUP
// ========================
const DEFAULT_JWT_SECRET = 'HUB-TRAINING-SECRET-MUDAR-2026';
if (!JWT_SECRET || JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.warn('\x1b[33m%s\x1b[0m', '[AUTH] ⚠  AVISO CRÍTICO: JWT_SECRET usando valor DEFAULT. Altere no .env ANTES de produção. Tokens são inseguros.');
}
console.warn('\x1b[33m%s\x1b[0m', '[RATE-LIMIT] ⚠  Rate limit = MemoryStore (NÃO compartilhado entre Vercel Functions). Aceitável MVP. Para produção distribuída, implementar Upstash Redis em fase posterior.');

// Arquivos estáticos
app.use('/static', express.static(path.join(__dirname, '../static')));

// ========================
// ROTAS DE SAÚDE
// ========================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: {
      sync_enabled: isFirebaseEnabled(),
      initialized: isInitialized(),
      init_error: getInitError(),
    },
  });
});

// Status detalhado do Firebase (autenticado como ADMIN)
app.get('/api/firebase/status', authenticateToken, requireRole('ADMIN'), (req, res) => {
  res.json({
    initialized: isInitialized(),
    project_id: getResolvedProjectId() || process.env.FIREBASE_PROJECT_ID || null,
    sync_enabled: isFirebaseEnabled(),
    init_error: getInitError(),
    queue_size: 0,
    deprecated_dual_write: true,
    primary_store: 'firestore',
  });
});

// Trigger bulk-sync completo (DEPRECATED — Firestore é fonte primária) — APENAS ADMIN
app.post('/api/firebase/bulk-sync', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  res.status(200).json({
    ok: true,
    deprecated: true,
    message: 'Firestore é fonte primária. Nada a sincronizar. Operação removida.',
  });
});

// ========================
// ROTAS LEGADAS (compatibilidade)
// ========================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../home.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// Página pública de validação de certificado (sem login)
app.get('/validar/:certificateNumber', (req, res) => {
  res.sendFile(path.join(__dirname, '../validar.html'));
});

app.get('/simulado', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard.html'));
});

// ========================
// ROTAS HTML PÚBLICAS (autenticação / onboarding)
// ========================
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/login.html'));
});
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/register.html'));
});
app.get('/reset', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/reset.html'));
});
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/admin_login.html'));
});

// Rota pública para HTML do painel ADM (igual ao /dashboard)
// Proteção real é feita client-side (validação via /api/auth/me) +
// server-side em todas as rotas /api/admin/* (middleware authenticateToken + requireRole)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../static/admin.html'));
});

// ========================
// ROTAS API
// ========================
app.use('/api/training', require('./routes/training.cjs'));
app.use('/api/auth', require('./routes/auth.cjs'));
app.use('/api/quiz', require('./routes/quiz.cjs'));
app.use('/api/admin', require('./routes/admin.cjs'));
app.use('/api/dashboard', require('./routes/dashboard.cjs'));
app.use('/api/progress', require('./routes/progress.cjs'));
app.use('/api/checkpoints', require('./routes/checkpoints.cjs'));
app.use('/api/certificates', require('./routes/certificates.cjs'));
app.use('/api/practical', require('./routes/practical.cjs'));
app.use('/api/audit', require('./routes/audit.cjs'));
app.use('/api/equipment', require('./routes/equipment.cjs'));
app.use('/api/images', require('./routes/images.cjs'));

// ========================
// TRATAMENTO DE ERROS
// ========================
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ========================
// GRACEFUL SHUTDOWN
// ========================
function shutdown(signal) {
  console.log(`\n[SHUTDOWN] Recebido sinal ${signal}. Encerrando servidor...`);
  console.log('[SHUTDOWN] Firestore é fonte primária — sem fila para flush.');
  setTimeout(() => {
    console.log('[SHUTDOWN] Processo encerrado.');
    process.exit(0);
  }, 300);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ========================
// INICIALIZAÇÃO
// ========================
if (require.main === module) {
  app.listen(PORT, () => {
    const ENV = process.env.NODE_ENV || 'development';
    const ENV_COLOR = ENV === 'production' ? '\x1b[31m' : '\x1b[36m';
    console.log(`\n${ENV_COLOR}═══════════════════════════════════════\x1b[0m`);
    console.log(`${ENV_COLOR} 🚀  HUB TRAINING — SERVIDOR INICIADO  \x1b[0m`);
    console.log(`${ENV_COLOR}═══════════════════════════════════════\x1b[0m`);
    console.log(`  📍 Porta     : ${PORT}`);
    console.log(`  🌍 Ambiente  : ${ENV_COLOR}${ENV}\x1b[0m`);
    console.log(`  ✅ Health    : http://localhost:${PORT}/health`);
    console.log(`  🔌 API       : http://localhost:${PORT}/api/`);
    console.log(`  🏠 Home      : http://localhost:${PORT}/`);
    console.log(`  📊 Dashboard : http://localhost:${PORT}/dashboard`);
    console.log(`${ENV_COLOR}───────────────────────────────────────\x1b[0m`);
    console.log(`  🔥 Firebase  : ${process.env.FIREBASE_PROJECT_ID || '(aguardando init async — ver log acima)'}`);
    console.log(`  🔐 Primary   : Firestore (SQLite removido do runtime)`);
    console.log(`${ENV_COLOR}═══════════════════════════════════════\x1b[0m\n`);
  });
}

module.exports = app;