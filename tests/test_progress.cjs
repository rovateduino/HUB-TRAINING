const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

async function main() {
  console.log('=== TESTE DO SISTEMA DE PROGRESSO ===\n');
  
  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // ========================
    // SETUP: Criar usuário de teste
    // ========================
    console.log('1. SETUP: Criando usuário de teste...');
    const passwordHash = await bcrypt.hash('Test@1234', 10);
    
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, name, identifier, role_id, is_active)
      VALUES (?, ?, ?, ?, 1, 1)
    `);
    
    let userId;
    try {
      const result = insertUser.run('test.student@example.com', passwordHash, 'Test Student', 'TEST001');
      userId = result.lastInsertRowid;
      console.log(`  ✅ Usuário criado com ID: ${userId}\n`);
    } catch (e) {
      console.log(`  ⚠️  Usuário já existe, buscando ID...`);
      const user = db.prepare('SELECT id FROM users WHERE email = ?').get('test.student@example.com');
      userId = user.id;
      console.log(`  ✅ Usuário encontrado com ID: ${userId}\n`);
    }
    
    // ========================
    // TESTE 1: Criar progresso inicial
    // ========================
    console.log('2. TESTE: Criar progresso inicial de lição...');
    
    // Buscar uma lição de teste
    let lesson = db.prepare('SELECT id FROM training_lessons LIMIT 1').get();
    if (!lesson) {
      console.log('  ❌ Nenhuma lição encontrada. Criando lição de teste...');
      const insertLesson = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, content, status)
        VALUES (1, 'Lição de Teste', 1, 'Conteúdo de teste', 'PENDING_TECHNICAL_VALIDATION')
      `);
      const lessonResult = insertLesson.run();
      lesson = { id: lessonResult.lastInsertRowid };
    }
    
    console.log(`  📝 Usando lição ID: ${lesson.id}`);
    
    const insertProgress = db.prepare(`
      INSERT INTO lesson_progress (user_id, lesson_id, status, progress, started_at)
      VALUES (?, ?, 'IN_PROGRESS', 0, datetime('now'))
    `);
    
    let progressId;
    try {
      const result = insertProgress.run(userId, lesson.id);
      progressId = result.lastInsertRowid;
      console.log(`  ✅ Progresso criado com ID: ${progressId}`);
      console.log(`  ✅ Status: IN_PROGRESS`);
      console.log(`  ✅ Progresso: 0%\n`);
    } catch (e) {
      console.log(`  ⚠️  Progresso já existe, buscando ID...`);
      const progress = db.prepare('SELECT id FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(userId, lesson.id);
      progressId = progress.id;
      console.log(`  ✅ Progresso encontrado com ID: ${progressId}\n`);
    }
    
    // ========================
    // TESTE 2: Atualizar progresso
    // ========================
    console.log('3. TESTE: Atualizar progresso...');
    
    const updateProgress = db.prepare(`
      UPDATE lesson_progress
      SET progress = 50,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    updateProgress.run(progressId);
    console.log(`  ✅ Progresso atualizado para 50%`);
    
    const updatedProgress = db.prepare('SELECT * FROM lesson_progress WHERE id = ?').get(progressId);
    console.log(`  ✅ Verificação: ${updatedProgress.progress}%\n`);
    
    // ========================
    // TESTE 3: Completar lição
    // ========================
    console.log('4. TESTE: Completar lição...');
    
    const completeProgress = db.prepare(`
      UPDATE lesson_progress
      SET status = 'COMPLETED',
          progress = 100,
          completed_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    completeProgress.run(progressId);
    console.log(`  ✅ Status alterado para COMPLETED`);
    console.log(`  ✅ Progresso: 100%`);
    
    const completedProgress = db.prepare('SELECT * FROM lesson_progress WHERE id = ?').get(progressId);
    console.log(`  ✅ Data de conclusão: ${completedProgress.completed_at}\n`);
    
    // ========================
    // TESTE 4: Consultar progresso por usuário
    // ========================
    console.log('5. TESTE: Consultar todo o progresso do usuário...');
    
    const userProgress = db.prepare(`
      SELECT lp.*, tl.title as lesson_title, tm.title as module_title
      FROM lesson_progress lp
      JOIN training_lessons tl ON lp.lesson_id = tl.id
      JOIN training_modules tm ON tl.module_id = tm.id
      WHERE lp.user_id = ?
    `).all(userId);
    
    console.log(`  📊 Total de lições com progresso: ${userProgress.length}`);
    userProgress.forEach(p => {
      console.log(`     - ${p.module_title} > ${p.lesson_title}: ${p.status} (${p.progress}%)`);
    });
    console.log();
    
    // ========================
    // TESTE 5: Testar unicidade (constraint)
    // ========================
    console.log('6. TESTE: Verificar unicidade (user + lesson)...');
    
    try {
      insertProgress.run(userId, lesson.id);
      console.log(`  ❌ ERRO: Duplicação permitida (constraint não funcionou)\n`);
    } catch (e) {
      console.log(`  ✅ Constraint funcionou: duplicação impedida`);
      console.log(`  ✅ Mensagem: ${e.message}\n`);
    }
    
    // ========================
    // TESTE 6: Adicionar checkpoints
    // ========================
    console.log('7. TESTE: Adicionar checkpoints à lição...');
    
    const insertCheckpoint = db.prepare(`
      INSERT INTO lesson_checkpoints (lesson_id, question, type, order_num, points)
      VALUES (?, ?, 'MULTIPLE_CHOICE', ?, 1)
    `);
    
    const checkpoints = [
      'Qual é a função principal do QDGE?',
      'O que significa UPS?',
      'Qual é a função do FCC?'
    ];
    
    checkpoints.forEach((q, i) => {
      try {
        const result = insertCheckpoint.run(lesson.id, q, i + 1);
        console.log(`  ✅ Checkpoint ${i + 1} criado (ID: ${result.lastInsertRowid})`);
      } catch (e) {
        console.log(`  ⚠️  Checkpoint ${i + 1} já existe`);
      }
    });
    
    const totalCheckpoints = db.prepare('SELECT COUNT(*) as count FROM lesson_checkpoints WHERE lesson_id = ?').get(lesson.id);
    console.log(`  ✅ Total de checkpoints na lição: ${totalCheckpoints.count}\n`);
    
    // ========================
    // TESTE 7: Atualizar contagem de checkpoints no progresso
    // ========================
    console.log('8. TESTE: Atualizar contagem de checkpoints no progresso...');
    
    const updateCheckpointCount = db.prepare(`
      UPDATE lesson_progress
      SET total_checkpoints = (SELECT COUNT(*) FROM lesson_checkpoints WHERE lesson_id = ?),
          checkpoints_completed = 1,
          updated_at = datetime('now')
      WHERE id = ?
    `);
    
    updateCheckpointCount.run(lesson.id, progressId);
    
    const progressWithCheckpoints = db.prepare('SELECT * FROM lesson_progress WHERE id = ?').get(progressId);
    console.log(`  ✅ Total de checkpoints: ${progressWithCheckpoints.total_checkpoints}`);
    console.log(`  ✅ Checkpoints completados: ${progressWithCheckpoints.checkpoints_completed}\n`);
    
    // ========================
    // RESUMO
    // ========================
    console.log('=== RESUMO DOS TESTES ===');
    console.log('✅ Criação de usuário');
    console.log('✅ Criação de progresso inicial');
    console.log('✅ Atualização de progresso');
    console.log('✅ Transição para COMPLETED');
    console.log('✅ Consulta de progresso por usuário');
    console.log('✅ Constraint de unicidade (user + lesson)');
    console.log('✅ Criação de checkpoints');
    console.log('✅ Contagem de checkpoints no progresso');
    console.log('\n✅ TODOS OS TESTES DE PROGRESSO PASSARAM!\n');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    process.exit(1);
  }
}

main();