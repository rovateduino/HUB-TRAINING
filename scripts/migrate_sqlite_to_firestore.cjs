#!/usr/bin/env node
/**
 * Script de Migração 1-shot: SQLite (training.db) → Firestore
 *
 * Uso:
 *   node scripts/migrate_sqlite_to_firestore.cjs [--dry-run] [--force] [--skip-backup] [--tables t1,t2,t3]
 *
 * Flags:
 *   --dry-run       Apenas loga counts e ações NÃO executadas. NÃO escreve no Firestore, NÃO cria backup.
 *   --force         Sobrescreve docs JÁ EXISTENTES no Firestore (default = skip se existir).
 *   --skip-backup   Pula a etapa de backup JSON/ZIP.
 *   --tables X,Y    Apenas migra as tabelas listadas (coma separado).
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ============================================================
// 0. Flags
// ============================================================
const argvArr = process.argv.slice(2);
const args = new Set(argvArr);
const DRY_RUN = args.has('--dry-run');
const FORCE = args.has('--force');
const SKIP_BACKUP = args.has('--skip-backup');
let ONLY_TABLES = null;
for (let i = 0; i < argvArr.length; i++) {
  const a = argvArr[i];
  if (a.startsWith('--tables=')) {
    ONLY_TABLES = new Set(a.slice('--tables='.length).split(',').map(s => s.trim()).filter(Boolean));
  } else if (a === '--tables' && argvArr[i + 1]) {
    ONLY_TABLES = new Set(argvArr[i + 1].split(',').map(s => s.trim()).filter(Boolean));
    i++;
  }
}

// ============================================================
// 1. Load deps (better-sqlite3 apenas neste script — NÃO runtime)
// ============================================================
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('\x1b[31m%s\x1b[0m',
    '[ERRO] better-sqlite3 não está instalado. Rode:\n' +
    '  npm i better-sqlite3 --no-save\n' +
    'antes de executar a migração.');
  process.exit(1);
}

const { initFirebase, isInitialized, getFirestore, getResolvedProjectId, getTimestamp } = require('../server/services/firebase.cjs');

// ============================================================
// 2. Ordem de migração (respeitando FKs)
// ============================================================
const TABLE_ORDER = [
  'roles',
  'permissions',
  'equipment_types',
  'technical_documents',
  'users',
  'invite_tokens',
  'password_reset_tokens',
  'technical_equipment',
  'equipment_relationships',
  'training_modules',
  'module_workload',
  'certificate_settings',
  'training_lessons',
  'lesson_checkpoints',
  'checkpoint_options',
  'questions',
  'question_options',
  'lesson_progress',
  'checkpoint_answers',
  'attempts',
  'quiz_attempts',
  'quiz_answers',
  'practical_evaluations',
  'certificates',
  'audit_logs',
  'content_versions',
  'technical_images',
];

// Mapeamento tabela → nome da PK (quando não é "id")
const CUSTOM_PK = {
  module_workload: 'module_id',
};

// Campos que devem ser convertidos INTEGER 0/1 → boolean
const BOOL_FIELDS = new Set([
  'is_active', 'is_correct', 'passed', 'revoked', 'used', 'by_admin',
]);

// Campos JSON TEXT → parsear para objeto (se possível, senão manter string)
const JSON_FIELDS = new Set([
  'permissions', 'answers', 'images', 'documents', 'references',
  'specifications', 'criteria_data', 'workload_detail', 'old_value', 'new_value',
  'prerequisites', 'warnings',
]);

// ============================================================
// Helpers
// ============================================================
function pad2(n) { return n < 10 ? '0' + n : String(n); }
function tsSuffix() {
  const d = new Date();
  return d.getFullYear().toString() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
    '-' + pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
}

function coerceValue(fieldName, value) {
  if (value === null || value === undefined) return null;
  if (BOOL_FIELDS.has(fieldName)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const s = value.trim().toLowerCase();
      return s === '1' || s === 'true' || s === 'yes' || s === 'sim';
    }
    return Boolean(value);
  }
  if (JSON_FIELDS.has(fieldName) && typeof value === 'string') {
    const s = value.trim();
    if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
      try { return JSON.parse(s); } catch { /* keep string */ }
    }
  }
  return value;
}

function convertRow(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    out[k] = coerceValue(k, row[k]);
  }
  return out;
}

function getPk(tableName, row) {
  const field = CUSTOM_PK[tableName] || 'id';
  if (row[field] === undefined || row[field] === null) return null;
  return String(row[field]);
}

