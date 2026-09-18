const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

async function main() {
  console.log('Iniciando seed do banco de dados...');
  
  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // ========================
    // ROLES
    // ========================
    console.log('Inserindo roles...');
    const roles = [
      { name: 'STUDENT', description: 'Estudante com acesso limitado ao conteúdo de treinamento' },
      { name: 'INSTRUCTOR', description: 'Instrutor com acesso para gerenciar conteúdo e progresso' },
      { name: 'ADMIN', description: 'Administrador com acesso completo ao sistema' }
    ];
    
    const insertRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
    roles.forEach(role => {
      try {
        insertRole.run(role.name, role.description);
        console.log(`  ✅ Role ${role.name} inserida`);
      } catch (e) {
        console.log(`  ⚠️  Role ${role.name} já existe`);
      }
    });
    
    // ========================
    // EQUIPMENT TYPES
    // ========================
    console.log('Inserindo tipos de equipamento...');
    const equipmentTypes = [
      { name: 'DISTRIBUTION', category: 'ELECTRICAL', description: 'Quadros de distribuição elétrica' },
      { name: 'UPS', category: 'POWER_PROTECTION', description: 'Unidades de alimentação ininterrupta' },
      { name: 'GENERATOR', category: 'POWER_SOURCE', description: 'Geradores de energia' },
      { name: 'COOLING', category: 'HVAC', description: 'Sistemas de climatização' },
      { name: 'RECTIFIER', category: 'DC_POWER', description: 'Retificadores para alimentação DC' },
      { name: 'TRANSFER', category: 'ELECTRICAL', description: 'Sistemas de transferência' }
    ];
    
    const insertEquipmentType = db.prepare('INSERT INTO equipment_types (name, category, description) VALUES (?, ?, ?)');
    equipmentTypes.forEach(type => {
      try {
        insertEquipmentType.run(type.name, type.category, type.description);
        console.log(`  ✅ Tipo ${type.name} inserido`);
      } catch (e) {
        console.log(`  ⚠️  Tipo ${type.name} já existe`);
      }
    });
    
    // ========================
    // TECHNICAL EQUIPMENT
    // ========================
    console.log('Inserindo equipamentos técnicos...');
    const equipment = [
      { name: 'CONCESSIONÁRIA', type_id: null, function: 'Fornecimento de energia primária', location: 'Externo', system: 'PRIMARY_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'PADRÃO DE ENTRADA / CABINE PRIMÁRIA', type_id: null, function: 'Entrada de energia elétrica', location: 'Entrada', system: 'PRIMARY_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QTA', type_id: null, function: 'Quadro de transferência automática', location: 'Entrada', system: 'TRANSFER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'ATM', type_id: null, function: 'Chave de transferência manual', location: 'Entrada', system: 'TRANSFER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'GERADOR', type_id: null, function: 'Gerador de energia de emergência', location: 'Área de geradores', system: 'BACKUP_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDGE', type_id: null, function: 'Quadro geral de energia', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDNB / QDT BYPASS', type_id: null, function: 'Quadro de distribuição normal/bypass', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'UPS 1', type_id: null, function: 'Unidade de alimentação ininterrupta 1', location: 'Sala de UPS', system: 'UPS', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'UPS 2', type_id: null, function: 'Unidade de alimentação ininterrupta 2', location: 'Sala de UPS', system: 'UPS', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDLE', type_id: null, function: 'Quadro de distribuição de iluminação emergencial', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QFAC', type_id: null, function: 'Quadro de força de ar condicionado', location: 'Data Center', system: 'COOLING', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'FCC 01', type_id: null, function: 'Fonte de corrente contínua 1', location: 'Sala de baterias', system: 'DC_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'FCC 02', type_id: null, function: 'Fonte de corrente contínua 2', location: 'Sala de baterias', system: 'DC_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDNB', type_id: null, function: 'Quadro de distribuição normal', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDNB 1', type_id: null, function: 'Quadro de distribuição normal 1', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDNB 2', type_id: null, function: 'Quadro de distribuição normal 2', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDT 1', type_id: null, function: 'Quadro de distribuição de transferência 1', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDT 2', type_id: null, function: 'Quadro de distribuição de transferência 2', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDF', type_id: null, function: 'Quadro de distribuição de força', location: 'Data Center', system: 'DISTRIBUTION', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'QDCC', type_id: null, function: 'Quadro de distribuição de corrente contínua', location: 'Data Center', system: 'DC_POWER', source: 'REFERENCIA_DE_CAMPO' },
      { name: 'PDT', type_id: null, function: 'Painel de distribuição de transferência', location: 'Data Center', system: 'TRANSFER', source: 'REFERENCIA_DE_CAMPO' }
    ];
    
    const insertEquipment = db.prepare('INSERT INTO technical_equipment (name, type_id, function, location, system, source) VALUES (?, ?, ?, ?, ?, ?)');
    equipment.forEach(eq => {
      try {
        insertEquipment.run(eq.name, eq.type_id, eq.function, eq.location, eq.system, eq.source);
        console.log(`  ✅ Equipamento ${eq.name} inserido`);
      } catch (e) {
        console.log(`  ⚠️  Equipamento ${eq.name} já existe`);
      }
    });
    
    // ========================
    // TRAINING MODULES
    // ========================
    console.log('Inserindo módulos de treinamento...');
    const modules = [
      { title: 'Visão Geral da Infraestrutura', description: 'Visão geral do sistema de infraestrutura elétrica crítica', order_num: 1, category: 'CONCEITO_GERAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Caminho da Energia', description: 'Trajeto da energia desde a concessionária até os equipamentos finais', order_num: 2, category: 'CONCEITO_GERAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Gerador e Transferência', description: 'Funcionamento do gerador e sistemas de transferência', order_num: 3, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'QDGE e Distribuição', description: 'Quadro geral de energia e sistema de distribuição', order_num: 4, category: 'CONFIGURACAO_AMBIENTE', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'UPS', description: 'Unidades de alimentação ininterrupta e funcionamento', order_num: 5, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'FCC e Sistema DC', description: 'Fontes de corrente contínua e sistema DC', order_num: 6, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Bancos de Baterias', description: 'Bancos de baterias e manutenção', order_num: 7, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'QFAC e Climatização', description: 'Sistema de climatização do data center', order_num: 8, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Rotina da Manutenção Preventiva', description: 'Procedimentos de manutenção preventiva', order_num: 9, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Medições Elétricas', description: 'Realização de medições elétricas básicas', order_num: 10, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Medição de Corrente dos Circuitos', description: 'Medição de corrente em circuitos específicos', order_num: 11, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Inspeção e Anormalidades', description: 'Identificação de anormalidades durante inspeção', order_num: 12, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Teste de Baterias', description: 'Procedimentos de teste de baterias', order_num: 13, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Procedimento FCC', description: 'Procedimento específico de FCC', order_num: 14, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'HIOKI BT3554-01', description: 'Uso do equipamento HIOKI BT3554-01', order_num: 15, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Infratel e Registro', description: 'Sistema Infratel e procedimentos de registro', order_num: 16, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' },
      { title: 'Segurança', description: 'Normas de segurança elétrica', order_num: 17, category: 'PROCEDIMENTO_OPERACIONAL', status: 'PENDING_TECHNICAL_VALIDATION' }
    ];
    
    const insertModule = db.prepare('INSERT INTO training_modules (title, description, order_num, category, status) VALUES (?, ?, ?, ?, ?)');
    modules.forEach(mod => {
      try {
        insertModule.run(mod.title, mod.description, mod.order_num, mod.category, mod.status);
        console.log(`  ✅ Módulo ${mod.title} inserido`);
      } catch (e) {
        console.log(`  ⚠️  Módulo ${mod.title} já existe`);
      }
    });
    
    // ========================
    // EQUIPMENT RELATIONSHIPS
    // ========================
    console.log('Inserindo relações de equipamento...');
    
    // Buscar IDs dos equipamentos
    const getEquipmentId = db.prepare('SELECT id FROM technical_equipment WHERE name = ?');
    
    const getEqId = (name) => {
      const result = getEquipmentId.get(name);
      return result ? result.id : null;
    };
    
    const relationships = [
      // Topologia principal
      { source: 'CONCESSIONÁRIA', target: 'PADRÃO DE ENTRADA / CABINE PRIMÁRIA', type: 'POWERS', order: 1 },
      { source: 'PADRÃO DE ENTRADA / CABINE PRIMÁRIA', target: 'QTA', type: 'POWERS', order: 2 },
      { source: 'PADRÃO DE ENTRADA / CABINE PRIMÁRIA', target: 'ATM', type: 'POWERS', order: 3 },
      { source: 'QTA', target: 'GERADOR', type: 'CONTROLS', order: 4 },
      { source: 'ATM', target: 'GERADOR', type: 'CONTROLS', order: 5 },
      { source: 'GERADOR', target: 'QDGE', type: 'POWERS', order: 6 },
      
      // Do QDGE
      { source: 'QDGE', target: 'QDNB / QDT BYPASS', type: 'DISTRIBUTES', order: 7 },
      { source: 'QDGE', target: 'UPS 1', type: 'POWERS', order: 8 },
      { source: 'QDGE', target: 'UPS 2', type: 'POWERS', order: 9 },
      { source: 'QDGE', target: 'QDLE', type: 'POWERS', order: 10 },
      { source: 'QDGE', target: 'QFAC', type: 'POWERS', order: 11 },
      { source: 'QDGE', target: 'FCC 01', type: 'POWERS', order: 12 },
      { source: 'QDGE', target: 'FCC 02', type: 'POWERS', order: 13 },
      { source: 'QDGE', target: 'QDNB', type: 'DISTRIBUTES', order: 14 },
      
      // Caminhos AC
      { source: 'UPS 1', target: 'QDNB 1', type: 'POWERS', order: 15 },
      { source: 'QDNB 1', target: 'QDT 1', type: 'DISTRIBUTES', order: 16 },
      { source: 'UPS 2', target: 'QDNB 2', type: 'POWERS', order: 17 },
      { source: 'QDNB 2', target: 'QDT 2', type: 'DISTRIBUTES', order: 18 },
      
      // Caminhos DC
      { source: 'FCC 01', target: 'QDF', type: 'POWERS', order: 19 },
      { source: 'FCC 02', target: 'QDF', type: 'POWERS', order: 20 },
      
      // Climatização
      { source: 'QFAC', target: 'EVAPORADORAS / CONDENSADORAS', type: 'CONTROLS', order: 21 }
    ];
    
    const insertRelationship = db.prepare('INSERT INTO equipment_relationships (source_id, target_id, relationship_type, description, relation_order) VALUES (?, ?, ?, ?, ?)');
    relationships.forEach(rel => {
      const sourceId = getEqId(rel.source);
      const targetId = getEqId(rel.target);
      
      if (sourceId && targetId) {
        try {
          insertRelationship.run(sourceId, targetId, rel.type, rel.description || '', rel.order);
          console.log(`  ✅ Relação ${rel.source} → ${rel.target} inserida`);
        } catch (e) {
          console.log(`  ⚠️  Relação ${rel.source} → ${rel.target} já existe`);
        }
      } else {
        console.log(`  ⚠️  Não foi possível criar relação ${rel.source} → ${rel.target} (equipamento não encontrado)`);
      }
    });
    
    db.close();
    console.log('✅ Seed concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro no seed:', error);
    process.exit(1);
  }
}

main();