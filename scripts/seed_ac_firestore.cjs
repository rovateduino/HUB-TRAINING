#!/usr/bin/env node
/**
 * Seed AC (Ar Condicionado) → Firestore (fonte primária do site).
 *
 * Lê o mini-curso AC do training.db (SQLite, populado via `npm run seed:ac`)
 * e replica APENAS as linhas AC para o Firestore, usando os mesmos IDs do
 * SQLite como doc IDs — o mesmo padrão de scripts/seed_nr10_firestore.cjs.
 *
 * Idempotente: pula docs que já existem (a menos que --force).
 * NÃO apaga nada e NÃO toca no simulado principal (questions order 1-30).
 *
 * Uso:
 *   node scripts/seed_ac_firestore.cjs [--force] [--dry-run]
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const argvArr = process.argv.slice(2);
const args = new Set(argvArr);
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('[ERRO] better-sqlite3 não instalado. Rode: npm i better-sqlite3 --no-save');
  process.exit(1);
}

function coerce(table, row) {
  const out = {};
  for (const k of Object.keys(row)) {
    const v = row[k];
    if (v === null || v === undefined) { out[k] = null; continue; }
    if ((k === 'is_active' || k === 'is_correct') && table !== 'users') {
      out[k] = v === true || v === 1 || String(v).trim() === '1';
      continue;
    }
    out[k] = v;
  }
  return out;
}

async function upsert(col, id, payload, counters, label) {
  const ref = col.doc(String(id));
  if (!FORCE) {
    try {
      const snap = await ref.get();
      if (snap.exists) { counters.skipped++; return 'skip'; }
    } catch (e) {
      counters.errors++;
      console.error('   [GET ' + label + '/' + id + '] ' + e.message);
      return 'error';
    }
  }
  if (DRY_RUN) { counters.pending++; return 'pending'; }
  try {
    await ref.set(payload, { merge: false });
    counters.written++;
    return FORCE ? 'overwritten' : 'written';
  } catch (e) {
    counters.errors++;
    console.error('   [SET ' + label + '/' + id + '] ' + e.message);
    return 'error';
  }
}

async function main() {
  console.log('==================================================');
  console.log('SEED AC → FIRESTORE (idempotente)');
  console.log('  --force   : ' + (FORCE ? 'SIM (sobrescreve)' : 'não (pula existentes)'));
  console.log('  --dry-run : ' + (DRY_RUN ? 'SIM (sem writes)' : 'não'));
  console.log('==================================================');

  const dbPath = path.join(__dirname, '..', 'training.db');
  if (!fs.existsSync(dbPath)) {
    console.error('[ERRO] training.db não encontrado. Rode antes: npm run seed:ac');
    process.exit(1);
  }
  const db = new Database(dbPath, { readonly: true });

  const modules = db.prepare("SELECT * FROM training_modules WHERE category = 'AC' ORDER BY order_num").all();
  if (!modules.length) {
    console.error('[ERRO] Nenhum módulo AC no SQLite. Rode antes: npm run seed:ac');
    process.exit(1);
  }
  const moduleIds = modules.map((m) => m.id);
  const lessons = db.prepare(
    'SELECT * FROM training_lessons WHERE module_id IN (' + moduleIds.join(',') + ') ORDER BY module_id, order_num'
  ).all();
  const lessonIds = lessons.map((l) => l.id);
  const checkpoints = lessonIds.length
    ? db.prepare('SELECT * FROM lesson_checkpoints WHERE lesson_id IN (' + lessonIds.join(',') + ') ORDER BY id').all()
    : [];
  const cpIds = checkpoints.map((c) => c.id);
  const cpOptions = cpIds.length
    ? db.prepare('SELECT * FROM checkpoint_options WHERE checkpoint_id IN (' + cpIds.join(',') + ') ORDER BY id').all()
    : [];
  const questions = db.prepare("SELECT * FROM questions WHERE category LIKE 'AC -%' ORDER BY order_num").all();
  const qIds = questions.map((q) => q.id);
  const qOptions = qIds.length
    ? db.prepare('SELECT * FROM question_options WHERE question_id IN (' + qIds.join(',') + ') ORDER BY id').all()
    : [];
  db.close();

  console.log('SQLite AC: modulos=' + modules.length + ' licoes=' + lessons.length +
    ' checkpoints=' + checkpoints.length + ' cp_opts=' + cpOptions.length +
    ' questoes=' + questions.length + ' q_opts=' + qOptions.length);

  const counters = { written: 0, skipped: 0, pending: 0, errors: 0 };
  if (!DRY_RUN) {
    const { initFirebase, isInitialized, getFirestore } = require('../server/services/firebase.cjs');
    const fb = initFirebase();
    if (!fb.ok || !isInitialized()) {
      console.error('[ERRO] Firebase não inicializou.');
      process.exit(1);
    }
    const fsdb = getFirestore();

    for (const m of modules) await upsert(fsdb.collection('training_modules'), m.id, coerce('training_modules', m), counters, 'modulo');
    for (const l of lessons) await upsert(fsdb.collection('training_lessons'), l.id, coerce('training_lessons', l), counters, 'licao');
    for (const c of checkpoints) await upsert(fsdb.collection('lesson_checkpoints'), c.id, coerce('lesson_checkpoints', c), counters, 'checkpoint');
    for (const o of cpOptions) await upsert(fsdb.collection('checkpoint_options'), o.id, coerce('checkpoint_options', o), counters, 'cp_option');
    for (const q of questions) await upsert(fsdb.collection('questions'), q.id, coerce('questions', q), counters, 'questao');
    for (const o of qOptions) await upsert(fsdb.collection('question_options'), o.id, coerce('question_options', o), counters, 'q_option');
  } else {
    const total = modules.length + lessons.length + checkpoints.length + cpOptions.length + questions.length + qOptions.length;
    counters.pending = total;
    console.log('[DRY-RUN] ' + total + ' docs seriam processados. Firebase não inicializado.');
  }

  console.log('--------------------------------------------------');
  console.log('RESULTADO AC → Firestore: escritos=' + counters.written +
    ' pulados=' + counters.skipped + ' pendentes(dry-run)=' + counters.pending + ' erros=' + counters.errors);
  if (counters.errors > 0) process.exit(1);
  console.log(counters.written === 0 && counters.pending === 0
    ? 'OK: nada a fazer — AC já presente no Firestore.'
    : 'OK: seed AC concluído.');
  process.exit(0);
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(1); });
