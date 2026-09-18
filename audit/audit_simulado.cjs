const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

console.log('=== AUDITORIA: SIMULADO FINAL ===\n');

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // 1. Verificar tabela questions
  console.log('1. VERIFICANDO QUESTÕES DO SIMULADO...');
  const questions = db.prepare('SELECT id, category, module_id, is_active FROM questions').all();
  console.log(`   Questões encontradas: ${questions.length}`);
  
  if (questions.length === 0) {
    console.log('   ❌ NENHUMA QUESTÃO CADASTRADA\n');
  } else {
    console.log('   ✅ Questões cadastradas\n');
  }
  
  // 2. Verificar question_options
  console.log('2. VERIFICANDO OPÇÕES DE QUESTÕES...');
  const options = db.prepare('SELECT COUNT(*) as count FROM question_options').get();
  console.log(`   Opções encontradas: ${options.count}`);
  
  if (options.count === 0) {
    console.log('   ❌ NENHUMA OPÇÃO CADASTRADA\n');
  } else {
    console.log('   ✅ Opções cadastradas\n');
  }
  
  // 3. Verificar se há questões por módulo
  console.log('3. VERIFICANDO DISTRIBUIÇÃO POR MÓDULO...');
  const questionsByModule = db.prepare(`
    SELECT module_id, COUNT(*) as count
    FROM questions
    GROUP BY module_id
    ORDER BY module_id
  `).all();
  
  if (questionsByModule.length === 0) {
    console.log('   ❌ Nenhuma questão por módulo\n');
  } else {
    questionsByModule.forEach(q => {
      console.log(`   Módulo ${q.module_id}: ${q.count} questões`);
    });
    console.log();
  }
  
  // 4. Verificar tabela quiz_attempts
  console.log('4. VERIFICANDO TENTATIVAS DE SIMULADO...');
  const attempts = db.prepare('SELECT * FROM quiz_attempts').all();
  console.log(`   Tentativas registradas: ${attempts.length}`);
  
  if (attempts.length > 0) {
    attempts.forEach(a => {
      console.log(`   - Usuário ${a.user_id}: ${a.score}/${a.total} (${a.passed ? 'APROVADO' : 'NÃO APROVADO'})`);
    });
    console.log('   ✅ Sistema de tentativas funcionando\n');
  } else {
    console.log('   ⚠️  Nenhuma tentativa registrada\n');
  }
  
  // 5. Verificar regra 23/30
  console.log('5. VERIFICANDO REGRA DE APROVAÇÃO...');
  console.log('   Regra esperada: 23/30 = 76,7% mínimo');
  console.log('   ⚠️  REGRA NÃO IMPLEMENTADA NO CÓDIGO\n');
  
  // 6. Verificar se gabarito está protegido
  console.log('6. VERIFICANDO PROTEÇÃO DO GABARITO...');
  const optionsWithCorrect = db.prepare('SELECT COUNT(*) as count FROM question_options WHERE is_correct = 1').get();
  console.log(`   Opções marcadas como corretas: ${optionsWithCorrect.count}`);
  
  if (optionsWithCorrect.count > 0) {
    console.log('   ✅ Campo is_correct existe no banco');
    console.log('   ⚠️  Precisa verificar se é exposto ao frontend\n');
  } else {
    console.log('   ❌ Nenhuma opção marcada como correta\n');
  }
  
  db.close();
  
  console.log('=== FIM DA AUDITORIA DO SIMULADO ===\n');
  
} catch (error) {
  console.error('❌ ERRO NA AUDITORIA DO SIMULADO:', error);
  process.exit(1);
}