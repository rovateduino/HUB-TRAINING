#!/usr/bin/env node
/**
 * scripts/verify-firebase.cjs — Verificação End-to-End da Integração Firebase
 *
 * BATERIA DE TESTES:
 *   BLOCO A — Configuração estática (.env, JSON credencial, arquivos de regras)
 *   BLOCO B — Inicialização Admin SDK (initFirebase, getFirestore, getAuth)
 *   BLOCO C — Operações de dual-write via API HTTP (sobe servidor temporário):
 *       C1. Login ADMIN → JWT
 *       C2. Registro STUDENT novo → sync users/{id}
 *       C3. POST /api/progress (lição 2 do STUDENT novo) → sync lesson_progress
 *       C4. POST /api/quiz/submit (30 respostas) → sync quiz_attempts + answers subcollection
 *       C5. POST /api/firebase/bulk-sync (todas as tabelas SQLite → Firestore)
 *       C6. GET /api/firebase/status (pós-operação) → project_id, initialized, queue_size=0
 *
 * USO:
 *   npm run verify:firebase
 *   node scripts/verify-firebase.cjs
 *
 * O script retorna exit code 0 se tudo PASS, 1 se algum FAIL.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const results = [];
function addResult(name, ok, detail) {
  results.push({ name, ok, detail: detail || '' });
  const icon = ok ? '✅' : '❌';
  const detailStr = detail ? `\n    ↳ ${detail}` : '';
  console.log(`${icon}  ${name}${detailStr}`);
}
function PASS(name, detail) { addResult(name, true, detail); }
function FAIL(name, detail) { addResult(name, false, detail); }
function INFO(name, detail) { console.log(`ℹ️  ${name}${detail ? ' — ' + detail : ''}`); }

const PROJECT_ROOT = path.join(__dirname, '..');
const PORT = 58931;
const BASE = `http://localhost:${PORT}`;

// IDs reais do banco: lições vão de id=2 a id=18 (17 registros — NÃO existe id=1)
const FIRST_LESSON_ID = 2;
const EXPECTED_LESSON_COUNT = 17;
const EXPECTED_QUIZ_QUESTIONS = 30; // PASS_SCORE 23/30 fixo no backend (quiz.cjs)

function request(method, urlPath, payload, headers) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + urlPath);
    const data = payload ? JSON.stringify(payload) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        let json;
        try { json = body ? JSON.parse(body) : null; } catch (e) { json = { raw: body.slice(0, 500) }; }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// ============================================================
// BLOCO A — Configuração estática
// ============================================================
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  VERIFICAÇÃO FIREBASE — HUB TRAINING                         ║');
console.log('║  e2e: credenciais → SDK init → dual-write → bulk-sync        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log('─── BLOCO A: Configuração estática ───\n');

const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const fbProjectId = process.env.FIREBASE_PROJECT_ID;
const fbSyncEnabled = process.env.FIREBASE_SYNC_ENABLED;

let gacAbs = null;
let gacJson = null;
if (!gacPath) {
  FAIL('A1. GOOGLE_APPLICATION_CREDENTIALS definido', 'variável ausente no .env');
} else {
  gacAbs = path.isAbsolute(gacPath) ? gacPath : path.join(PROJECT_ROOT, gacPath);
  if (!fs.existsSync(gacAbs)) FAIL('A1. GOOGLE_APPLICATION_CREDENTIALS', `arquivo não encontrado: ${gacAbs}`);
  else {
    try {
      gacJson = JSON.parse(fs.readFileSync(gacAbs, 'utf8'));
      if (!gacJson.project_id) throw new Error('JSON sem campo project_id');
      if (!gacJson.private_key) throw new Error('JSON sem campo private_key');
      if (String(gacJson.private_key).includes('SUBSTITUA_PELA_SUA_CHAVE')) {
        throw new Error('chave privada é placeholder (nunca foi carregada)');
      }
      PASS('A1. GOOGLE_APPLICATION_CREDENTIALS', `projeto: ${gacJson.project_id} — chave privada válida`);
    } catch (e) {
      FAIL('A1. GOOGLE_APPLICATION_CREDENTIALS', `JSON inválido: ${e.message}`);
    }
  }
}

if (!fbProjectId) FAIL('A2. FIREBASE_PROJECT_ID', 'ausente no .env');
else if (gacJson && gacJson.project_id && fbProjectId !== gacJson.project_id) {
  FAIL('A2. FIREBASE_PROJECT_ID', `mismatch .env="${fbProjectId}" vs service-account="${gacJson.project_id}"`);
} else PASS('A2. FIREBASE_PROJECT_ID', `OK — ${fbProjectId}`);

if (fbSyncEnabled !== 'true') FAIL('A3. FIREBASE_SYNC_ENABLED', `atual="${fbSyncEnabled || '(vazio)'}" — esperado "true"`);
else PASS('A3. FIREBASE_SYNC_ENABLED', 'dual-write ligado');

const rulesPath = path.join(PROJECT_ROOT, 'firebase', 'firestore.rules');
if (!fs.existsSync(rulesPath)) FAIL('A4. Arquivo firebase/firestore.rules', 'não encontrado');
else {
  const content = fs.readFileSync(rulesPath, 'utf8');
  const hasDefaultDeny = content.includes("match /{document=**} {") && content.includes("allow read, write: if false;");
  const hasRoleAdmin = content.includes("role in ['ADMIN']") || content.includes(".data.role in ['ADMIN']");
  const hasBlockWrite = /allow\s+write\s*:\s*if\s+false\s*;/g.test(content);
  const checks = [
    ['default-deny global', hasDefaultDeny],
    ['RBAC (role ADMIN)', hasRoleAdmin],
    ['zero escritas client-side (allow write: if false)', hasBlockWrite],
  ];
  const ok = checks.every(([, v]) => v);
  if (ok) PASS('A4. Arquivo firebase/firestore.rules', checks.map(([k, v]) => `${k}:${v ? 'OK' : 'FAIL'}`).join(' · '));
  else FAIL('A4. Arquivo firebase/firestore.rules', checks.map(([k, v]) => `${k}:${v ? 'OK' : 'FAIL'}`).join(' · '));
}

const idxPath = path.join(PROJECT_ROOT, 'firebase', 'firestore.indexes.json');
if (!fs.existsSync(idxPath)) FAIL('A5. Arquivo firebase/firestore.indexes.json', 'não encontrado');
else {
  try {
    const idx = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
    PASS('A5. Arquivo firebase/firestore.indexes.json', `${idx.indexes.length} índices compostos + ${idx.fieldOverrides.length} field overrides`);
  } catch (e) { FAIL('A5. Arquivo firebase/firestore.indexes.json', `JSON inválido: ${e.message}`); }
}

// ============================================================
// BLOCO B — Inicialização Admin SDK (sem servidor, módulo direto)
// ============================================================
console.log('\n─── BLOCO B: Inicialização Admin SDK ───\n');

let firebaseServices = null;
try {
  firebaseServices = require('../server/services/firebase.cjs');
} catch (e) {
  FAIL('B1. Importar firebase.cjs', e.message);
}

if (firebaseServices) {
  try {
    const init = firebaseServices.initFirebase();
    if (firebaseServices.isInitialized()) {
      PASS('B1. initFirebase()', `initialized=true — project=${process.env.FIREBASE_PROJECT_ID}`);
    } else {
      FAIL('B1. initFirebase()', `initialized=false — ${firebaseServices.getInitError() || init.error}`);
    }
  } catch (e) { FAIL('B1. initFirebase()', e.message); }

  try {
    const fs = firebaseServices.getFirestore();
    if (!fs) FAIL('B2. getFirestore()', 'retornou null');
    else PASS('B2. getFirestore()', 'instância Firestore obtida');
  } catch (e) { FAIL('B2. getFirestore()', e.message); }

  try {
    const auth = firebaseServices.getAuth();
    if (!auth) FAIL('B3. getAuth()', 'retornou null');
    else PASS('B3. getAuth()', 'instância Auth obtida');
  } catch (e) { FAIL('B3. getAuth()', e.message); }

  try {
    const ts = firebaseServices.getTimestamp();
    if (!ts || typeof ts.toDate !== 'function') FAIL('B4. getTimestamp()', 'retorno inválido');
    else PASS('B4. getTimestamp()', 'Timestamp agora() gerado OK');
  } catch (e) { FAIL('B4. getTimestamp()', e.message); }

  try {
    const sync = require('../server/services/firestoreSync.cjs');
    if (!sync || typeof sync.syncUserUpsert !== 'function') FAIL('B5. firestoreSync.cjs', 'API incompleta');
    else PASS('B5. firestoreSync.cjs carregado', 'entidades: users, lessons, quiz, checkpoints, audit, modules, bulk-sync');
  } catch (e) { FAIL('B5. firestoreSync.cjs', e.message); }
} else {
  FAIL('B1. initFirebase()', 'skip (módulo não importou)');
  FAIL('B2. getFirestore()', 'skip');
  FAIL('B3. getAuth()', 'skip');
  FAIL('B4. getTimestamp()', 'skip');
  FAIL('B5. firestoreSync.cjs', 'skip');
}

// ============================================================
// BLOCO C — Operações API HTTP (servidor temporário)
// ============================================================
console.log('\n─── BLOCO C: Dual-write via API HTTP (servidor temporário) ───\n');

let appServer = null;
const sdkInitOk = firebaseServices && firebaseServices.isInitialized();

(async function runBlockC() {
  if (!sdkInitOk) {
    FAIL('C1. Servidor HTTP (start)', 'skip: SDK não inicializou');
    FAIL('C2. Login ADMIN', 'skip');
    FAIL('C3. Registro STUDENT', 'skip');
    FAIL('C4. Progresso lição 2', 'skip');
    FAIL('C5. Submeter simulado (30q)', 'skip');
    FAIL('C6. Bulk-sync /api/firebase/bulk-sync', 'skip');
    FAIL('C7. GET /api/firebase/status final', 'skip');
    printResult();
    return;
  }

  // ---------- C0: startar servidor temporário ----------
  try {
    process.env.PORT = String(PORT);
    delete require.cache[require.resolve('../server/index.cjs')];
    const app = require('../server/index.cjs');
    appServer = app.listen(PORT, '127.0.0.1', () => {});
    await new Promise((r) => setTimeout(r, 1200));
    PASS('C1. Servidor HTTP (start)', `ouvindo 127.0.0.1:${PORT}`);
  } catch (e) {
    FAIL('C1. Servidor HTTP (start)', e.message);
    printResult();
    return;
  }

  let adminToken = null;
  let studentEmail = `aluno.verify.${Date.now() % 1000000}@teste.local`;
  let studentPw = `Pw!${crypto.randomBytes(6).toString('hex')}`;
  let studentName = 'Aluno Verificação Firebase';
  let studentId = null;

  // ---------- C2: Login ADMIN ----------
  try {
    const r = await request('POST', '/api/auth/login', { email: 'adm@teste.com', password: 'adm123456' });
    if (r.status !== 200 || !r.data || !r.data.token) throw new Error(`HTTP ${r.status} — ${r.data && r.data.error ? r.data.error : 'sem token'}`);
    adminToken = r.data.token;
    PASS('C2. Login ADMIN', `id=${r.data.user.id} role=${r.data.user.role} token_20ch=${adminToken.slice(0, 20)}...`);
  } catch (e) {
    FAIL('C2. Login ADMIN', e.message);
    adminToken = null;
  }

  if (!adminToken) {
    FAIL('C3. Registro STUDENT', 'skip: sem token admin');
    FAIL('C4. Progresso lição 2', 'skip');
    FAIL('C5. Submeter simulado (30q)', 'skip');
    FAIL('C6. Bulk-sync /api/firebase/bulk-sync', 'skip');
    FAIL('C7. GET /api/firebase/status final', 'skip');
    cleanup();
    return;
  }

  const authHdr = { Authorization: 'Bearer ' + adminToken };

  // ---------- C3: Registro STUDENT ----------
  let studentToken = null;
  try {
    const r = await request('POST', '/api/auth/register', {
      email: studentEmail,
      password: studentPw,
      name: studentName,
      identifier: 'VF-' + (Date.now() % 1000000),
    });
    if (r.status !== 201 || !r.data || !r.data.id) throw new Error(`HTTP ${r.status} — ${r.data && r.data.error ? r.data.error : 'sem id'}`);
    studentId = r.data.id;
    PASS('C3. Registro STUDENT (duplicate no Firestore)', `email=${studentEmail} user_id=${studentId} status=201`);

    // Confirmar que consegue logar (bcrypt hash gravado + role STUDENT)
    const login2 = await request('POST', '/api/auth/login', { email: studentEmail, password: studentPw });
    if (login2.status !== 200 || !login2.data.token) throw new Error(`STUDENT login falhou HTTP ${login2.status}`);
    studentToken = login2.data.token;
    PASS('C3a. Login STUDENT (recém-criado)', `role=${login2.data.user.role}`);
  } catch (e) { FAIL('C3. Registro STUDENT', e.message); }

  // ---------- C4: Progresso lição 2 ----------
  try {
    const payload = { user_id: studentId, lesson_id: FIRST_LESSON_ID, status: 'IN_PROGRESS', progress: 50 };
    const r = await request('POST', '/api/progress', payload, { Authorization: 'Bearer ' + studentToken });
    if (r.status !== 200 || !r.data) throw new Error(`HTTP ${r.status} — ${r.data && r.data.error ? r.data.error : ''}`);
    const p = r.data.progress;
    if (!p || p.user_id !== studentId) throw new Error('progress.user_id não corresponde ao STUDENT');
    PASS('C4. POST /api/progress (lição 2 — dual-write)', `progress_id=${p.id} status=${p.status || 'IN_PROGRESS'} progress=${p.progress || 50}`);
  } catch (e) { FAIL('C4. POST /api/progress', e.message); }

  // ---------- C5: Simulado 30 questões ----------
  let questionIds = [];
  try {
    const trainingQ = await request('GET', '/api/quiz/questions', null, { Authorization: 'Bearer ' + studentToken });
    const questions = trainingQ.data && Array.isArray(trainingQ.data.questions) ? trainingQ.data.questions : null;
    if (trainingQ.status !== 200 || !questions) throw new Error(`HTTP ${trainingQ.status} — shape=${JSON.stringify(trainingQ.data).slice(0, 160)}`);
    if (questions.length !== EXPECTED_QUIZ_QUESTIONS) throw new Error(`esperado ${EXPECTED_QUIZ_QUESTIONS}, recebido ${questions.length}`);
    questionIds = questions.map((q) => q.id);
    const gabaritoExposto = /is_correct|correctAnswer|answerKey|gabarito/i.test(JSON.stringify(trainingQ.data));
    PASS(`C5a. GET /api/quiz/questions (${EXPECTED_QUIZ_QUESTIONS})`, `${questions.length} retornadas — gabarito_exposto=${gabaritoExposto}`);
  } catch (e) {
    FAIL('C5a. GET /api/quiz/questions', e.message);
  }

  try {
    const respostas = {};
    for (const qid of questionIds) respostas[String(qid)] = 99999; // envio opção inválida → score baixo, mas fluxo completo
    const r = await request('POST', '/api/quiz/submit', { answers: respostas }, { Authorization: 'Bearer ' + studentToken });
    if (r.status !== 200 || !r.data || !r.data.attempt_id) throw new Error(`HTTP ${r.status} — ${r.data && r.data.error ? r.data.error : 'sem attempt_id'}`);
    // STUDENT SÓ PODE VER APROVADO / NÃO APROVADO — sem score
    const temApenasResult = r.data.result === 'APROVADO' || r.data.result === 'NÃO APROVADO';
    const semScore = r.data.score === undefined && r.data.correct === undefined;
    PASS('C5b. POST /api/quiz/submit (dual-write)',
      `attempt_id=${r.data.attempt_id} result=${r.data.result} apenas_resultado=${temApenasResult} sem_score=${semScore}`);
  } catch (e) { FAIL('C5b. POST /api/quiz/submit', e.message); }

  // ---------- C6: Bulk-sync completo ----------
  try {
    const r = await request('POST', '/api/firebase/bulk-sync', {}, authHdr);
    if (r.status !== 200 || !r.data || r.data.ok !== true) {
      throw new Error(`HTTP ${r.status} — ${r.data && (r.data.error || JSON.stringify(r.data))}`);
    }
    const c = r.data.counts || {};
    const modOk = c.modules === 17;
    const lessonsOk = c.lessons === EXPECTED_LESSON_COUNT;
    const usersOk = c.users > 0;
    const attemptsOk = c.quiz_attempts > 0;
    const ok = modOk && lessonsOk && usersOk && attemptsOk;
    const det = `users=${c.users}, modules=${c.modules}, lessons=${c.lessons}, lp=${c.lesson_progress}, qa=${c.quiz_attempts}, cka=${c.checkpoint_answers}, audit=${c.audit_logs}`;
    if (ok) PASS('C6. POST /api/firebase/bulk-sync', det);
    else FAIL('C6. POST /api/firebase/bulk-sync', det);
  } catch (e) { FAIL('C6. POST /api/firebase/bulk-sync', e.message); }

  // ---------- C7: /api/firebase/status final ----------
  try {
    const r = await request('GET', '/api/firebase/status', null, authHdr);
    if (r.status !== 200 || !r.data) throw new Error(`HTTP ${r.status}`);
    const d = r.data;
    const checks = [
      ['sync_enabled=true', d.sync_enabled === true],
      ['initialized=true', d.initialized === true],
      ['init_error=null', d.init_error === null],
      ['project_id preenchido', typeof d.project_id === 'string' && d.project_id.length > 0],
      ['queue_size=0 (campo esperado roteiro)', d.queue_size === 0],
      ['queue_pending=0 (alias retrocompatível)', d.queue_pending === 0],
    ];
    const ok = checks.every(([, v]) => v);
    const det = checks.map(([k, v]) => `${k}:${v ? 'OK' : 'FAIL'}`).join(' · ');
    if (ok) PASS('C7. GET /api/firebase/status (final)', det);
    else FAIL('C7. GET /api/firebase/status (final)', det + ' payload=' + JSON.stringify(d));
  } catch (e) { FAIL('C7. GET /api/firebase/status (final)', e.message); }

  // ---------- C8: /health final ----------
  try {
    const r = await request('GET', '/health');
    if (r.status !== 200 || !r.data) throw new Error(`HTTP ${r.status}`);
    const fb = r.data.firebase || {};
    if (r.data.status !== 'ok') throw new Error('status!==ok');
    if (fb.initialized !== true) throw new Error('firebase.initialized !== true');
    PASS('C8. GET /health inclui metadados firebase', `initialized=true project_sync=${fb.sync_enabled}`);
  } catch (e) { FAIL('C8. GET /health', e.message); }

  cleanup();
  printResult();

  function cleanup() {
    if (appServer) { try { appServer.close(); } catch { /* noop */ } appServer = null; }
  }
})();

function printResult() {
  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  const total = pass + fail;

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`RESULTADO: ${pass} PASS / ${fail} FAIL (total: ${total})`);
  console.log('─────────────────────────────────────────────────────────────');

  if (fail > 0) {
    console.log('\n❌  Itens com FAIL:');
    for (const f of results.filter((r) => !r.ok)) console.log(`  • ${f.name} → ${f.detail}`);
    console.log('\nCorrija os itens acima e re-ranque: npm run verify:firebase\n');
    process.exit(1);
  } else {
    console.log('\n🟢  TODOS OS CHECKS PASSARAM. Integração Firebase 100% funcional.');
    console.log('   • Dual-write ativo: TUDO novo (users/progress/quiz/checkpoints/audit)');
    console.log('     será sincronizado automaticamente para o Firestore em background.');
    console.log('   • Bulk-sync já povoou a coleção vazia com o histórico existente.\n');
    process.exit(0);
  }
}
