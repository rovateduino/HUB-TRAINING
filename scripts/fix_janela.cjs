#!/usr/bin/env node
/**
 * Correção 1-shot da janela de manutenção: 21:00–06:45 → 01:00–05:00.
 *
 * Alvos cirúrgicos (ids confirmados):
 *   training_lessons/10  (lição "Rotina da Manutenção Preventiva" — 6 ocorrências no content)
 *   question_options/268 (questão 67 do simulado — opção correta)
 *   checkpoint_options/44 (checkpoint 14 da lição 10 — opção correta)
 *
 * Atualiza SQLite (training.db) + Firestore (fonte primária) com as mesmas trocas.
 * NÃO altera gabaritos (só o texto da opção correta) e NÃO toca em nada mais.
 *
 * Uso:
 *   node scripts/fix_janela.cjs [--dry-run]
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = new Set(process.argv.slice(2)).has('--dry-run');

let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('[ERRO] better-sqlite3 não instalado. Rode: npm i better-sqlite3 --no-save');
  process.exit(1);
}

const REPLACEMENTS = [
  ['21:00–06:45', '01:00–05:00'],
  ['21:00 às 06:45', '01:00 às 05:00'],
  ['21:00', '01:00'],
  ['06:45', '05:00'],
];

function fixText(s) {
  let out = String(s || '');
  for (const [a, b] of REPLACEMENTS) out = out.split(a).join(b);
  return out;
}

async function main() {
  console.log('==================================================');
  console.log('FIX JANELA 21:00–06:45 → 01:00–05:00' + (DRY_RUN ? ' [DRY-RUN]' : ''));
  console.log('==================================================');

  // ---------- 1. SQLite ----------
  const dbPath = path.join(__dirname, '..', 'training.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const lesson = db.prepare('SELECT id, content FROM training_lessons WHERE id = 10').get();
  if (!lesson) { console.error('[ERRO] lição 10 não encontrada no SQLite'); process.exit(1); }
  const newContent = fixText(lesson.content);
  const before = (lesson.content.match(/21:00|06:45/g) || []).length;
  const after = (newContent.match(/01:00|05:00/g) || []).length;
  console.log(`SQLite licao 10: ocorrencias antigas=${before} novas=${after}`);
  if (!DRY_RUN && newContent !== lesson.content) {
    db.prepare('UPDATE training_lessons SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 10').run(newContent);
    console.log('SQLite: licao 10 atualizada');
  }

  const qopt = db.prepare('SELECT id, option_text FROM question_options WHERE id = 268').get();
  console.log('SQLite qopt 268: ' + (qopt && qopt.option_text));
  if (!DRY_RUN && qopt && qopt.option_text !== '01:00 às 05:00') {
    db.prepare('UPDATE question_options SET option_text = ? WHERE id = 268').run('01:00 às 05:00');
    console.log('SQLite: qopt 268 atualizada');
  }

  const cpopt = db.prepare('SELECT id, option_text FROM checkpoint_options WHERE id = 44').get();
  console.log('SQLite cpopt 44: ' + (cpopt && cpopt.option_text));
  if (!DRY_RUN && cpopt && cpopt.option_text !== '01:00 às 05:00') {
    db.prepare('UPDATE checkpoint_options SET option_text = ? WHERE id = 44').run('01:00 às 05:00');
    console.log('SQLite: cpopt 44 atualizada');
  }
  db.close();

  // ---------- 2. Firestore ----------
  const { initFirebase, isInitialized, getFirestore } = require('../server/services/firebase.cjs');
  if (DRY_RUN) {
    console.log('[DRY-RUN] Firestore não tocado.');
    process.exit(0);
  }
  const fb = initFirebase();
  if (!fb.ok || !isInitialized()) { console.error('[ERRO] Firebase não inicializou.'); process.exit(1); }
  const fsdb = getFirestore();

  const lref = fsdb.collection('training_lessons').doc('10');
  const lsnap = await lref.get();
  if (!lsnap.exists) { console.error('[ERRO] training_lessons/10 não existe no Firestore'); process.exit(1); }
  const fContent = fixText((lsnap.data() || {}).content || '');
  if (fContent !== ((lsnap.data() || {}).content || '')) {
    await lref.update({ content: fContent });
    console.log('Firestore: training_lessons/10 atualizada');
  } else console.log('Firestore: training_lessons/10 já correta');

  const qref = fsdb.collection('question_options').doc('268');
  const qsnap = await qref.get();
  if (qsnap.exists && qsnap.data().option_text !== '01:00 às 05:00') {
    await qref.update({ option_text: '01:00 às 05:00' });
    console.log('Firestore: question_options/268 atualizada');
  } else console.log('Firestore: question_options/268 já correta/existe=' + qsnap.exists);

  const cref = fsdb.collection('checkpoint_options').doc('44');
  const csnap = await cref.get();
  if (csnap.exists && csnap.data().option_text !== '01:00 às 05:00') {
    await cref.update({ option_text: '01:00 às 05:00' });
    console.log('Firestore: checkpoint_options/44 atualizada');
  } else console.log('Firestore: checkpoint_options/44 já correta/existe=' + csnap.exists);

  console.log('OK: janela corrigida no SQLite + Firestore.');
  process.exit(0);
}

main().catch((e) => { console.error('[FATAL]', e); process.exit(1); });
