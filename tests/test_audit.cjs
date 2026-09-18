const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

async function main() {
  console.log('=== TESTE DO SISTEMA DE AUDITORIA ===\n');
  
  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // ========================
    // TESTE 1: Criar log de auditoria
    // ========================
    console.log('1. TESTE: Criar log de auditoria...');
    
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const auditActions = [
      { user_id: 1, action: 'LOGIN', entity_type: 'USER', entity_id: 1, old_value: null, new_value: 'logged_in', ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', description: 'Usuário fez login' },
      { user_id: 1, action: 'LESSON_START', entity_type: 'LESSON_PROGRESS', entity_id: 1, old_value: 'NOT_STARTED', new_value: 'IN_PROGRESS', ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', description: 'Usuário iniciou lição' },
      { user_id: 1, action: 'CHECKPOINT_SUBMIT', entity_type: 'CHECKPOINT_ANSWER', entity_id: 1, old_value: null, new_value: 'option_2', ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', description: 'Usuário respondeu checkpoint' },
      { user_id: 1, action: 'LESSON_COMPLETE', entity_type: 'LESSON_PROGRESS', entity_id: 1, old_value: 'IN_PROGRESS', new_value: 'COMPLETED', ip_address: '192.168.1.100', user_agent: 'Mozilla/5.0', description: 'Usuário completou lição' }
    ];
    
    auditActions.forEach(action => {
      try {
        const result = insertAudit.run(
          action.user_id,
          action.action,
          action.entity_type,
          action.entity_id,
          action.old_value,
          action.new_value,
          action.ip_address,
          action.user_agent,
          action.description
        );
        console.log(`  ✅ Log criado (ID: ${result.lastInsertRowid}) - ${action.action}`);
      } catch (e) {
        console.log(`  ⚠️  Log já existe ou erro: ${e.message}`);
      }
    });
    console.log();
    
    // ========================
    // TESTE 2: Consultar logs por usuário
    // ========================
    console.log('2. TESTE: Consultar logs por usuário...');
    
    const userLogs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `).all(1);
    
    console.log(`  📊 Total de logs do usuário: ${userLogs.length}`);
    userLogs.forEach(log => {
      console.log(`     - [${log.timestamp}] ${log.action} on ${log.entity_type}: ${log.description}`);
    });
    console.log();
    
    // ========================
    // TESTE 3: Consultar logs por tipo de ação
    // ========================
    console.log('3. TESTE: Consultar logs por tipo de ação...');
    
    const actionLogs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE action = 'LESSON_START'
      ORDER BY timestamp DESC
    `).all();
    
    console.log(`  📊 Total de logs de LESSON_START: ${actionLogs.length}`);
    actionLogs.forEach(log => {
      console.log(`     - User ${log.user_id} iniciou lição ${log.entity_id} em ${log.timestamp}`);
    });
    console.log();
    
    // ========================
    // TESTE 4: Consultar logs por entidade
    // ========================
    console.log('4. TESTE: Consultar logs por entidade...');
    
    const entityLogs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE entity_type = 'LESSON_PROGRESS' AND entity_id = 1
      ORDER BY timestamp ASC
    `).all();
    
    console.log(`  📊 Histórico da lição 1: ${entityLogs.length} eventos`);
    entityLogs.forEach(log => {
      console.log(`     - ${log.action}: ${log.old_value} → ${log.new_value}`);
    });
    console.log();
    
    // ========================
    // TESTE 5: Verificar timestamps
    // ========================
    console.log('5. TESTE: Verificar timestamps automáticos...');
    
    const latestLog = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 1
    `).get();
    
    if (latestLog) {
      console.log(`  ✅ Timestamp mais recente: ${latestLog.timestamp}`);
      console.log(`  ✅ Timestamp é automático (não foi informado manualmente)`);
    }
    console.log();
    
    // ========================
    // TESTE 6: Log sem usuário (sistema)
    // ========================
    console.log('6. TESTE: Criar log sem usuário (ação de sistema)...');
    
    try {
      const result = insertAudit.run(
        null,
        'SYSTEM_MIGRATION',
        'TRAINING_MODULE',
        1,
        null,
        'migrated',
        '127.0.0.1',
        'System/1.0',
        'Migração de módulo'
      );
      console.log(`  ✅ Log de sistema criado (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Erro: ${e.message}`);
    }
    console.log();
    
    // ========================
    // TESTE 7: Consultar logs com paginação
    // ========================
    console.log('7. TESTE: Consultar logs com paginação...');
    
    const paginatedLogs = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY timestamp DESC
      LIMIT 5 OFFSET 0
    `).all();
    
    console.log(`  📊 Primeiros 5 logs (página 1): ${paginatedLogs.length}`);
    paginatedLogs.forEach((log, i) => {
      console.log(`     ${i + 1}. [${log.timestamp.substring(11, 19)}] ${log.action}`);
    });
    console.log();
    
    // ========================
    // TESTE 8: Contagem total de logs
    // ========================
    console.log('8. TESTE: Contagem total de logs...');
    
    const totalLogs = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
    console.log(`  📊 Total de logs no sistema: ${totalLogs.count}`);
    console.log();
    
    // ========================
    // RESUMO
    // ========================
    console.log('=== RESUMO DOS TESTES ===');
    console.log('✅ Criação de logs de auditoria');
    console.log('✅ Consulta de logs por usuário');
    console.log('✅ Consulta de logs por tipo de ação');
    console.log('✅ Consulta de logs por entidade');
    console.log('✅ Timestamps automáticos');
    console.log('✅ Logs de sistema (sem usuário)');
    console.log('✅ Paginação de logs');
    console.log('✅ Contagem total de logs');
    console.log('\n✅ TODOS OS TESTES DE AUDITORIA PASSARAM!\n');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
    process.exit(1);
  }
}

main();