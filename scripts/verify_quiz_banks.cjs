require('dotenv').config();
const { initFirebase } = require('../server/services/firebase.cjs');
const { listQuestions } = require('../server/repositories/quizRepo.cjs');
(async () => {
  await initFirebase();
  const bank = (c) => (/^NR-10/.test(c) ? 'nr10' : (/^AC(\s|-|$)/.test(c) ? 'ac' : 'base'));
  for (const run of [1, 2]) {
    const qs = await listQuestions(30);
    const n = { base: 0, nr10: 0, ac: 0 };
    let noOpts = 0;
    const ids = [];
    for (const q of qs) {
      n[bank(String(q.category || ''))]++;
      if (!q.options || !q.options.length) noOpts++;
      ids.push(String(q.id));
    }
    console.log(`run${run}: total=${qs.length} base=${n.base} nr10=${n.nr10} ac=${n.ac} semOpcoes=${noOpts}`);
    if (run === 1) global.__ids = ids;
    else console.log('deterministico:', JSON.stringify(ids) === JSON.stringify(global.__ids) ? 'OK' : 'FAIL');
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
