const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../training.db');

async function main() {
  console.log('Adicionando constraint UNIQUE em lesson_progress...');
  
  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // Verificar duplicatas
    console.log('Verificando duplicatas...');
    const duplicates = db.prepare(`
      SELECT user_id, lesson_id, COUNT(*) as count
      FROM lesson_progress
      GROUP BY user_id, lesson_id
      HAVING count > 1
    `).all();
    
    if (duplicates.length > 0) {
      console.log(`Encontradas ${duplicates.length} duplicatas. Removendo...`);
      
      duplicates.forEach(dup => {
        console.log(`  Removendo duplicata para user_id=${dup.user_id}, lesson_id=${dup.lesson_id}`);
        
        db.prepare(`
          DELETE FROM lesson_progress
          WHERE user_id = ? AND lesson_id = ?
          AND id NOT IN (
            SELECT MIN(id) FROM lesson_progress
            WHERE user_id = ? AND lesson_id = ?
          )
        `).run(dup.user_id, dup.lesson_id, dup.user_id, dup.lesson_id);
      });
    } else {
      console.log('Nenhuma duplicata encontrada.');
    }
    
    console.log('Recriando tabela lesson_progress com constraint UNIQUE...');
    
    db.exec(`
      BEGIN TRANSACTION;
      
      CREATE TABLE IF NOT EXISTS lesson_progress_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        lesson_id INTEGER NOT NULL,
        status TEXT DEFAULT 'NOT_STARTED',
        progress INTEGER DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        checkpoints_completed INTEGER DEFAULT 0,
        total_checkpoints INTEGER DEFAULT 0,
        last_accessed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, lesson_id)
      );
      
      INSERT OR IGNORE INTO lesson_progress_new 
      SELECT * FROM lesson_progress;
      
      DROP TABLE IF EXISTS lesson_progress;
      
      ALTER TABLE lesson_progress_new RENAME TO lesson_progress;
      
      COMMIT;
    `);
    
    console.log('✅ Constraint UNIQUE adicionada com sucesso!');
    
    db.close();
  } catch (error) {
    if (/already exists|UNIQUE constraint failed/i.test(error.message || '')) {
      console.log('(0002 pulado — constraint já aplicada anteriormente)');
      return;
    }
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = main;