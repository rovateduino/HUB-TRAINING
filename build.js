const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

const CHECKS = [
  { type: 'file', rel: 'server/index.cjs', label: 'Entry point Node/Express' },
  { type: 'dir',  rel: 'static',          label: 'Assets estáticos /static' },
  { type: 'file', rel: 'home.html',       label: 'Página inicial home.html' },
  { type: 'file', rel: 'dashboard.html',  label: 'SPA Dashboard dashboard.html' },
  { type: 'file', rel: 'validar.html',    label: 'Validação pública certificado' },
  { type: 'file', rel: 'package.json',    label: 'package.json' },
];

console.log('');
console.log('============================================');
console.log('   HUB TRAINING VERCEL BUILD (validacao)');
console.log('============================================');
console.log('');
console.log(`[INFO] Node runtime: ${process.version}`);
console.log(`[INFO] CWD: ${ROOT}`);
console.log('');

let failed = 0;
for (const check of CHECKS) {
  const p = path.join(ROOT, check.rel);
  const ok = check.type === 'file' ? fs.existsSync(p) : fs.existsSync(p) && fs.statSync(p).isDirectory();
  const mark = ok ? '✓' : '✗';
  console.log(` ${mark} [${check.type.toUpperCase()}] ${check.rel.padEnd(22)} — ${check.label}`);
  if (!ok) failed++;
}

console.log('');
console.log(`[RESUMO] ${CHECKS.length - failed}/${CHECKS.length} verificações OK`);

if (failed > 0) {
  console.error(`[BUILD FAIL] ${failed} arquivo(s)/pasta(s) obrigatórios faltando.`);
  process.exit(1);
}

console.log('[BUILD OK] Nenhuma operação runtime executada. Pronto para deploy Vercel.');
process.exit(0);
