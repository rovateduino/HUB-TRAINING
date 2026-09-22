require('dotenv').config();
const { initFirebase, getFirestore } = require('../server/services/firebase.cjs');
(async () => {
  await initFirebase();
  const db = getFirestore();
  const s = await db.collection('certificates').where('certificate_number', '==', 'HUB-2026-000004').get();
  const wd = s.docs[0].data().workload_detail;
  const half = Math.ceil(wd.length / 2);
  console.log('total:', wd.length, '| coluna L:', wd.slice(0, half).length, '| coluna R:', wd.slice(half).length, '+ TOTAL');
  console.log('L:', wd[0].order + '-' + wd[half - 1].order, '| R:', wd[half].order + '-' + wd[wd.length - 1].order);
  const noHours = wd.filter((m) => !m.hours);
  console.log('sem carga horaria:', noHours.length ? noHours.map((m) => m.order).join(',') : 'nenhum');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
