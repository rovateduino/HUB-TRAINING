// Teste final obrigatório: AUTH, RBAC, IDOR/BOLA, CHECKPOINTS, PROGRESSO, SIMULADO (22/23/30), ADM, gabarito, persistência
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const o = { hostname: '127.0.0.1', port: 5000, path: p, method, headers: { 'Content-Type': 'application/json' } };
    if (token) o.headers.Authorization = 'Bearer ' + token;
    if (data) o.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(o, (res) => { let b = ''; res.on('data', c => b += c); res.on('end', () => { let j; try { j = JSON.parse(b); } catch { j = b; } resolve({ s: res.statusCode, b: j, raw: b }); }); });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
function ok(name, cond, extra = '') { if (cond) { pass++; console.log(`  PASS ${name} ${extra}`); } else { fail++; console.log(`  FAIL ${name} ${extra}`); } }

async function main() {
  console.log('== SUBINDO SERVIDOR ==');
  const srv = spawn('node', ['server/index.cjs'], { cwd: path.join(__dirname, '..') });
  srv.stdout.on('data', d => process.stdout.write('[srv] ' + d));
  srv.stderr.on('data', d => process.stderr.write('[srv-err] ' + d));
  await sleep(2500);

  try {
    console.log('\n== BUILD/BACKEND/FRONTEND/DATABASE ==');
    const h = await req('GET', '/health'); ok('health', h.s === 200);
    const mods = await req('GET', '/api/training/modules'); ok('17 módulos', mods.s === 200 && mods.b.modules.length === 17, `(${mods.b.modules?.length})`);
    const m9 = await req('GET', '/api/training/module/9'); ok('módulo 9 tem lições', m9.s === 200 && m9.b.lessons.length > 0);
    const m17 = await req('GET', '/api/training/module/17'); ok('módulo 17 tem lições', m17.s === 200 && m17.b.lessons.length > 0);
    const dash = await new Promise((res, rej) => { http.get('http://127.0.0.1:5000/dashboard', (r) => { let b = ''; r.on('data', c => b += c); r.on('end', () => res({ s: r.statusCode, b })); }).on('error', rej); });
    ok('dashboard HTML (sidebar+hero)', dash.s === 200 && dash.b.includes('Treinamento Completo!') && dash.b.includes('Meu Progresso'));

    console.log('\n== AUTH ==');
    const noTok = await req('GET', '/api/quiz/questions'); ok('sem token → 401', noTok.s === 401);
    const badLogin = await req('POST', '/api/auth/login', { email: 'aluno.a@teste.com', password: 'errada' }); ok('login errado → 401', badLogin.s === 401);
    const la = await req('POST', '/api/auth/login', { email: 'aluno.a@teste.com', password: 'senha123' }); ok('login A OK', la.s === 200 && la.b.token, '');
    const lb = await req('POST', '/api/auth/login', { email: 'aluno.b@teste.com', password: 'senha123' }); ok('login B OK', lb.s === 200 && lb.b.token);
    const ladm = await req('POST', '/api/auth/login', { email: 'adm@teste.com', password: 'adm123456' }); ok('login ADM OK', ladm.s === 200 && ladm.b.token);
    const tA = la.b.token, tB = lb.b.token, tADM = ladm.b.token;
    const idA = la.b.user.id, idB = lb.b.user.id;
    const badTok = await req('GET', '/api/quiz/questions', null, 'invalido'); ok('token inválido → 401', badTok.s === 401);
    const me = await req('GET', '/api/auth/me', null, tA); ok('me autenticado', me.s === 200 && me.b.user.role === 'STUDENT');
    const lo = await req('POST', '/api/auth/logout', {}, tA); ok('logout', lo.s === 200);

    console.log('\n== RBAC ==');
    const stuAdm = await req('GET', '/api/admin/attempts', null, tA); ok('STUDENT → /admin negado 403', stuAdm.s === 403);
    const admOk = await req('GET', '/api/admin/attempts', null, tADM); ok('ADMIN → /admin 200', admOk.s === 200);
    const stuDashAdm = await req('GET', '/api/admin/dashboard', null, tA); ok('STUDENT → dashboard ADM 403', stuDashAdm.s === 403);

    console.log('\n== IDOR/BOLA ==');
    // A cria progresso; B tenta ler progresso de A
    const pa = await req('POST', '/api/progress', { user_id: idA, lesson_id: 2, status: 'IN_PROGRESS' }, tA); ok('A cria próprio progresso', pa.s === 200);
    const bReadA = await req('GET', `/api/progress/user/${idA}`, null, tB); ok('B lê progresso de A → 403', bReadA.s === 403);
    const bWriteA = await req('POST', '/api/progress', { user_id: idA, lesson_id: 2, status: 'IN_PROGRESS' }, tB); ok('B escreve progresso de A → 403', bWriteA.s === 403);
    const aReadB = await req('GET', `/api/progress/user/${idB}`, null, tA); ok('A lê progresso de B → 403', aReadB.s === 403);
    const admReadA = await req('GET', `/api/progress/user/${idA}`, null, tADM); ok('ADM lê progresso de A → 200', admReadA.s === 200);

    console.log('\n== CHECKPOINTS (gabarito protegido + trava) ==');
    const cp = await req('GET', '/api/checkpoints/lesson/2'); ok('checkpoints têm opções', cp.s === 200 && cp.b.checkpoints.length > 0 && cp.b.checkpoints[0].options.length > 0);
    const leak = JSON.stringify(cp.b); ok('sem is_correct/correctAnswer no GET', !/is_correct|correctAnswer|answerKey|gabarito|correct_option/i.test(leak));
    const cpId = cp.b.checkpoints[0].id;
    const cpOpts = cp.b.checkpoints[0].options;
    const unauthCp = await req('POST', `/api/checkpoints/${cpId}/submit`, { selected_option_id: cpOpts[0].id }); ok('submit sem token → 401', unauthCp.s === 401);
    // Limpa resposta anterior do usuário de teste (trava 1 resposta por checkpoint)
    try {
      const D0 = require('better-sqlite3');
      const db0 = new D0(path.join(__dirname, '..', 'training.db'));
      db0.prepare('DELETE FROM checkpoint_answers WHERE user_id=? AND checkpoint_id=?').run(idA, cpId);
      db0.close();
    } catch (e) { /* noop */ }
    const cpSub = await req('POST', `/api/checkpoints/${cpId}/submit`, { selected_option_id: cpOpts[0].id, user_id: idB }, tA);
    ok('submit usa token (ignora user_id spoof)', cpSub.s === 200 && typeof cpSub.b.correct === 'boolean');
    const cpDup = await req('POST', `/api/checkpoints/${cpId}/submit`, { selected_option_id: cpOpts[0].id }, tA);
    ok('checkpoint travado: 2º submit → 409', cpDup.s === 409);

    console.log('\n== PROGRESSO (persistência) ==');
    const done = await req('POST', '/api/training/lesson/2/complete', {}, tA); ok('concluir aula', done.s === 200);
    const gp = await req('GET', `/api/progress/user/${idA}`, null, tA); ok('progresso persiste na API', gp.s === 200 && gp.b.progress.length > 0);

    console.log('\n== SIMULADO ==');
    const qq = await req('GET', '/api/quiz/questions', null, tA);
    ok('30 questões sem gabarito', qq.s === 200 && qq.b.total === 30, `(${qq.b.total})`);
    ok('gabarito não exposto no simulado', !/is_correct|correctAnswer|answerKey|gabarito/i.test(JSON.stringify(qq.b)));
    // monta gabarito real via banco? Não — via API admin? Não. Busca correct via DB direto para teste controlado:
    const D = require('better-sqlite3');
    const db = new D(path.join(__dirname, '..', 'training.db'));
    const qrows = db.prepare('SELECT q.id, o.id oid, o.is_correct FROM questions q JOIN question_options o ON o.question_id=q.id ORDER BY q.order_num, o.order_num').all();
    const byQ = {}; qrows.forEach(r => { (byQ[r.id] = byQ[r.id] || []).push(r); });
    const qids = Object.keys(byQ).map(Number);
    const correctMap = {}; const wrongMap = {};
    qids.forEach(id => { correctMap[id] = byQ[id].find(o => o.is_correct === 1).oid; wrongMap[id] = byQ[id].find(o => o.is_correct === 0).oid; });
    const mkAnswers = (nCorrect) => { const a = {}; qids.forEach((id, i) => a[id] = i < nCorrect ? correctMap[id] : wrongMap[id]); return a; };
    // Limpa tentativas anteriores dos usuários de teste (limite 3 tentativas)
    try {
      db.prepare('DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id IN (?, ?))').run(idA, idB);
      db.prepare('DELETE FROM quiz_attempts WHERE user_id IN (?, ?)').run(idA, idB);
    } catch (e) { /* noop */ }
    const t22 = await req('POST', '/api/quiz/submit', { answers: mkAnswers(22) }, tA);
    ok('22 acertos → NÃO APROVADO (sem score)', t22.s === 200 && t22.b.result === 'NÃO APROVADO' && t22.b.score === undefined, JSON.stringify(t22.b));
    const partial = {}; qids.slice(0, 29).forEach((id, i) => partial[id] = correctMap[id]);
    const tPartial = await req('POST', '/api/quiz/submit', { answers: partial }, tA);
    ok('incompleto (29/30) → 400 obrigatório todas', tPartial.s === 400);
    const t23 = await req('POST', '/api/quiz/submit', { answers: mkAnswers(23) }, tA);
    ok('23 acertos → APROVADO', t23.s === 200 && t23.b.result === 'APROVADO');
    const t30blocked = await req('POST', '/api/quiz/submit', { answers: mkAnswers(30) }, tA);
    ok('aprovado não submete de novo → 403', t30blocked.s === 403);
    const spoof = await req('POST', '/api/quiz/submit', { answers: mkAnswers(0), score: 30, passed: 1 }, tB);
    ok('score manual ignorado (0 acertos → NÃO APROVADO)', spoof.s === 200 && spoof.b.result === 'NÃO APROVADO');
    const t30 = await req('POST', '/api/quiz/submit', { answers: mkAnswers(30) }, tB);
    ok('30 acertos → APROVADO', t30.s === 200 && t30.b.result === 'APROVADO');
    const myA = await req('GET', '/api/quiz/my-attempts', null, tA);
    ok('profissional vê só APROVADO/NÃO APROVADO', myA.s === 200 && !/\"score\"/.test(JSON.stringify(myA.b)));
    const cross = await req('GET', `/api/quiz/my-attempt/${t23.b.attempt_id}`, null, tB);
    ok('B acessa tentativa de A → 403', cross.s === 403);
    const admDet = await req('GET', `/api/admin/attempt/${t23.b.attempt_id}`, null, tADM);
    ok('ADM vê score/acertos/erros/respostas', admDet.s === 200 && admDet.b.attempt && admDet.b.attempt.score === 23 && admDet.b.answers.length === 30);
    const admFilter = await req('GET', '/api/admin/attempts?result=APROVADO', null, tADM);
    ok('ADM filtro resultado', admFilter.s === 200 && admFilter.b.attempts.length >= 2);
    db.close();

    console.log('\n== IMAGENS / ACESSIBILIDADE / RESPONSIVIDADE ==');
    const imgs = await req('GET', '/api/images'); ok('imagens classificadas', imgs.s === 200 && imgs.b.images.length > 0 && /REAL|DOCUMENTACAO_TECNICA|REFERENCIA_ILUSTRATIVA/.test(JSON.stringify(imgs.b)));
    ok('fluxograma preservado', JSON.stringify(imgs.b).toLowerCase().includes('fluxograma'));
    ok('dashboard acessível (labels/aria/foco)', dash.b.includes('aria-label') && dash.b.includes('<label'));
    ok('dashboard responsivo (media queries)', dash.b.includes('@media'));

  } finally {
    srv.kill();
  }
  console.log(`\n== RESULTADO: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
