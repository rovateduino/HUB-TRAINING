const D = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const db = new D(path.join(__dirname, '../training.db'));
db.pragma('journal_mode = WAL');
async function main() {
  const rid = (n) => db.prepare('SELECT id FROM roles WHERE name=?').get(n).id;
  const users = [
    ['aluno.a@teste.com', 'Aluno A', 'PROF-A', 'STUDENT', 'senha123'],
    ['aluno.b@teste.com', 'Aluno B', 'PROF-B', 'STUDENT', 'senha123'],
    ['adm@teste.com', 'Administrador', 'ADM-01', 'ADMIN', 'adm123456'],
    ['avaliador@teste.com', 'Avaliador Técnico', 'AVAL-01', 'TECHNICAL_EVALUATOR', 'aval123456'],
  ];
  for (const [email, name, ident, role, pw] of users) {
    const ex = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    const hash = await bcrypt.hash(pw, 10);
    if (ex) { db.prepare('UPDATE users SET password_hash=?, name=?, role_id=?, is_active=1 WHERE id=?').run(hash, name, rid(role), ex.id); console.log('atualizado ' + email + ' id=' + ex.id); }
    else { const r = db.prepare('INSERT INTO users (email,password_hash,name,identifier,role_id,is_active) VALUES (?,?,?,?,?,1)').run(email, hash, name, ident, rid(role)); console.log('criado ' + email + ' id=' + r.lastInsertRowid); }
  }
  console.log('users:', db.prepare('SELECT id,email,name FROM users').all());
  db.close();
}
main();