// ============================================================
// 3. Pre-checks
// ============================================================
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', ' 🚚  MIGRAÇÃO SQLite → Firestore (1-shot)');
console.log('\x1b[36m%s\x1b[0m', '═══════════════════════════════════════════════════');
console.log('  --dry-run     :', DRY_RUN ? '\x1b[33mSIM\x1b[0m (sem writes)' : 'não');
console.log('  --force       :', FORCE ? '\x1b[31mSIM\x1b[0m (sobrescreve docs)' : 'não (skip se existir)');
console.log('  --skip-backup :', SKIP_BACKUP ? 'sim' : 'não');
console.log('  --tables      :', ONLY_TABLES ? [...ONLY_TABLES].join(', ') : 'todas as tabelas');
console.log('');

const DB_PATH = path.join(__dirname, '..', 'training.db');
if (!fs.existsSync(DB_PATH)) {
  console.error('\x1b[31m[ERRO]\x1b[0m Arquivo training.db não encontrado em:', DB_PATH);
  process.exit(1);
}
const db = new Database(DB_PATH, { readonly: true });
console.log('📂 SQLite training.db carregado (leitura).');

if (!DRY_RUN) {
  const fb = initFirebase();
  if (!fb.ok) {
    console.error('\x1b[31m[ERRO]\x1b[0m Firebase não inicializou:', fb.error);
    process.exit(1);
  }
  if (!isInitialized() || !getFirestore()) {
    console.error('\x1b[31m[ERRO]\x1b[0m Firestore não disponível após initFirebase().');
    process.exit(1);
  }
  console.log('🔥 Firebase/Firestore inicializado. Projeto:', getResolvedProjectId());
} else {
  console.log('🔍 [DRY-RUN] Firebase não inicializado — sem writes.');
}

// Validar tabelas existem no SQLite
const EXISTING_TABLES = new Set(
  db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
    .all().map(r => r.name)
);

let tablesToRun = TABLE_ORDER.filter(t => {
  if (!EXISTING_TABLES.has(t)) {
    console.log(`\x1b[33m[SKIP]\x1b[0m Tabela "${t}" não existe no SQLite.`);
    return false;
  }
  if (ONLY_TABLES && !ONLY_TABLES.has(t)) return false;
  return true;
});

console.log('\n📋 Tabelas para migrar (' + tablesToRun.length + '): ' + tablesToRun.join(', '));

