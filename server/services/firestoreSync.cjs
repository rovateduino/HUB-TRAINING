const { isFirebaseEnabled, isInitialized, initFirebase, getFirestore } = require('./firebase.cjs');

// ============================================================
// [DEPRECATED] firestoreSync.cjs — dual-write SQLite → Firestore
// Firestore agora é FONTE PRIMÁRIA. Este arquivo existe APENAS
// para não quebrar requires acidentais de código legado.
// Todas as funções abaixo são NO-OP stubs.
// ============================================================

// @deprecated — fila stateful não mais usada. Mantido vazio para introspecção.
const SYNC_QUEUE = [];

let _deprecationWarned = false;
function _warnDeprecated(fnName) {
  if (_deprecationWarned) return;
  _deprecationWarned = true;
  console.warn(
    '\x1b[33m%s\x1b[0m',
    `[FIRESTORE_SYNC] ⚠  DEPRECATED: firestoreSync.cjs/${fnName} chamado. ` +
    'Firestore é FONTE PRIMÁRIA. Dual-write SQLite→Firestore foi REMOVIDO. ' +
    'Esta é uma operação NO-OP. Atualize o chamador para usar Repositories diretamente.'
  );
}

function enqueue(fn) {
  _warnDeprecated('enqueue');
  return Promise.resolve();
}

function enqueueFirestoreOp(fn) {
  _warnDeprecated('enqueueFirestoreOp');
  return Promise.resolve();
}

async function processQueue() {
  _warnDeprecated('processQueue');
  return Promise.resolve();
}

async function flushQueue() {
  _warnDeprecated('flushQueue');
  return Promise.resolve();
}

function canSync() {
  return false;
}

function safeDocId(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.replace(/[\\/]/g, '_');
}

function syncUserUpsert(user) {
  _warnDeprecated('syncUserUpsert');
  return undefined;
}
function syncUserSoftDelete(userId) {
  _warnDeprecated('syncUserSoftDelete');
  return undefined;
}
function syncQuizAttemptDelete(attemptId) {
  _warnDeprecated('syncQuizAttemptDelete');
  return undefined;
}
function syncUserHardDelete(userId) {
  _warnDeprecated('syncUserHardDelete');
  return undefined;
}
function syncLessonProgressUpsert(progress) {
  _warnDeprecated('syncLessonProgressUpsert');
  return undefined;
}
function syncQuizAttemptUpsert(attempt, answers) {
  _warnDeprecated('syncQuizAttemptUpsert');
  return undefined;
}
function syncCheckpointAnswerUpsert(answer) {
  _warnDeprecated('syncCheckpointAnswerUpsert');
  return undefined;
}
function syncAuditLog(log) {
  _warnDeprecated('syncAuditLog');
  return undefined;
}
function syncTrainingModuleUpsert(mod) {
  _warnDeprecated('syncTrainingModuleUpsert');
  return undefined;
}
function syncTrainingLessonUpsert(lesson) {
  _warnDeprecated('syncTrainingLessonUpsert');
  return undefined;
}

async function runFullBulkSync() {
  _warnDeprecated('runFullBulkSync');
  return Promise.resolve({
    ok: true,
    deprecated: true,
    skipped_all: true,
    message: 'Firestore é fonte primária. Nada a sincronizar.',
  });
}

module.exports = {
  SYNC_QUEUE,
  enqueue,
  enqueueFirestoreOp,
  processQueue,
  flushQueue,
  canSync,
  safeDocId,
  syncUserUpsert,
  syncUserSoftDelete,
  syncUserHardDelete,
  syncLessonProgressUpsert,
  syncQuizAttemptUpsert,
  syncQuizAttemptDelete,
  syncCheckpointAnswerUpsert,
  syncAuditLog,
  syncTrainingModuleUpsert,
  syncTrainingLessonUpsert,
  runFullBulkSync,
};
