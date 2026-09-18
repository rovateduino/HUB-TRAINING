const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../training.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// 1) Deduplicar checkpoints (mesma lesson + mesma question)
const all = db.prepare('SELECT id, lesson_id, question FROM lesson_checkpoints ORDER BY id ASC').all();
const seen = new Set();
for (const c of all) {
  const k = c.lesson_id + '|' + c.question.trim().toLowerCase();
  if (seen.has(k)) {
    db.prepare('DELETE FROM lesson_checkpoints WHERE id=?').run(c.id);
    console.log('Removido duplicado id=' + c.id);
  } else seen.add(k);
}

// 2) Opções para os checkpoints existentes (conteúdo ensinado)
const OPTS = {
  'Qual é a função principal do QDGE?': [['Distribuir energia para UPS, FCC, QFAC e demais quadros', 1], ['Alimentar apenas climatização', 0], ['Gerar energia', 0], ['Medir corrente dos racks', 0]],
  'O que significa UPS?': [['Unidade de alimentação ininterrupta', 1], ['Unidade de proteção solar', 0], ['Quadro de transferência', 0], ['Fonte de corrente contínua', 0]],
  'Qual é a função do FCC?': [['Converter AC em DC para cargas DC via QDF', 1], ['Climatizar o data center', 0], ['Transferir gerador', 0], ['Medir fase-terra', 0]],
};
const cps = db.prepare('SELECT * FROM lesson_checkpoints').all();
for (const c of cps) {
  const n = db.prepare('SELECT COUNT(*) c FROM checkpoint_options WHERE checkpoint_id=?').get(c.id).c;
  if (n > 0) continue;
  const opts = OPTS[c.question] || [[ 'Resposta correta conforme conteúdo da aula', 1 ], [ 'Alternativa incorreta A', 0 ], [ 'Alternativa incorreta B', 0 ], [ 'Alternativa incorreta C', 0 ]];
  opts.forEach((o, i) => db.prepare('INSERT INTO checkpoint_options (checkpoint_id, option_text, order_num, is_correct) VALUES (?,?,?,?)').run(c.id, o[0], i + 1, o[1]));
  console.log('Opções criadas cp=' + c.id);
}

