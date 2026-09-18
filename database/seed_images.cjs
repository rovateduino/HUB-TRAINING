const D = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const db = new D(path.join(__dirname, '../training.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS technical_images (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, title TEXT, classification TEXT NOT NULL, source TEXT, lesson_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
db.exec(`CREATE TABLE IF NOT EXISTS technical_documents (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, version TEXT, status TEXT DEFAULT 'PENDING_TECHNICAL_VALIDATION', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`);
let imgs = [];
try { imgs = fs.readdirSync(path.join(__dirname, '../static')).filter(f => /\.(jpg|jpeg|png|svg|webp)$/i.test(f)); } catch (e) {}
console.log('static imgs:', imgs);
db.prepare('DELETE FROM technical_images').run();
const ins = db.prepare('INSERT INTO technical_images (filename,title,classification,source) VALUES (?,?,?,?)');
for (const f of imgs) {
  let cls = 'REFERENCIA_ILUSTRATIVA';
  if (/fluxograma/i.test(f)) cls = 'DOCUMENTACAO_TECNICA';
  ins.run(f, f, cls, 'static/' + f);
}
console.log('images classified:', db.prepare('SELECT COUNT(*) c FROM technical_images').get().c);
db.close();
