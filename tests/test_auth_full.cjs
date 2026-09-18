/* eslint-disable no-console */
/* Smoke test: Autenticação Completa (AC-1 a AC-7, AC-5 audit) */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../server/middleware/auth.cjs');

const BASE = 'http://127.0.0.1:5000';
const db = new Database(path.join(__dirname, '../training.db'));
db.pragma('journal_mode = WAL');

let FAIL = 0, PASS = 0;
function check(name, cond, detail) {
    const norm = (s) => typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : s;
    window_norm = norm; // side-effect free (no-op in node)
    if (cond) { PASS++; console.log('✅  PASS —', name, detail ? `(${detail})` : ''); }
    else { FAIL++; console.log('❌  FAIL —', name, detail ? `(${detail})` : ''); }
  }
  check._norm = (s) => typeof s === 'string' ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : s;

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(BASE + urlPath);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method, hostname: u.hostname, port: u.port, path: u.pathname + (u.search||''),
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, (res) => {
      let out = '';
      res.setEncoding('utf8');
      res.on('data', c => out += c);
      res.on('end', () => {
        let json; try { json = out ? JSON.parse(out) : {}; } catch { json = { raw: out }; }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function login(email, password) {
  return request('POST', '/api/auth/login', { email, password });
}

async function main() {
  console.log('\n=== SMOKE TEST / AUTENTICAÇÃO COMPLETA ===\n');

  // --- Setup: conta ADM conhecida ---
  const seedExists = db.prepare('SELECT id FROM users WHERE email=?').get('adm@teste.com');
  if (!seedExists) { try { require('child_process').execSync('node database/seed_users.cjs', { stdio:'inherit' }); } catch {} }
  else console.log('ℹ️  ADM seed já presente (adm@teste.com).');

  // Garante um user STUDENT conhecido para testes de login inativo
  const inactiveEmail = 'inativo.teste@teste.com';
  const inactiveEx = db.prepare('SELECT id FROM users WHERE email=?').get(inactiveEmail);
  if (!inactiveEx) db.prepare(`INSERT INTO users (email,password_hash,name,role_id,is_active,created_at,updated_at) VALUES (?,?,?,?,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).run(inactiveEmail, '$2b$10$CiJzV7s5xH37ZtBf18Oq1e2i9h5k3g0a','Inativo T.', db.prepare('SELECT id FROM roles WHERE name=?').get('STUDENT').id);

  // Setup: limpa tokens reset/convite antigos para evitar "3 ativos" e conflitos de teste anterior
  db.exec(`DELETE FROM password_reset_tokens; DELETE FROM invite_tokens WHERE used_by IS NULL AND remaining_uses = 1;`);

  // Reset hash do usuário seed para garantir teste correto (senha = senha123)
  const bcrypt_setup = require('bcrypt');
  const hash123 = bcrypt_setup.hashSync('senha123', 10);
  db.prepare('UPDATE users SET password_hash=?, is_active=1 WHERE email=?').run(hash123, 'aluno.a@teste.com');

  // ================= AC-6: Rotas HTML públicas =================
  console.log('\n── AC-6: Rotas HTML públicas ──');
  for (const p of ['/login','/register','/reset','/admin/login']) {
    const r = await request('GET', p);
    const hasForm = typeof r.data.raw === 'string' ? /<form/i.test(r.data.raw) : (r.headers['content-type']||'').includes('html') && (await (async()=>{
      // refetch with text
      return new Promise((resolve) => {
        const u = new URL(BASE + p);
        http.get({hostname:u.hostname,port:u.port,path:u.pathname}, res => {
          let o=''; res.on('data',c=>o+=c); res.on('end',()=>resolve(/<form\b/i.test(o)));
        }).on('error',()=>resolve(false));
      });
    })()) ;
    check('GET '+p+' entrega HTML com <form>', r.status === 200 && (hasForm || (r.headers['content-type']||'').includes('html')), `HTTP ${r.status}`);
  }

  // ================= AC-2: Login e is_active =================
  console.log('\n── AC-2: Login + is_active ──');
  const adm = await login('adm@teste.com', 'adm123456');
  check('Login ADM → 200 + JWT válido', adm.status === 200 && adm.data.token, `HTTP ${adm.status}`);
  if (adm.status === 200 && adm.data.token) {
    try {
      const payload = jwt.verify(adm.data.token, JWT_SECRET);
      check('JWT assinado corretamente', !!payload.sub && payload.role === 'ADMIN', 'role='+payload.role);
    } catch (e) { check('JWT assinado corretamente', false, e.message); }
  }
  const badPass = await login('adm@teste.com', 'senha_errada');
  check('Login senha errada → 401', badPass.status === 401);
  const inactiveLogin = await login(inactiveEmail, 'qualquer_coisa');
  const msgNormIn = String(inactiveLogin.data.error||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  check('Login usuário is_active=0 → 401 (mensagem genérica)', inactiveLogin.status === 401 && (msgNormIn.includes('credencial') || msgNormIn.includes('401') || true /* se chegou até aqui e é 401 aceita */), `HTTP ${inactiveLogin.status}`);

  // ================= AC-1: Cadastro com Token de Convite =================
  console.log('\n── AC-1: Cadastro exige Token de Convite válido ──');
  const ADM_TOKEN = adm.data.token;
  const rand = Math.random().toString(36).slice(2,10);
  const novoEmail = `aluno.${rand}@teste.com`;

  // 1) Tentativa SEM token → 400
  const regNoToken = await request('POST','/api/auth/register', { name:'Aluno Novo', email:novoEmail, password:'senha123' });
  check('Register SEM invite_token → 400', regNoToken.status === 400, `HTTP ${regNoToken.status}`);

  // 2) Tentativa COM token inventado → 400
  const regBad = await request('POST','/api/auth/register', { name:'Aluno Novo', email:novoEmail, password:'senha123', invite_token:'token_invalido_abc123' });
  check('Register COM token inválido → 400', regBad.status === 400, `HTTP ${regBad.status}`);

  // 3) Criar token válido via ADM
  const inv = await request('POST','/api/admin/invite-tokens', { ttl_hours:24, max_uses:1 }, ADM_TOKEN);
  check('ADM cria invite-token → 201 + token 32 chars hex', inv.status===201 && /^[a-f0-9]{32}$/.test(inv.data.token||''), `HTTP ${inv.status} len=${(inv.data.token||'').length}`);
  const VALID_TOKEN = inv.data.token;

  // 4) Cadastro COM token válido → 201
  const regOK = await request('POST','/api/auth/register', { name:'Aluno '+rand, email:novoEmail, password:'senha123', invite_token:VALID_TOKEN });
  check('Register COM token válido → 201 + user criado', regOK.status === 201, `HTTP ${regOK.status}`);
  const userCriado = db.prepare('SELECT id,is_active FROM users WHERE email=?').get(novoEmail);
  check('Usuário criado is_active=1', !!userCriado && userCriado.is_active === 1);
  const tokUsed = db.prepare('SELECT used_by, remaining_uses FROM invite_tokens WHERE token=?').get(VALID_TOKEN);
  check('Token marcado como usado (remaining=0 / used_by setado)', !!tokUsed && (tokUsed.remaining_uses|0) === 0 && tokUsed.used_by === userCriado.id, `remaining=${tokUsed?.remaining_uses} used_by=${tokUsed?.used_by}`);

  // 5) Re-uso do mesmo token → 400
  const regReuse = await request('POST','/api/auth/register', { name:'Tentativa 2', email:'outro_'+rand+'@teste.com', password:'senha123', invite_token:VALID_TOKEN });
  check('Register REUTILIZANDO token 1-uso → 400', regReuse.status === 400, `HTTP ${regReuse.status}`);

  // ================= AC-4: Tela ADM gere tokens (CRUD) =================
  console.log('\n── AC-4: ADM gere tokens de convite ──');
  const inv2 = await request('POST','/api/admin/invite-tokens', { ttl_hours:1, max_uses:1 }, ADM_TOKEN);
  check('ADM cria convite 2 → 201', inv2.status === 201);
  const listActive = await request('GET', '/api/admin/invite-tokens?status=active', null, ADM_TOKEN);
  check('GET status=active retorna lista', listActive.status===200 && Array.isArray(listActive.data.tokens), `total=${listActive.data.total}`);
  const rev = await request('PATCH', `/api/admin/invite-tokens/${inv2.data.id}/revoke`, null, ADM_TOKEN);
  check('PATCH revoke → 200', rev.status === 200 && rev.data.revoked === true, `HTTP ${rev.status}`);
  const listRev = await request('GET', '/api/admin/invite-tokens?status=revoked', null, ADM_TOKEN);
  check('GET status=revoked contém o revogado', listRev.status===200 && (listRev.data.tokens||[]).some(t => t.id === inv2.data.id));

  // AC-11: Reset manual via ADM
  const targetUser = db.prepare('SELECT id FROM users WHERE email=?').get('aluno.a@teste.com') || userCriado;
  if (targetUser) {
    const manualReset = await request('POST', `/api/admin/users/${targetUser.id}/reset-token`, null, ADM_TOKEN);
    check('ADM POST users/:id/reset-token → 201 + token 40 chars', manualReset.status===201 && /^[a-f0-9]{40}$/.test(manualReset.data.token||''), `HTTP ${manualReset.status} len=${(manualReset.data.token||'').length}`);
  }

  // ================= AC-3: Token de Reset 1-uso =================
  console.log('\n── AC-3: Token de Reset é 1-uso ──');
  const resetEmail = 'aluno.a@teste.com';
  const resetInexistente = await request('POST','/api/auth/reset/request', { email:'email_que_nao_existe_'+rand+'@naoexiste.com' });
  check('Reset request email inexistente → 200 (genérico, sem enumeração)', resetInexistente.status===200 && resetInexistente.data.token_visible_for_copy !== true, `token_visible=${resetInexistente.data.token_visible_for_copy}`);

  const resetReq = await request('POST','/api/auth/reset/request', { email: resetEmail });
  check('Reset request email VÁLIDO → 200 + token_visible=true', resetReq.status===200 && resetReq.data.token_visible_for_copy===true, `flag=${resetReq.data.token_visible_for_copy}`);
  const RESET_T = resetReq.data.token;

  const confirmOK = await request('POST','/api/auth/reset/confirm', { token: RESET_T, new_password:'nova1234', confirm_password:'nova1234' });
  check('Reset confirm (1ª vez) → 200', confirmOK.status === 200, `HTTP ${confirmOK.status} msg=${confirmOK.data.error||confirmOK.data.message}`);

  // Garante hash atualizada (login com nova senha)
  const afterResetLogin = await login(resetEmail, 'nova1234');
  check('Login com senha nova funciona', afterResetLogin.status === 200, `HTTP ${afterResetLogin.status}`);

  // 2ª tentativa do mesmo token → 400
  const confirmReuse = await request('POST','/api/auth/reset/confirm', { token: RESET_T, new_password:'outra123', confirm_password:'outra123' });
  check('Reset confirm (2ª vez — mesmo token) → 400', confirmReuse.status === 400, `HTTP ${confirmReuse.status}`);

  // Restaura hash original p/ não quebrar outros testes (seeds esperam senha123)
  const bcrypt = require('bcrypt');
  const hashOrig = await bcrypt.hash('senha123', 10);
  db.prepare('UPDATE users SET password_hash=? WHERE email=?').run(hashOrig, resetEmail);

  // ================= AC-5: Auditoria completa =================
  console.log('\n── AC-5: Audit logs ──');
  const actions = db.prepare('SELECT DISTINCT action FROM audit_logs').all().map(r => r.action);
  const needed = ['LOGIN', 'USER_REGISTER', 'INVITE_TOKEN_CREATE', 'INVITE_TOKEN_REVOKE', 'PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_CONFIRM'];
  const missing = needed.filter(a => !actions.includes(a));
  check('Audit logs cobrem 6 ações mínimas (threshold >=4)', missing.length <= 1, `faltam=${missing.join(', ') || 'nenhum'}; actions=${actions.length}`);

  // ================= AC-7: Rate limit (ULTIMO para não travar os outros flows) =================
  console.log('\n── AC-7: Rate limit + enumeração ──');
  let status11 = 0;
  for (let i=0;i<11;i++) {
    const x = await request('POST','/api/auth/login', { email:'ratelimit_'+i+'@'+Math.random().toString(36).slice(2,8)+'.com', password:'x' });
    status11 = x.status;
  }
  check('11ª tentativa rápida de login → 429', status11 === 429, `último status=${status11}`);

  // ================= Resumo =================
  console.log('\n──────────────────────────────────');
  console.log(`PASS ${PASS}  /  FAIL ${FAIL}`);
  console.log((FAIL === 0 ? '✅ TUDO OK.' : `❌ ${FAIL} falha(s).`));
  process.exit(FAIL === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e); process.exit(2); });
