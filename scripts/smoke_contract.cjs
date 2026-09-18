// SMOKE CONTRACT E2E — Task 16 (Firestore Primário)
// Autocontido: sobe o servidor, cria fixtures com emails únicos, roda os 14
// passos do plano, limpa tudo. Exit 0 = 0 failures.
// Uso: node scripts/smoke_contract.cjs [PORT]
try { require('dotenv').config(); } catch (_) {}
const { spawn } = require('child_process');
const path = require('path');
const jwt = require('jsonwebtoken');

const PORT = Number(process.argv[2] || process.env.SMOKE_PORT || 5101);
const BASE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log('  PASS ' + name + (extra ? ' | ' + extra : '')); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' | ' + extra : '')); }
}
async function req(method, p, body, token) {
  const r = await fetch(BASE + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch (_) {}
  return { s: r.status, b: data };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(2, '0');

async function waitHealth(srv, timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      const h = await req('GET', '/health');
      if (h.s === 200) return h;
    } catch (_) {}
    if (Date.now() - start > timeoutMs) throw new Error('health não respondeu');
    await sleep(500);
  }
}

async function main() {
  const { initFirebase, getFirestore } = require('../server/services/firebase.cjs');
  const { createUser } = require('../server/repositories/authRepo.cjs');
  const { createInviteToken } = require('../server/repositories/adminRepo.cjs');
  const { deleteAttemptAndAnswers } = require('../server/repositories/quizRepo.cjs');
  const { JWT_SECRET } = require('../server/middleware/auth.cjs');
  initFirebase();
  const db = getFirestore();

  console.log('== SMOKE CONTRACT E2E (Firestore Primário) PORTA=' + PORT + ' ==');
  const srv = spawn('node', ['server/index.cjs'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', (d) => process.stdout.write('[srv] ' + d));
  srv.stderr.on('data', (d) => process.stderr.write('[srv-err] ' + d));

  try {
    // 1+2. health
    const h = await waitHealth(srv);
    ok('2. GET /health 200', h.s === 200);

    // 1. limpeza prévia de leftovers de runs abortados
    for (const em of ['smoke16@teste.com', 'smoke16adm@teste.com']) {
      const u = await db.collection('users').where('email', '==', em).get();
      for (const d of u.docs) await db.collection('users').doc(d.id).delete().catch(() => {});
    }
    ok('1. limpeza prévia ok', true);

    // fixtures: admin + invite (quiz usa o catálogo REAL migrado: 30 questões)
    const adm = await createUser({ email: 'smoke16adm@teste.com', name: 'Smoke 16 Adm', password_hash: 'x', role: 'ADMIN', is_active: true });
    const atok0 = jwt.sign({ sub: adm.id, email: adm.email, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '15m' });
    const invite = await createInviteToken({ max_uses: 5 });
    // gabarito via visão ADMIN (is_correct) para montar submits determinísticos
    const qFull = await req('GET', '/api/quiz/questions', null, atok0);
    const catalog = (qFull.b && qFull.b.questions) || [];
    const correctOpt = (q) => String((q.options.find((o) => o.is_correct === true || o.is_correct === 1) || {}).id);
    const wrongOpt = (q) => String((q.options.find((o) => !(o.is_correct === true || o.is_correct === 1)) || {}).id);

    // 3. register → 201
    let r = await req('POST', '/api/auth/register', { email: 'smoke16@teste.com', password: 'Senha123!', name: 'Smoke Dezesseis', invite_token: invite.token });
    ok('3. register → 201', r.s === 201 && r.b.id && !('password_hash' in r.b), JSON.stringify(r.b));
    const uid = r.b.id;

    // 4. login → 200 + token
    r = await req('POST', '/api/auth/login', { email: 'smoke16@teste.com', password: 'Senha123!' });
    ok('4. login → 200 + token', r.s === 200 && !!r.b.token && r.b.user.role === 'STUDENT', 'hasToken=' + !!(r.b && r.b.token));
    const tok = r.b.token;

    // 5. me → shape sem password_hash
    r = await req('GET', '/api/auth/me', null, tok);
    ok('5. me → 200 sem password_hash', r.s === 200 && r.b.user && r.b.user.id === uid && !('password_hash' in r.b.user));

    // 6. modules → 200 array
    r = await req('GET', '/api/training/modules', null, tok);
    ok('6. modules → 200 array', r.s === 200 && Array.isArray(r.b.modules), 'n=' + (r.b.modules || []).length);

    // 7. progress próprio → 200
    r = await req('GET', `/api/progress/user/${uid}`, null, tok);
    ok('7. progress → 200', r.s === 200 && Array.isArray(r.b.progress));

    // 8. questions → 30 sem gabarito
    r = await req('GET', '/api/quiz/questions', null, tok);
    ok('8. questions → 30 sem is_correct', r.s === 200 && r.b.total === 30 && !JSON.stringify(r.b).includes('is_correct'), 'total=' + r.b.total);

    // 9. submit 22 → NÃO APROVADO; 25 → APROVADO
    const a22 = {};
    catalog.forEach((q, idx) => { a22[String(q.id)] = idx < 22 ? correctOpt(q) : wrongOpt(q); });
    r = await req('POST', '/api/quiz/submit', { answers: a22 }, tok);
    ok('9a. submit 22 → NÃO APROVADO', r.s === 200 && r.b.result === 'NÃO APROVADO', JSON.stringify(r.b.result));
    const attId = r.b.attempt_id;
    const a25 = {};
    catalog.forEach((q, idx) => { a25[String(q.id)] = idx < 25 ? correctOpt(q) : wrongOpt(q); });
    r = await req('POST', '/api/quiz/submit', { answers: a25 }, tok);
    ok('9b. submit 25 → APROVADO', r.s === 200 && r.b.result === 'APROVADO');

    // 10. my-attempt STUDENT → só {attempt_id, result}
    r = await req('GET', `/api/quiz/my-attempt/${attId}`, null, tok);
    ok('10. attempt STUDENT só attempt_id+result', r.s === 200 && Object.keys(r.b).sort().join(',') === 'attempt_id,result', Object.keys(r.b || {}).join(','));

    // 11. promote: STUDENT → 403; ADMIN → 200
    r = await req('POST', `/api/admin/users/${uid}/promote`, {}, tok);
    ok('11a. promote STUDENT → 403', r.s === 403, 'status=' + r.s);
    r = await req('POST', `/api/admin/users/${uid}/promote`, { role: 'STUDENT' }, atok0);
    ok('11b. promote ADMIN → 200', r.s === 200, JSON.stringify(r.b));

    // 12. academic completo (17 lições + checkpoints) + practical + issue → 201
    const modsR = await req('GET', '/api/training/modules', null, tok);
    const lessonIds = [];
    for (const m of modsR.b.modules || []) {
      const det = await req('GET', `/api/training/module/${m.id}`, null, tok);
      for (const l of (det.b && det.b.lessons) || []) lessonIds.push(l.id);
    }
    ok('12a0. catálogo tem lições', lessonIds.length > 0, 'n=' + lessonIds.length);
    for (const lid of lessonIds) await req('POST', `/api/training/lesson/${lid}/complete`, {}, tok);
    const { getCheckpointsByLesson, getCheckpointOptionsWithCorrect } = require('../server/repositories/checkpointRepo.cjs');
    let cpDone = 0;
    const cpIds = [];
    for (const lid of lessonIds) {
      const cps = await getCheckpointsByLesson(lid);
      for (const c of cps) {
        const opts = await getCheckpointOptionsWithCorrect(c.id);
        const corr = opts.find((o) => o.is_correct === true || o.is_correct === 1);
        if (corr) {
          const sr = await req('POST', `/api/checkpoints/${c.id}/submit`, { selected_option_id: corr.id }, tok);
          if (sr.s === 200) { cpDone++; cpIds.push(c.id); }
        }
      }
    }
    ok('12a00. checkpoints respondidos', cpDone > 0, 'n=' + cpDone);
    const today = new Date().toISOString().slice(0, 10);
    r = await req('POST', '/api/practical', { user_id: uid, evaluation_date: today, result: 'APTO', criteria: ['safety_attention'] }, atok0);
    ok('12a. practical APTO → 201', (r.s === 201 || r.s === 200) && r.b.evaluation.result === 'APTO', 'status=' + r.s);
    r = await req('POST', '/api/admin/certificates/issue', { user_id: uid }, atok0);
    const num = r.b && r.b.certificate && r.b.certificate.certificate_number;
    ok('12b. issue → 201 número único', r.s === 201 && !!num, 'number=' + num);

    // 13. validate público → 200
    r = await req('GET', `/api/certificates/validate/${num}`);
    ok('13. validate → 200', r.s === 200 && r.b.status === 'VALID', 'status=' + (r.b && r.b.status));

    // 14. logout → 204
    r = await req('POST', '/api/auth/logout', {}, tok);
    ok('14. logout → 204', r.s === 204, 'status=' + r.s);

    // ---- cleanup (só dados do smoke; catálogo real NUNCA é tocado) ----
    const atts = await db.collection('quiz_attempts').where('user_id', '==', uid).get();
    for (const d of atts.docs) await deleteAttemptAndAnswers(d.id);
    for (const lid of lessonIds) {
      await db.collection('lesson_progress').doc(`${uid}_${lid}`).delete().catch(() => {});
    }
    for (const cpid of cpIds) {
      await db.collection('checkpoint_answers').doc(`${uid}_${cpid}`).delete().catch(() => {});
    }
    const evs = await db.collection('practical_evaluations').where('user_id', '==', uid).get();
    for (const d of evs.docs) await d.ref.delete();
    const certs = await db.collection('certificates').where('user_id', '==', uid).get();
    for (const d of certs.docs) await d.ref.delete();
    await db.collection('invite_tokens').doc(String(invite.id)).delete().catch(() => {});
    for (const u of [uid, adm.id]) {
      const au = await db.collection('audit_logs').where('user_id', '==', u).get();
      for (const x of au.docs) await x.ref.delete();
      await db.collection('users').doc(String(u)).delete();
    }
    console.log('cleanup ok');

    console.log('==================================================');
    console.log(`RESUMO SMOKE CONTRACT: ${pass} PASS | ${fail} FAIL | 0 SKIP`);
    console.log('==================================================');
    process.exit(fail > 0 ? 1 : 0);
  } finally {
    try { srv.kill('SIGTERM'); } catch (_) {}
    setTimeout(() => { try { srv.kill('SIGKILL'); } catch (_) {} }, 1500).unref();
  }
}

main().catch((e) => { console.error('SMOKE FATAL:', e); process.exit(2); });
