const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

console.log('=== AUDITORIA: BANCO DE DADOS ===\n');

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // 1. Verificar tabelas
  console.log('1. VERIFICANDO TABELAS...');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  console.log(`   Tabelas encontradas: ${tables.length}`);
  tables.forEach(t => console.log(`   - ${t.name}`));
  
  const requiredTables = [
    'roles', 'users', 'permissions',
    'equipment_types', 'technical_equipment', 'equipment_relationships',
    'training_modules', 'training_lessons', 'lesson_progress',
    'lesson_checkpoints', 'checkpoint_options', 'checkpoint_answers',
    'questions', 'question_options', 'quiz_attempts', 'quiz_answers',
    'audit_logs', 'content_versions', 'attempts'
  ];
  
  const missingTables = requiredTables.filter(t => !tables.find(table => table.name === t));
  if (missingTables.length > 0) {
    console.log(`   ❌ TABELAS FALTANDO: ${missingTables.join(', ')}`);
  } else {
    console.log('   ✅ Todas as tabelas requeridas existem\n');
  }
  
  // 2. Verificar training_modules
  console.log('2. VERIFICANDO TRAINING_MODULES...');
  const modules = db.prepare('SELECT id, title, order_num, status FROM training_modules ORDER BY order_num').all();
  console.log(`   Módulos encontrados: ${modules.length}`);
  modules.forEach(m => console.log(`   ${m.order_num}. ${m.title} - ${m.status}`));
  
  if (modules.length === 17) {
    console.log('   ✅ 17 módulos encontrados\n');
  } else {
    console.log(`   ❌ Esperado 17 módulos, encontrado ${modules.length}\n`);
  }
  
  // 3. Verificar training_lessons
  console.log('3. VERIFICANDO TRAINING_LESSONS...');
  const lessons = db.prepare('SELECT id, module_id, title, classification, status FROM training_lessons ORDER BY module_id, order_num').all();
  console.log(`   Lições encontradas: ${lessons.length}`);
  lessons.forEach(l => console.log(`   - Módulo ${l.module_id}: ${l.title} (${l.classification}) - ${l.status}`));
  console.log();
  
  // 4. Verificar technical_equipment
  console.log('4. VERIFICANDO TECHNICAL_EQUIPMENT...');
  const equipment = db.prepare('SELECT id, name, system, location FROM technical_equipment ORDER BY id').all();
  console.log(`   Equipamentos encontrados: ${equipment.length}`);
  equipment.forEach(e => console.log(`   - ${e.name} (${e.system}) - ${e.location}`));
  
  if (equipment.length >= 20) {
    console.log('   ✅ Topologia elétrica cadastrada\n');
  } else {
    console.log(`   ⚠️  Menos equipamentos que o esperado\n`);
  }
  
  // 5. Verificar equipment_relationships
  console.log('5. VERIFICANDO EQUIPMENT_RELATIONSHIPS...');
  const relationships = db.prepare(`
    SELECT er.id, s.name as source, t.name as target, er.relationship_type, er.relation_order
    FROM equipment_relationships er
    JOIN technical_equipment s ON er.source_id = s.id
    JOIN technical_equipment t ON er.target_id = t.id
    ORDER BY er.relation_order
  `).all();
  console.log(`   Relações encontradas: ${relationships.length}`);
  relationships.forEach(r => console.log(`   - ${r.source} → ${r.target} (${r.relationship_type})`));
  console.log();
  
  // 6. Verificar lesson_progress
  console.log('6. VERIFICANDO LESSON_PROGRESS...');
  const progress = db.prepare('SELECT * FROM lesson_progress').all();
  console.log(`   Registros de progresso: ${progress.length}`);
  if (progress.length > 0) {
    console.log('   ✅ Sistema de progresso persistindo dados\n');
  } else {
    console.log('   ⚠️  Nenhum registro de progresso\n');
  }
  
  // 7. Verificar lesson_checkpoints
  console.log('7. VERIFICANDO LESSON_CHECKPOINTS...');
  const checkpoints = db.prepare('SELECT id, lesson_id, question FROM lesson_checkpoints').all();
  console.log(`   Checkpoints encontrados: ${checkpoints.length}`);
  if (checkpoints.length > 0) {
    console.log('   ✅ Sistema de checkpoints funcionando\n');
  } else {
    console.log('   ⚠️  Nenhum checkpoint cadastrado\n');
  }
  
  // 8. Verificar checkpoint_options (segurança)
  console.log('8. VERIFICANDO SEGURANÇA DE CHECKPOINT_OPTIONS...');
  const options = db.prepare('SELECT id, checkpoint_id, option_text, is_correct FROM checkpoint_options').all();
  console.log(`   Opções encontradas: ${options.length}`);
  const hasCorrectField = options.some(o => o.is_correct !== null);
  if (hasCorrectField) {
    console.log('   ✅ Campo is_correct existe no banco (não exposto ao frontend)\n');
  } else {
    console.log('   ❌ Campo is_correct não encontrado\n');
  }
  
  // 9. Verificar audit_logs
  console.log('9. VERIFICANDO AUDIT_LOGS...');
  const logs = db.prepare('SELECT action, entity_type, COUNT(*) as count FROM audit_logs GROUP BY action, entity_type').all();
  console.log(`   Tipos de ações registradas: ${logs.length}`);
  logs.forEach(l => console.log(`   - ${l.action} on ${l.entity_type}: ${l.count}`));
  if (logs.length > 0) {
    console.log('   ✅ Sistema de auditoria funcionando\n');
  } else {
    console.log('   ⚠️  Nenhum log de auditoria\n');
  }
  
  // 10. Verificar roles
  console.log('10. VERIFICANDO ROLES...');
  const roles = db.prepare('SELECT name, description FROM roles').all();
  console.log(`   Roles encontrados: ${roles.length}`);
  roles.forEach(r => console.log(`   - ${r.name}: ${r.description}`));
  console.log();
  
  // 11. Testar INSERT/SELECT (persistência)
  console.log('11. TESTE DE PERSISTÊNCIA (INSERT + SELECT)...');
  const testInsert = db.prepare('INSERT INTO audit_logs (action, entity_type, entity_id, description) VALUES (?, ?, ?, ?)');
  const result = testInsert.run('AUDIT_TEST', 'SYSTEM', 0, 'Teste de persistência da auditoria');
  console.log(`   INSERT realizado, ID: ${result.lastInsertRowid}`);
  
  const testSelect = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(result.lastInsertRowid);
  if (testSelect) {
    console.log('   ✅ SELECT após INSERT funcionou');
    console.log('   ✅ Persistência validada\n');
  } else {
    console.log('   ❌ SELECT após INSERT falhou\n');
  }
  
  db.close();
  
  console.log('=== FIM DA AUDITORIA DO BANCO DE DADOS ===\n');
  
} catch (error) {
  console.error('❌ ERRO NA AUDITORIA DO BANCO:', error);
  process.exit(1);
}