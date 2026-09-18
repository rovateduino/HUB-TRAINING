// FASE FINAL — APROVADO ≠ APTO ≠ CERTIFICADO. Emissão exclusiva do ADMIN.
// Cobre §29 (1-29 automatizáveis), §30 (e2e), §31 (bloqueio NAO_APTO), §32 (emissão manual).
// Itens 30/31 de responsividade: checagem estática + inspeção visual manual.
const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 5021;
function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const o = { hostname: '127.0.0.1', port: PORT, path: p, method, headers: { 'Content-Type': 'application/json' } };
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
const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  console.log('== SUBINDO SERVIDOR (isolado) ==');
  const srv = spawn('node', ['server/index.cjs'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(PORT) } });
  srv.stderr.on('data', () => {});
  await sleep(2500);

  const D = require('better-sqlite3');
  const db = new D(path.join(__dirname, '..', 'training.db'));
  try {
    const la = await req('POST', '/api/auth/login', { email: 'aluno.a@teste.com', password: 'senha123' });
    const lb = await req('POST', '/api/auth/login', { email: 'aluno.b@teste.com', password: 'senha123' });
    const le = await req('POST', '/api/auth/login', { email: 'avaliador@teste.com', password: 'aval123456' });
    const ladm = await req('POST', '/api/auth/login', { email: 'adm@teste.com', password: 'adm123456' });
    ok('logins A/B/EVAL/ADM', la.s === 200 && lb.s === 200 && le.s === 200 && ladm.s === 200);
    const tA = la.b.token, tB = lb.b.token, tE = le.b.token, tADM = ladm.b.token;
    const idA = la.b.user.id, idB = lb.b.user.id, idE = le.b.user.id;
    ok('papel avaliador', le.b.user.role === 'TECHNICAL_EVALUATOR');

    // usuário fresco C (spoof real + 30/30)
    const bcrypt = require('bcrypt');
    const hashC = bcrypt.hashSync('senha123', 10);
    const ridS = db.prepare("SELECT id FROM roles WHERE name='STUDENT'").get().id;
    db.prepare("DELETE FROM users WHERE email='aluno.c@teste.com'").run();
    const idC = db.prepare('INSERT INTO users (email,password_hash,name,identifier,role_id,is_active) VALUES (?,?,?,?,?,1)')
      .run('aluno.c@teste.com', hashC, 'Aluno C', 'PROF-C', ridS).lastInsertRowid;
    const lc = await req('POST', '/api/auth/login', { email: 'aluno.c@teste.com', password: 'senha123' });
    const tC = lc.b.token;

    for (const id of [idA, idB, idC, idE]) {
      db.prepare('DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id=?)').run(id);
      db.prepare('DELETE FROM quiz_attempts WHERE user_id=?').run(id);
      db.prepare('DELETE FROM lesson_progress WHERE user_id=?').run(id);
      db.prepare('DELETE FROM checkpoint_answers WHERE user_id=?').run(id);
      db.prepare('DELETE FROM practical_evaluations WHERE user_id=?').run(id);
      db.prepare('DELETE FROM certificates WHERE user_id=?').run(id);
    }

    const qrows = db.prepare('SELECT q.id, o.id oid, o.is_correct FROM questions q JOIN question_options o ON o.question_id=q.id ORDER BY q.order_num, o.order_num').all();
    const byQ = {}; qrows.forEach(r => { (byQ[r.id] = byQ[r.id] || []).push(r); });
    const qids = Object.keys(byQ).map(Number);
    const cmap = {}, wmap = {};
    qids.forEach(id => { cmap[id] = byQ[id].find(o => o.is_correct === 1).oid; wmap[id] = byQ[id].find(o => o.is_correct === 0).oid; });
    const mk = (n) => { const a = {}; qids.forEach((id, i) => a[id] = i < n ? cmap[id] : wmap[id]); return a; };
    const lessons = db.prepare('SELECT id FROM training_lessons ORDER BY id').all().map(r => r.id);
    const cps = db.prepare('SELECT c.id, o.id oid FROM lesson_checkpoints c JOIN checkpoint_options o ON o.checkpoint_id=c.id AND o.is_correct=1').all();
    async function completeCartilha(t) {
      for (const lid of lessons) await req('POST', `/api/training/lesson/${lid}/complete`, {}, t);
      for (const c of cps) await req('POST', `/api/checkpoints/${c.id}/submit`, { selected_option_id: c.oid }, t);
    }

    // ---- §29.1-4 teoria ----
    ok('1. 22/30 = NÃO APROVADO', (await req('POST', '/api/quiz/submit', { answers: mk(22) }, tA)).b.result === 'NÃO APROVADO');
    const spoof = await req('POST', '/api/quiz/submit', { answers: mk(0), score: 30, passed: 1 }, tC);
    ok('14. STUDENT altera score = ignorado (0 acertos)', spoof.s === 200 && spoof.b.result === 'NÃO APROVADO', JSON.stringify(spoof.b));
    await completeCartilha(tA);
    // ---- §29.5: 17/17 + 22/30 = bloqueado ----
    const s5 = await req('GET', '/api/certificates/my', null, tA);
    ok('5. 17/17 + 22/30 = BLOQUEADO (sem certificado)', s5.s === 200 && s5.b.certificate === null && s5.b.status !== 'READY_FOR_ADMIN_CERTIFICATION', `status=${s5.b.status}`);
    ok('2. 23/30 = APROVADO TEÓRICO', (await req('POST', '/api/quiz/submit', { answers: mk(23) }, tA)).b.result === 'APROVADO');
    ok('3. 27/30 = APROVADO TEÓRICO', (await req('POST', '/api/quiz/submit', { answers: mk(27) }, tB)).b.result === 'APROVADO');
    ok('4. 30/30 = APROVADO TEÓRICO', (await req('POST', '/api/quiz/submit', { answers: mk(30) }, tC)).b.result === 'APROVADO');
    // ---- §29.6: sem prática = bloqueado; emissão admin prematura = 403 ----
    const s6 = await req('GET', '/api/certificates/my', null, tA);
    ok('6. sem prática = AGUARD. PRÁTICA, sem certificado', s6.b.status === 'PRACTICAL_EVALUATION_PENDING' && s6.b.certificate === null, s6.b.status);
    const preIssue = await req('POST', '/api/admin/certificates/issue', { user_id: idA }, tADM);
    ok('6b. emissão prematura = 403', preIssue.s === 403, JSON.stringify(preIssue.b.status));
    // ---- §29.7: NAO_APTO bloqueia ----
    const ev1 = await req('POST', '/api/practical', { user_id: idA, evaluation_date: TODAY, result: 'NAO_APTO', observations: 'Reforçar medições.', criteria: ['safety_attention'], evaluator_title: 'Técnico de campo' }, tE);
    ok('7a. prática registrada NAO_APTO', ev1.s === 201 && ev1.b.evaluation.result === 'NAO_APTO');
    const s7 = await req('GET', '/api/certificates/my', null, tA);
    ok('7. NAO_APTO = BLOQUEADO', s7.b.status === 'PRACTICAL_NOT_APPROVED' && s7.b.certificate === null, s7.b.status);
    ok('7b. emissão com NAO_APTO = 403', (await req('POST', '/api/admin/certificates/issue', { user_id: idA }, tADM)).s === 403);
    // ---- §29.8/9: APTO → pronto, mas SEM ação admin = inexistente (§32) ----
    const ev2 = await req('POST', '/api/practical', { user_id: idA, evaluation_date: TODAY, result: 'APTO', observations: 'Bom desempenho.', criteria: ['infra_understanding', 'safety_attention'], evaluator_title: 'Técnico de campo' }, tE);
    ok('8a. prática APTO', ev2.s === 200 && ev2.b.evaluation.result === 'APTO');
    const s8 = await req('GET', '/api/certificates/my', null, tA);
    ok('8. APTO = PRONTO PARA CERTIFICAÇÃO', s8.b.status === 'READY_FOR_ADMIN_CERTIFICATION', s8.b.status);
    ok('9/32. sem ação ADMIN = certificado inexistente no banco', db.prepare('SELECT COUNT(*) c FROM certificates WHERE user_id=?').get(idA).c === 0);
    // ---- §29.10: ADMIN emite ----
    const issue = await req('POST', '/api/admin/certificates/issue', { user_id: idA }, tADM);
    const numA = issue.b && issue.b.certificate && issue.b.certificate.certificate_number;
    ok('10. ADMIN EMITE = criado', issue.s === 201 && /^HUB-\d{4}-\d{6}$/.test(numA || ''), numA);
    const certIdA = db.prepare('SELECT id FROM certificates WHERE certificate_number=?').get(numA).id;
    const pv = await req('GET', `/api/admin/certificates/${certIdA}/preview`, null, tADM);
    ok('10b. ADMIN preview p/ PDF do aluno', pv.s === 200 && String(pv.b.certificate.qr_data_url || '').startsWith('data:image/png')
      && Array.isArray(pv.b.certificate.workload_detail) && pv.b.certificate.workload_detail.length === 17
      && String(pv.b.certificate.validation_url || '').endsWith('/validar/' + numA));
    ok('10c. STUDENT sem preview alheio = 403', (await req('GET', `/api/admin/certificates/${certIdA}/preview`, null, tB)).s === 403);
    // ---- §29.11/12: emissão negada ----
    ok('11. STUDENT emite = 403', (await req('POST', '/api/admin/certificates/issue', { user_id: idB }, tA)).s === 403);
    ok('12. EVALUATOR emite = 403', (await req('POST', '/api/admin/certificates/issue', { user_id: idB }, tE)).s === 403);
    // ---- OVERRIDE ADMIN: editar progresso + liberação excepcional ----
    const admLesson = await req('POST', '/api/progress', { user_id: idC, lesson_id: lessons[0], status: 'COMPLETED', progress: 100 }, tADM);
    ok('ADM edita cartilha alheia = 200', admLesson.s === 200);
    ok('STUDENT edita cartilha alheia = 403', (await req('POST', '/api/progress', { user_id: idC, lesson_id: lessons[0], status: 'COMPLETED', progress: 100 }, tA)).s === 403);
    const mkCp = await req('POST', '/api/admin/checkpoints/complete', { user_id: idC }, tADM);
    ok('ADM marca checkpoints verificados', mkCp.s === 200 && mkCp.b.completed === 19, `n=${mkCp.b.completed}`);
    ok('STUDENT marca checkpoints = 403', (await req('POST', '/api/admin/checkpoints/complete', { user_id: idC }, tC)).s === 403);
    const mkCp2 = await req('POST', '/api/admin/checkpoints/complete', { user_id: idC }, tADM);
    ok('checkpoints idempotente (2ª vez = 0)', mkCp2.s === 200 && mkCp2.b.completed === 0);
    await completeCartilha(tC);
    const noReason = await req('POST', '/api/admin/certificates/issue', { user_id: idC, force: true, reason: 'curta' }, tADM);
    ok('excepcional sem justificativa = 400', noReason.s === 400);
    const stuForce = await req('POST', '/api/admin/certificates/issue', { user_id: idC, force: true, reason: 'tentativa de aluno burlando' }, tC);
    ok('excepcional por STUDENT = 403', stuForce.s === 403);
    const force = await req('POST', '/api/admin/certificates/issue', { user_id: idC, force: true, reason: 'Experiência comprovada em campo, validada pela gestão.' }, tADM);
    const numC = force.b && force.b.certificate && force.b.certificate.certificate_number;
    ok('excepcional com justificativa = 201', force.s === 201 && force.b.forced === true && /^HUB-\d{4}-\d{6}$/.test(numC || ''), numC);
    const myC = await req('GET', '/api/certificates/my', null, tC);
    ok('excepcional honesto (teoria real + prática —)', myC.b.certificate.theory.result === 'APROVADO' && myC.b.certificate.theory.score === 30
      && myC.b.certificate.practical === null && myC.b.certificate.exceptional === true, JSON.stringify({ t: myC.b.certificate.theory.result, p: myC.b.certificate.practical }));
    const vC = await req('GET', '/api/certificates/validate/' + numC, null, null);
    ok('excepcional válido publicamente', vC.b.status === 'VALID' && vC.b.certificate.practical === null);
    const noteRow = db.prepare('SELECT issue_note FROM certificates WHERE certificate_number=?').get(numC);
    const audF = db.prepare("SELECT description FROM audit_logs WHERE action='CERTIFICATE_ISSUED' AND entity_id=(SELECT id FROM certificates WHERE certificate_number=?)").get(numC);
    ok('justificativa registrada (banco + auditoria)', noteRow && noteRow.issue_note.includes('Experiência comprovada') && audF && audF.description.includes('LIBERAÇÃO EXCEPCIONAL'), (audF && audF.description || '').slice(0, 80));
    // ---- §29.13-15: alterações negadas ----
    ok('13. STUDENT altera avaliação = 403', (await req('POST', '/api/practical', { user_id: idB, evaluation_date: TODAY, result: 'APTO' }, tA)).s === 403);
    const evScore = await req('POST', '/api/quiz/submit', { answers: mk(0), score: 30 }, tE);
    ok('15. EVALUATOR não forja score', evScore.b.result === 'NÃO APROVADO');
    ok('15b. EVALUATOR não altera progresso alheio', (await req('POST', '/api/progress', { user_id: idA, lesson_id: 2, status: 'IN_PROGRESS' }, tE)).s === 403);
    // ---- §29.16 IDOR ----
    ok('16. IDOR/BOLA bloqueado', (await req('GET', `/api/practical/user/${idA}`, null, tB)).s === 403);
    // ---- §29.17 duplicação ----
    let dup = false;
    try { db.prepare(`INSERT INTO certificates (certificate_number, seq, user_id, training_name, modality, score, total, percentage, completion_date, issue_date) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(numA, 999999, idB, 'X', 'Y', 30, 30, 100, TODAY, TODAY); } catch (e) { dup = /UNIQUE|unique/i.test(e.message || ''); }
    ok('17. duplicação de código bloqueada', dup);
    // ---- §29.18/19/20 validação ----
    const myA = await req('GET', '/api/certificates/my', null, tA);
    const certA = myA.b.certificate;
    ok('18. QR funcional', String(certA.qr_data_url || '').startsWith('data:image/png') && String(certA.validation_url || '').endsWith('/validar/' + numA));
    const vOk = await req('GET', '/api/certificates/validate/' + numA, null, null);
    ok('19. validação pública', vOk.s === 200 && vOk.b.status === 'VALID'
      && vOk.b.certificate.result_final === 'TREINAMENTO CONCLUÍDO'
      && vOk.b.certificate.theory.score === 23 && vOk.b.certificate.practical.result === 'APTO', JSON.stringify(vOk.b.certificate.theory));
    ok('20. inexistente = 404', (await req('GET', '/api/certificates/validate/HUB-2026-999999', null, null)).s === 404);
    // ---- §29.21-24 PDF ----
    const js = fs.readFileSync(path.join(__dirname, '..', 'static', 'dashboard.js'), 'utf-8');
    const css = fs.readFileSync(path.join(__dirname, '..', 'static', 'dashboard.css'), 'utf-8');
    ok('21. PDF pág.1 (layout referência)', /CERTIFICADO DE CONCLUSÃO/.test(js) && /TREINAMENTO CONCLUÍDO/.test(js) && /CONTEÚDO PROGRAMÁTICO/.test(js) && /cert-sheet/.test(css));
    ok('22. PDF pág.2 (histórico)', /HISTÓRICO ACADÊMICO/.test(js) && /cert-sheet2/.test(css) && /page-break-after/.test(css));
    ok('22b. impressão exata 2 págs (display:none + adminPrintWrap)', /printing-cert/.test(js) && /printing-admin/.test(js) && /adminPrintWrap/.test(js) && /adminPrintCertificate/.test(js)
      && /body\.printing-admin \.app-container/.test(css) && !/body \* \{ visibility: hidden/.test(css));
    ok('23. QR no PDF', /qr_data_url/.test(js));
    ok('24. dados do PDF corretos', certA.theory.score === 23 && certA.practical.result === 'APTO' && certA.practical.evaluator_name === 'Avaliador Técnico'
      && Array.isArray(certA.workload_detail) && certA.workload_detail.length === 17, `eval=${certA.practical.evaluator_name}`);
    // ---- §29.25-28 persistência/auditoria ----
    const evRow = db.prepare('SELECT * FROM practical_evaluations WHERE user_id=?').get(idA);
    ok('25. avaliação persistida', !!evRow && evRow.result === 'APTO');
    ok('26. avaliador persistido', evRow.evaluator_name === 'Avaliador Técnico' && Number(evRow.evaluator_id) > 0, evRow.evaluator_name);
    const certRow = db.prepare('SELECT * FROM certificates WHERE user_id=?').get(idA);
    ok('27. emissor ADMIN persistido', Number(certRow.issued_by) > 0 && Number(certRow.practical_evaluation_id) === Number(evRow.id));
    const acts = db.prepare("SELECT DISTINCT action FROM audit_logs WHERE action LIKE 'PRACTICAL%' OR action LIKE 'CERTIFICATE%'").all().map(r => r.action);
    ok('28. auditoria registrada', ['PRACTICAL_EVALUATION_CREATED', 'PRACTICAL_EVALUATION_APPROVED', 'CERTIFICATE_ISSUED'].every(a => acts.includes(a)), acts.join(','));
    // ---- reemissão após revogação ----
    ok('revogar funciona', (await req('POST', `/api/admin/certificates/${certIdA}/revoke`, {}, tADM)).s === 200);
    ok('revogado mantém histórico', (await req('GET', '/api/certificates/validate/' + numA, null, null)).b.status === 'REVOKED');
    const sAft = await req('GET', '/api/certificates/my', null, tA);
    ok('após revogar volta a PRONTO + lista revogados', sAft.b.status === 'READY_FOR_ADMIN_CERTIFICATION' && (sAft.b.revoked || []).includes(numA), sAft.b.status);
    const re = await req('POST', '/api/admin/certificates/issue', { user_id: idA }, tADM);
    const numA2 = re.b && re.b.certificate && re.b.certificate.certificate_number;
    ok('reemissão gera número novo', re.s === 201 && numA2 && numA2 !== numA, numA2);
    ok('número antigo segue REVOGADO (sem reutilizar)', (await req('GET', '/api/certificates/validate/' + numA, null, null)).b.status === 'REVOKED');
    ok('número novo é VÁLIDO', (await req('GET', '/api/certificates/validate/' + numA2, null, null)).b.status === 'VALID');
    // ---- zerar tentativas ----
    const rs = await req('POST', `/api/admin/users/${idC}/reset-attempts`, {}, tADM);
    ok('ADM zera tentativas', rs.s === 200 && rs.b.deleted === 2, JSON.stringify(rs.b));
    ok('STUDENT zera tentativas = 403', (await req('POST', `/api/admin/users/${idC}/reset-attempts`, {}, tC)).s === 403);
    // ---- overview da avaliação prática ----
    const ovE = await req('GET', '/api/practical/overview', null, tE);
    ok('overview avaliador lista todos', ovE.s === 200 && ovE.b.total >= 2 && Array.isArray(ovE.b.professionals), `n=${ovE.b.total}`);
    const ovA = await req('GET', '/api/practical/overview', null, tADM);
    ok('overview admin 200', ovA.s === 200);
    ok('overview STUDENT = 403', (await req('GET', '/api/practical/overview', null, tA)).s === 403);
    // ---- §29.29 persistência login ----
    const la2 = await req('POST', '/api/auth/login', { email: 'aluno.a@teste.com', password: 'senha123' });
    ok('29. relogin preserva (número da reemissão)', (await req('GET', '/api/certificates/my', null, la2.b.token)).b.certificate.certificate_number === (typeof numA2 !== 'undefined' ? numA2 : numA));
    // ---- §30 e2e com B (30/30 → APTO → emissão → válido) + §31 bloqueio antes ----
    await completeCartilha(tB);
    await req('POST', '/api/practical', { user_id: idB, evaluation_date: TODAY, result: 'NAO_APTO', criteria: [] }, tE);
    const sBneg = await req('GET', '/api/certificates/my', null, tB);
    ok('31. 30/30 + NAO_APTO = CERTIFICADO BLOQUEADO', sBneg.b.status === 'PRACTICAL_NOT_APPROVED' && sBneg.b.certificate === null
      && (await req('POST', '/api/admin/certificates/issue', { user_id: idB }, tADM)).s === 403, sBneg.b.status);
    await req('POST', '/api/practical', { user_id: idB, evaluation_date: TODAY, result: 'APTO', criteria: ['safety_attention'], evaluator_title: 'Técnico de campo' }, tE);
    const sB = await req('GET', '/api/certificates/my', null, tB);
    ok('30a. B PRONTO (30/30+APTO)', sB.b.status === 'READY_FOR_ADMIN_CERTIFICATION', sB.b.status);
    const issB = await req('POST', '/api/admin/certificates/issue', { user_id: idB }, tADM);
    const numB = issB.b.certificate.certificate_number;
    ok('30b. emissão B + número distinto', issB.s === 201 && numB !== numA, numB);
    const vB = await req('GET', '/api/certificates/validate/' + numB, null, null);
    ok('30c. B CERTIFICADO VÁLIDO', vB.b.status === 'VALID' && vB.b.certificate.practical.result === 'APTO');
    ok('30d. página /validar 200', (await req('GET', '/validar/' + numB, null, null)).s === 200);
    // ---- gabarito preservado ----
    const qq = await req('GET', '/api/quiz/questions', null, tA);
    ok('gabarito protegido', qq.s === 200 && !/is_correct|correctAnswer|gabarito/i.test(JSON.stringify(qq.b)));
    // ---- menu lateral recolhível ----
    const htmlDash = fs.readFileSync(path.join(__dirname, '..', 'dashboard.html'), 'utf-8');
    const cssDash = fs.readFileSync(path.join(__dirname, '..', 'static', 'dashboard.css'), 'utf-8');
    const jsDash = fs.readFileSync(path.join(__dirname, '..', 'static', 'dashboard.js'), 'utf-8');
    ok('menu recolhível (botão + estado persistido)', /sidebar-toggle/.test(htmlDash) && /toggleSidebar/.test(jsDash)
      && /sidebar-collapsed/.test(cssDash) && /hub_sidebar_collapsed/.test(jsDash) && /menu-btn/.test(htmlDash));
    // ---- limpeza ----
    const leId = db.prepare("SELECT id FROM users WHERE email='avaliador@teste.com'").get().id;
    for (const id of [idA, idB, idC, leId]) {
      try { db.prepare('DELETE FROM quiz_answers WHERE attempt_id IN (SELECT id FROM quiz_attempts WHERE user_id=?)').run(id); } catch (e) {}
      try { db.prepare('DELETE FROM quiz_attempts WHERE user_id=?').run(id); } catch (e) {}
      try { db.prepare('DELETE FROM lesson_progress WHERE user_id=?').run(id); } catch (e) {}
      try { db.prepare('DELETE FROM checkpoint_answers WHERE user_id=?').run(id); } catch (e) {}
      try { db.prepare('DELETE FROM practical_evaluations WHERE user_id=? OR evaluator_id=?').run(id, id); } catch (e) {}
      try { db.prepare('DELETE FROM certificates WHERE user_id=?').run(id); } catch (e) {}
    }
    db.prepare("DELETE FROM users WHERE email='aluno.c@teste.com'").run();
    db.close();
  } finally {
    srv.kill();
  }
  console.log(`\n== RESULTADO: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