// ============================================================
// 4. Backup (JSON — pois archiver não está)
// ============================================================
let backupPath = null;
if (!DRY_RUN && !SKIP_BACKUP) {
  try {
    console.log('\n💾 Criando backup JSON pré-migração...');
    const backup = {
      generated_at: new Date().toISOString(),
      source_db: DB_PATH,
      tables: {},
    };
    for (const t of tablesToRun) {
      backup.tables[t] = db.prepare('SELECT * FROM ' + t).all();
    }
    const suf = tsSuffix();
    backupPath = path.join(__dirname, '..', `backup-pre-migracao-${suf}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
    const sizeBytes = fs.statSync(backupPath).size;
    console.log(`✅ Backup criado: ${backupPath} (${(sizeBytes / 1024).toFixed(1)} KB)`);
  } catch (e) {
    console.error('\x1b[31m[ERRO BACKUP]\x1b[0m', e && e.message ? e.message : String(e));
    console.error('Abortando (segurança). Para pular backup, use --skip-backup.');
    process.exit(1);
  }
} else if (DRY_RUN) {
  console.log('\n💾 [DRY-RUN] Backup pulado.');
}

// ============================================================
// 5. Migração tabela a tabela
// ============================================================
const stats = {};
const firestoreDb = DRY_RUN ? null : getFirestore();

async function runMigration() {
  for (const table of tablesToRun) {
    const rows = db.prepare('SELECT * FROM ' + table).all();
    const total = rows.length;
    stats[table] = { total, inserted: 0, skipped: 0, overwritten: 0, errors: 0 };
    console.log(`\n── Tabela ${table} (${total} rows) ──`);

    if (DRY_RUN) {
      console.log(`   [DRY-RUN] ${total} docs seriam processados.`);
      continue;
    }

    const collection = firestoreDb.collection(table);
    let batch = firestoreDb.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500;

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      const docId = getPk(table, rawRow);
      if (!docId) {
        stats[table].errors++;
        console.error(`   ❌ [row ${i}] sem PK válida:`, rawRow);
        continue;
      }
      const payload = convertRow(rawRow);

      // Verifica existência para idempotência (exceto --force)
      if (!FORCE) {
        try {
          const snap = await collection.doc(docId).get();
          if (snap.exists) {
            stats[table].skipped++;
            if (stats[table].skipped <= 5 || stats[table].skipped % 50 === 0) {
              console.log(`   ⏭  [SKIP] ${table}/${docId} já existe.`);
            }
            continue;
          }
        } catch (e) {
          stats[table].errors++;
          console.error(`   ❌ [GET ${table}/${docId}]`, e.message);
          continue;
        }
      }

      const ref = collection.doc(docId);
      if (FORCE) {
        batch.set(ref, payload, { merge: false });
        stats[table].overwritten++;
      } else {
        batch.set(ref, payload, { merge: true });
        stats[table].inserted++;
      }
      batchCount++;

      if (batchCount >= BATCH_LIMIT || i === rows.length - 1) {
        try {
          await batch.commit();
          if (batchCount > 0) console.log(`   ✅ batch commit: ${batchCount} docs`);
        } catch (e) {
          console.error(`   ❌ batch commit FAILED:`, e.message);
          stats[table].errors += batchCount;
        }
        batch = firestoreDb.batch();
        batchCount = 0;
      }
    }

    console.log(`   Resultado: inseridos=${stats[table].inserted} sobrescritos=${stats[table].overwritten} skips=${stats[table].skipped} erros=${stats[table].errors}`);
  }

  // ============================================================
  // 6. Validação FINAL counts (interseção por ID — ignora docs
  //    extras existentes no Firestore criados por testes/E2E)
  // ============================================================
  console.log('\n═══════════════════════════════════════════════════');
  console.log(' 🔍  VALIDAÇÃO FINAL — counts SQLite vs Firestore');
  console.log('    (Conta apenas IDs do SQLite no Firestore)');
  console.log('═══════════════════════════════════════════════════');

  let allOk = true;
  for (const table of tablesToRun) {
    const pkField = CUSTOM_PK[table] || 'id';
    const sqlRows = db.prepare('SELECT ' + pkField + ' AS pk FROM ' + table).all();
    const countSql = sqlRows.length;
    const sqlIds = new Set(sqlRows.map(r => String(r.pk)));
    let countFs = 0;
    if (!DRY_RUN) {
      try {
        const col = firestoreDb.collection(table);
        const snap = await col.select().get();
        for (const doc of snap.docs) {
          if (sqlIds.has(doc.id)) countFs++;
        }
        if (countSql === 0 && snap.empty) countFs = 0;
      } catch (e) {
        console.warn(`   ⚠  validação falhou para ${table}:`, e.message);
        countFs = -1;
      }
    } else {
      countFs = countSql;
    }
    const diff = countSql - countFs;
    const ok = diff === 0 && countFs >= 0;
    if (!ok) allOk = false;
    const color = ok ? '\x1b[32m' : '\x1b[31m';
    const mark = ok ? '✅' : '❌';
    console.log(`   ${mark} ${color}${table.padEnd(25)}\x1b[0m sqlite=${String(countSql).padStart(6)} firestore=${String(countFs).padStart(6)} diff=${String(diff).padStart(6)}`);
  }

  console.log('');
  db.close();

  if (DRY_RUN) {
    console.log('\x1b[36m%s\x1b[0m', '\n🏁 [DRY-RUN] Concluído. Nenhum dado foi alterado.');
    process.exit(0);
  }

  if (!allOk) {
    console.error('\x1b[31m%s\x1b[0m', '\n❌ MIGRAÇÃO FALHOU: counts divergem. Verifique tabelas acima.');
    if (backupPath) console.log('   Backup pré-migração preservado em:', backupPath);
    process.exit(1);
  }

  console.log('\x1b[32m%s\x1b[0m', '\n✅ MIGRAÇÃO OK: counts 1:1 para todas as tabelas.');
  if (backupPath) console.log('   Backup pré-migração:', backupPath);
  console.log('\x1b[32m%s\x1b[0m', '═══════════════════════════════════════════════════');
  process.exit(0);
}

runMigration().catch(e => {
  console.error('\x1b[31m[FATAL]\x1b[0m', e);
  try { db.close(); } catch { /* noop */ }
  process.exit(1);
});
