// MIGRACAO 0005 - FASE FINAL: avaliacao pratica + emissao administrativa
// - papel TECHNICAL_EVALUATOR (sem duplicar RBAC: usa requireRole existente)
// - tabela practical_evaluations (conceito §26)
// - certificados: practical_evaluation_id + issued_by + workload_detail (snapshot)
// - module_workload: carga horaria por modulo (NULL = a configurar pelo ADMIN)
// Idempotente.
const Database = require('better-sqlite3');
const path = require('path');

module.exports = async function migrate0005() {
  const dbPath = path.join(__dirname, '../../training.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map(c => c.name);

  db.prepare(`INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`)
    .run('TECHNICAL_EVALUATOR', 'Avaliador técnico: registra avaliações práticas presenciais (sem emitir certificados)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS practical_evaluations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      evaluator_id INTEGER NOT NULL,
      evaluation_date TEXT NOT NULL,
      result TEXT NOT NULL,
      observations TEXT,
      criteria_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (evaluator_id) REFERENCES users(id)
    );
  `);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_practical_user ON practical_evaluations(user_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_practical_evaluator ON practical_evaluations(evaluator_id);`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS module_workload (
      module_id INTEGER PRIMARY KEY,
      hours TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES training_modules(id)
    );
  `);
  const mods = db.prepare('SELECT id FROM training_modules').all();
  const insW = db.prepare('INSERT OR IGNORE INTO module_workload (module_id) VALUES (?)');
  for (const m of mods) insW.run(m.id);

  const certCols = cols('certificates');
  if (!certCols.includes('practical_evaluation_id')) db.exec('ALTER TABLE certificates ADD COLUMN practical_evaluation_id INTEGER REFERENCES practical_evaluations(id)');
  if (!certCols.includes('issued_by')) db.exec('ALTER TABLE certificates ADD COLUMN issued_by INTEGER REFERENCES users(id)');
  if (!certCols.includes('workload_detail')) db.exec('ALTER TABLE certificates ADD COLUMN workload_detail TEXT');

  const evalCols = cols('practical_evaluations');
  if (!evalCols.includes('evaluator_name')) db.exec('ALTER TABLE practical_evaluations ADD COLUMN evaluator_name TEXT');
  if (!evalCols.includes('evaluator_title')) db.exec('ALTER TABLE practical_evaluations ADD COLUMN evaluator_title TEXT');
  if (!certCols.includes('issue_note')) db.exec('ALTER TABLE certificates ADD COLUMN issue_note TEXT');

  const cpaCols = cols('checkpoint_answers');
  if (!cpaCols.includes('by_admin')) db.exec('ALTER TABLE checkpoint_answers ADD COLUMN by_admin INTEGER DEFAULT 0');

  // Reemissão após revogação: mantém histórico (linhas REVOKED) e nunca reutiliza número.
  // Remove a unicidade por usuário; "atual" = VALID mais recente.
  db.exec('DROP INDEX IF EXISTS idx_certificates_user_unique');

  console.log('  ✅ 0005: practical_evaluations, TECHNICAL_EVALUATOR, cert cols, module_workload');
  db.close();
};
