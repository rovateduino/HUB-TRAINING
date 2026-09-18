const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

async function main() {
  console.log('Migrando conteúdo estático para lições estruturadas...\n');
  
  try {
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // ========================
    // MÓDULO 1: Visão Geral da Infraestrutura
    // ========================
    console.log('1. MÓDULO: Visão Geral da Infraestrutura');
    
    const module1 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('Visão Geral da Infraestrutura');
    
    const lesson1_1 = {
      module_id: module1.id,
      title: 'Arquitetura Elétrica',
      order_num: 1,
      objective: 'Entender o caminho da energia desde a concessionária até os equipamentos finais',
      content: `
<h2>Arquitetura Elétrica</h2>
<p>Antes de medir, o profissional deve saber de onde a energia vem, por onde passa, qual equipamento condiciona/protege a alimentação, para onde ela vai e o que acontece se um ponto falhar.</p>

<h3>Caminho da Energia</h3>
<ul>
  <li>Concessionária → Padrão/Cabine</li>
  <li>Padrão/Cabine → QTA/ATM</li>
  <li>QTA/ATM ↔ Gerador</li>
  <li>QDGE → UPS / FCC / QFAC</li>
  <li>UPS → QDNB → QDT → carga AC</li>
  <li>FCC → QDF → carga DC</li>
</ul>

<h3>Equipamentos Principais</h3>
<p>O sistema consiste em equipamentos interconectados que garantem a continuidade da alimentação elétrica crítica do data center.</p>
      `,
      classification: 'CONCEITO_GERAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson1_1.module_id, lesson1_1.title, lesson1_1.order_num, lesson1_1.objective, lesson1_1.content, lesson1_1.classification, lesson1_1.status);
      console.log(`  ✅ Lição criada: ${lesson1_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson1_1.title}`);
    }
    
    // ========================
    // MÓDULO 2: Caminho da Energia
    // ========================
    console.log('\n2. MÓDULO: Caminho da Energia');
    
    const module2 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('Caminho da Energia');
    
    const lesson2_1 = {
      module_id: module2.id,
      title: 'Detalhamento do Caminho da Energia',
      order_num: 1,
      objective: 'Compreender cada etapa do caminho da energia e os equipamentos envolvidos',
      content: `
<h2>Detalhamento do Caminho da Energia</h2>
<p>O caminho da energia começa na concessionária e passa por diversos equipamentos até chegar aos dispositivos finais.</p>

<h3>Etapas do Caminho</h3>
<ol>
  <li><strong>Concessionária:</strong> Fornecimento de energia primária</li>
  <li><strong>Padrão de Entrada / Cabine Primária:</strong> Entrada de energia elétrica</li>
  <li><strong>QTA / ATM:</strong> Sistemas de transferência automática e manual</li>
  <li><strong>Gerador:</strong> Fonte de energia de emergência</li>
  <li><strong>QDGE:</strong> Quadro geral de energia</li>
  <li><strong>UPS 1 e UPS 2:</strong> Unidades de alimentação ininterrupta</li>
  <li><strong>FCC 01 e FCC 02:</strong> Fontes de corrente contínua</li>
  <li><strong>QFAC:</strong> Quadro de força de ar condicionado</li>
</ol>
      `,
      classification: 'CONCEITO_GERAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson2_1.module_id, lesson2_1.title, lesson2_1.order_num, lesson2_1.objective, lesson2_1.content, lesson2_1.classification, lesson2_1.status);
      console.log(`  ✅ Lição criada: ${lesson2_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson2_1.title}`);
    }
    
    // ========================
    // MÓDULO 3: Gerador e Transferência
    // ========================
    console.log('\n3. MÓDULO: Gerador e Transferência');
    
    const module3 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('Gerador e Transferência');
    
    const lesson3_1 = {
      module_id: module3.id,
      title: 'Funcionamento do Gerador e Transferência',
      order_num: 1,
      objective: 'Entender o funcionamento do gerador e sistemas de transferência QTA/ATM',
      content: `
<h2>Gerador e Transferência</h2>
<p>O gerador atua como fonte de energia de emergência quando há falha na alimentação da concessionária.</p>

<h3>Sistemas de Transferência</h3>
<ul>
  <li><strong>QTA:</strong> Quadro de transferência automática</li>
  <li><strong>ATM:</strong> Chave de transferência manual</li>
</ul>

<h3>Operação</h3>
<p>Em caso de falha da concessionária, o sistema detecta a ausência de energia e inicia o gerador. Após estabilização, a transferência é realizada para o gerador.</p>
      `,
      classification: 'PROCEDIMENTO_OPERACIONAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson3_1.module_id, lesson3_1.title, lesson3_1.order_num, lesson3_1.objective, lesson3_1.content, lesson3_1.classification, lesson3_1.status);
      console.log(`  ✅ Lição criada: ${lesson3_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson3_1.title}`);
    }
    
    // ========================
    // MÓDULO 4: QDGE e Distribuição
    // ========================
    console.log('\n4. MÓDULO: QDGE e Distribuição');
    
    const module4 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('QDGE e Distribuição');
    
    const lesson4_1 = {
      module_id: module4.id,
      title: 'Quadro Geral de Energia',
      order_num: 1,
      objective: 'Compreender o papel do QDGE na distribuição de energia',
      content: `
<h2>QDGE - Quadro Geral de Energia</h2>
<p>O QDGE é o ponto central de distribuição de energia para os sistemas críticos do data center.</p>

<h3>Distribuição a partir do QDGE</h3>
<ul>
  <li>QDNB / QDT BYPASS</li>
  <li>UPS 1</li>
  <li>UPS 2</li>
  <li>QDLE</li>
  <li>QFAC</li>
  <li>FCC 01</li>
  <li>FCC 02</li>
  <li>QDNB</li>
</ul>
      `,
      classification: 'CONFIGURACAO_AMBIENTE',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson4_1.module_id, lesson4_1.title, lesson4_1.order_num, lesson4_1.objective, lesson4_1.content, lesson4_1.classification, lesson4_1.status);
      console.log(`  ✅ Lição criada: ${lesson4_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson4_1.title}`);
    }
    
    // ========================
    // MÓDULO 5: UPS
    // ========================
    console.log('\n5. MÓDULO: UPS');
    
    const module5 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('UPS');
    
    const lesson5_1 = {
      module_id: module5.id,
      title: 'Unidades de Alimentação Ininterrupta',
      order_num: 1,
      objective: 'Entender o funcionamento das UPS no sistema',
      content: `
<h2>UPS - Unidades de Alimentação Ininterrupta</h2>
<p>As UPS garantem a continuidade da alimentação durante falhas de energia ou transferências entre fontes.</p>

<h3>Caminhos AC</h3>
<ul>
  <li>UPS 1 → QDNB 1 → QDT 1 → CARGA AC</li>
  <li>UPS 2 → QDNB 2 → QDT 2 → CARGA AC</li>
</ul>

<h3>Função</h3>
<p>Proporcionar alimentação contínua e com qualidade adequada para os equipamentos críticos.</p>
      `,
      classification: 'PROCEDIMENTO_OPERACIONAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson5_1.module_id, lesson5_1.title, lesson5_1.order_num, lesson5_1.objective, lesson5_1.content, lesson5_1.classification, lesson5_1.status);
      console.log(`  ✅ Lição criada: ${lesson5_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson5_1.title}`);
    }
    
    // ========================
    // MÓDULO 6: FCC e Sistema DC
    // ========================
    console.log('\n6. MÓDULO: FCC e Sistema DC');
    
    const module6 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('FCC e Sistema DC');
    
    const lesson6_1 = {
      module_id: module6.id,
      title: 'Fontes de Corrente Contínua',
      order_num: 1,
      objective: 'Compreender o funcionamento do FCC e sistema DC',
      content: `
<h2>FCC - Fontes de Corrente Contínua</h2>
<p>As FCC convertem energia AC em DC para alimentar equipamentos que operam em corrente contínua.</p>

<h3>Caminhos DC</h3>
<ul>
  <li>FCC 01 → QDF → CARGA DC</li>
  <li>FCC 02 → QDF → CARGA DC</li>
</ul>

<h3>Função</h3>
<p>Prover alimentação em corrente contínua estabilizada para equipamentos de telecomunicações e outros dispositivos críticos.</p>
      `,
      classification: 'PROCEDIMENTO_OPERACIONAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson6_1.module_id, lesson6_1.title, lesson6_1.order_num, lesson6_1.objective, lesson6_1.content, lesson6_1.classification, lesson6_1.status);
      console.log(`  ✅ Lição criada: ${lesson6_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson6_1.title}`);
    }
    
    // ========================
    // MÓDULO 7: Bancos de Baterias
    // ========================
    console.log('\n7. MÓDULO: Bancos de Baterias');
    
    const module7 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('Bancos de Baterias');
    
    const lesson7_1 = {
      module_id: module7.id,
      title: 'Bancos de Baterias UPS e FCC',
      order_num: 1,
      objective: 'Entender as diferenças entre baterias de UPS e FCC',
      content: `
<h2>Bancos de Baterias</h2>
<p>Os bancos de baterias garantem a autonomia do sistema durante falhas de energia.</p>

<h3>UPS</h3>
<p>Referência de campo informada: baterias de 12 V / 150 Ah, com aproximadamente 13,7 V em flutuação. A configuração informada inclui 40 elementos.</p>

<h3>FCC</h3>
<p>Há sites com baterias de 12 V e outros com baterias seladas de 2 V / 1000 Ah. Também existem baterias que exigem manutenção conforme especificação do fabricante, incluindo reposição com água desmineralizada quando prevista.</p>

<h3>Regra de avaliação</h3>
<p>Medir elemento por elemento. Comparar comportamento em flutuação e descarga. Se houver elemento suspeito, aplicar o teste complementar previsto e avaliar resistência interna.</p>
      `,
      classification: 'PROCEDIMENTO_OPERACIONAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson7_1.module_id, lesson7_1.title, lesson7_1.order_num, lesson7_1.objective, lesson7_1.content, lesson7_1.classification, lesson7_1.status);
      console.log(`  ✅ Lição criada: ${lesson7_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson7_1.title}`);
    }
    
    // ========================
    // MÓDULO 8: QFAC e Climatização
    // ========================
    console.log('\n8. MÓDULO: QFAC e Climatização');
    
    const module8 = db.prepare('SELECT id FROM training_modules WHERE title = ?').get('QFAC e Climatização');
    
    const lesson8_1 = {
      module_id: module8.id,
      title: 'Sistema de Climatização',
      order_num: 1,
      objective: 'Compreender o sistema de climatização do data center',
      content: `
<h2>QFAC e Climatização</h2>
<p>O sistema de climatização mantém a temperatura adequada para o funcionamento dos equipamentos.</p>

<h3>Caminho da Climatização</h3>
<ul>
  <li>QFAC → EVAPORADORAS / CONDENSADORAS → CLIMATIZAÇÃO DO DATA CENTER</li>
</ul>

<h3>Função</h3>
<p>Manter a temperatura e umidade dentro dos parâmetros especificados para garantir a operação segura dos equipamentos.</p>
      `,
      classification: 'PROCEDIMENTO_OPERACIONAL',
      status: 'PENDING_TECHNICAL_VALIDATION'
    };
    
    try {
      const result = db.prepare(`
        INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(lesson8_1.module_id, lesson8_1.title, lesson8_1.order_num, lesson8_1.objective, lesson8_1.content, lesson8_1.classification, lesson8_1.status);
      console.log(`  ✅ Lição criada: ${lesson8_1.title} (ID: ${result.lastInsertRowid})`);
    } catch (e) {
      console.log(`  ⚠️  Lição já existe: ${lesson8_1.title}`);
    }
    
    // ========================
    // RESUMO
    // ========================
    console.log('\n=== RESUMO DA MIGRAÇÃO ===');
    const totalLessons = db.prepare('SELECT COUNT(*) as count FROM training_lessons').get();
    console.log(`✅ Total de lições no banco: ${totalLessons.count}`);
    console.log('✅ Conteúdo estático migrado para estrutura modular');
    console.log('⚠️  Status: PENDING_TECHNICAL_VALIDATION (aguarda validação técnica)\n');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

main();