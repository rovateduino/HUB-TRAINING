const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');
const MIGRATIONS = [
  { type: 'sql',  file: 'migrations/0001_initial_schema.sql', name: '0001_schema_inicial' },
  { type: 'cjs',  file: 'migrations/0002_add_unique_constraint.cjs', name: '0002_unique_lesson_progress' },
  { type: 'sql',  file: 'migrations/0003_auth_tokens.sql', name: '0003_auth_tokens' },
  { type: 'sql',  file: 'migrations/0004_certificates.sql', name: '0004_certificates' },
  { type: 'cjs',  file: 'migrations/0005_certification_final.cjs', name: '0005_certification_final' },
];

async function runSqlFile(db, absPath, name) {
  const sql = fs.readFileSync(absPath, 'utf-8');
  console.log(`  ↳ Executando ${name} (SQL)...`);
  db.exec(sql);
}

async function runCjsFile(absPath, name) {
  console.log(`  ↳ Executando ${name} (script CJS)...`);
  const mod = require(absPath);
  if (typeof mod === 'function') await mod();
}

async function main() {
  console.log('Iniciando migração do banco de dados...');
  console.log(`Alvo: ${dbPath}`);
  try {
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    for (const m of MIGRATIONS) {
      const abs = path.join(__dirname, m.file);
      if (m.type === 'sql') await runSqlFile(sqlite, abs, m.name);
      else if (m.type === 'cjs') {
        try { await runCjsFile(abs, m.name); }
        catch (e) {
          if (/UNIQUE.*constraint|já existe|already exists/i.test(e.message || '')) {
            console.log(`    (ignorado — migração ${m.name} provavelmente já aplicada)`);
          } else { throw e; }
        }
      }
    }

    console.log('✅ Migração concluída com sucesso!');
    console.log('Tabelas atuais:');
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    tables.forEach(table => { console.log(`  - ${table.name}`); });
    sqlite.close();
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

main();