// 3) Um checkpoint por lição sem checkpoint (conteúdo realmente ensinado)
const NEW_CP = [
  ['Detalhamento do Caminho da Energia', 'Qual é a lógica geral correta do caminho da energia?', ['Concessionária → Padrão/Cabine → QTA/ATM → QDGE → sistemas/cargas', 'UPS → QDGE → Concessionária → cargas', 'FCC → Padrão → Gerador → QDGE', 'QFAC → QTA → UPS → Concessionária'], 0],
  ['Funcionamento do Gerador e Transferência', 'Quando ocorre perda da alimentação normal, qual sistema participa da continuidade conforme o fluxograma?', ['Somente o QFAC', 'Somente o QDF', 'O gerador, através da lógica de transferência/gerenciamento', 'Somente os racks'], 2],
  ['Quadro Geral de Energia', 'O QDGE distribui energia para quais sistemas?', ['Apenas climatização', 'UPS, FCC, QFAC, QDNB e demais quadros', 'Apenas cargas DC', 'Apenas gerador'], 1],
  ['Unidades de Alimentação Ininterrupta', 'Como UPS 1 e UPS 2 são apresentados no material?', ['Sem relação entre si', 'Redundância um do outro', 'Dois geradores', 'Dois QDF'], 1],
  ['Fontes de Corrente Contínua', 'Como FCC 1 e FCC 2 são apresentados?', ['Redundância um do outro', 'Dois QTA', 'Dois QFAC', 'Dois bancos de UPS'], 0],
  ['Bancos de Baterias UPS e FCC', 'Como as baterias são avaliadas na preventiva?', ['Somente pela tensão total', 'Uma a uma, em flutuação e descarga, com testes complementares quando necessário', 'Somente visualmente', 'Somente pelo ano de fabricação'], 1],
  ['Sistema de Climatização', 'Qual é o caminho da climatização?', ['QDGE → QFAC → evaporadoras/condensadoras → climatização', 'UPS → QDF → evaporadoras → QTA', 'FCC → QDNB → climatização', 'QDT → QDCC → climatização'], 0],
  ['Rotina da Manutenção Preventiva', 'Qual é a janela de manutenção informada?', ['06:00 às 12:00', '12:00 às 18:00', '18:00 às 00:00', '21:00 às 06:45'], 3],
  ['Medições Elétricas AC e DC', 'Quais são exemplos de pontos de medição de tensão AC?', ['Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC', 'Somente QDF e QDCC', 'Somente bancos de baterias', 'Somente FCC'], 0],
  ['Medição de Corrente dos Circuitos', 'Ao encontrar corrente elevada, qual sequência é adequada?', ['Trocar o disjuntor imediatamente', 'Identificar circuito/rack, verificar carga e redundância e avaliar balanceamento', 'Desligar todas as UPS', 'Ignorar se a tensão estiver normal'], 1],
  ['Inspeção e Anormalidades', 'O que a inspeção preventiva deve identificar?', ['Apenas temperatura ambiente', 'Aquecimento, corrente/tensão anormal, degradação e anormalidades em baterias/quadros', 'Apenas marca dos racks', 'Apenas horário'], 1],
  ['Teste de Baterias', 'Qual a melhor forma de interpretar uma anomalia de bateria?', ['Olhar apenas um número isolado', 'Considerar tensão, descarga, resistência interna, comparação e histórico', 'Considerar somente a idade', 'Considerar somente a tensão total'], 1],
  ['Procedimento FCC — Descarga dos Retificadores', 'No procedimento informado, o Grupo Ret é ajustado para qual tensão na descarga?', ['12,00 V', '24,00 V', '48,00 V', '54,00 V'], 2],
  ['HIOKI BT3554-01 — Medição e Registro', 'Antes das medições com o HIOKI, qual ajuste confere o zero?', ['0-ADJ', 'File Acquisition', 'Search', 'Export'], 0],
  ['Infratel e Registro', 'Qual é a finalidade do registro no Infratel?', ['Apenas substituir o ticket', 'Registrar resultados, evidências e condições, formando histórico', 'Somente registrar presença', 'Somente registrar saída'], 1],
  ['Segurança — NR-10 e Procedimentos', 'Qual princípio prevalece na preventiva em ambiente crítico?', ['Executar o mais rápido possível', 'Preservar segurança, autorização, continuidade e seguir procedimentos', 'Fazer alterações sem registrar', 'Ignorar alarmes'], 1],
  ['Arquitetura Elétrica', 'Qual é a função do QDGE?', ['Somente quadro das baterias', 'Ponto de distribuição para UPS, FCC, QFAC e demais sistemas', 'Exclusivamente cargas DC', 'Exclusivamente climatização'], 1],
];
for (const [lessonTitle, q, opts, correct] of NEW_CP) {
  const lesson = db.prepare('SELECT id FROM training_lessons WHERE title=?').get(lessonTitle);
  if (!lesson) { console.log('Lição não encontrada: ' + lessonTitle); continue; }
  const ex = db.prepare('SELECT id FROM lesson_checkpoints WHERE lesson_id=? AND question=?').get(lesson.id, q);
  if (ex) continue;
  const maxO = db.prepare('SELECT COALESCE(MAX(order_num),0) m FROM lesson_checkpoints WHERE lesson_id=?').get(lesson.id).m;
  const r = db.prepare('INSERT INTO lesson_checkpoints (lesson_id, question, type, order_num, points) VALUES (?,?,?, ?,1)').run(lesson.id, q, 'MULTIPLE_CHOICE', maxO + 1);
  opts.forEach((t, i) => db.prepare('INSERT INTO checkpoint_options (checkpoint_id, option_text, order_num, is_correct) VALUES (?,?,?,?)').run(r.lastInsertRowid, t, i + 1, i === correct ? 1 : 0));
  console.log('Checkpoint criado: ' + lessonTitle);
}
console.log('CP total=' + db.prepare('SELECT COUNT(*) c FROM lesson_checkpoints').get().c + ' OPTS=' + db.prepare('SELECT COUNT(*) c FROM checkpoint_options').get().c);
db.close();
