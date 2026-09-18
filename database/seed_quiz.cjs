// Migra as 30 questões do app.py para questions/question_options (fonte: conteúdo ensinado)
const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../training.db');

const QUESTIONS = [
['Arquitetura','Qual é a lógica geral correta do caminho da energia no HUB/Site?',['Concessionária → Padrão/Cabine → QTA/ATM → QDGE → sistemas/cargas','UPS → QDGE → Concessionária → cargas','FCC → Padrão → Gerador → QDGE','QFAC → QTA → UPS → Concessionária'],0],
['Arquitetura','Qual é a função do QDGE dentro da arquitetura apresentada?',['É somente o quadro das baterias do UPS','É um ponto importante de distribuição para diversos sistemas, incluindo UPS, FCC e QFAC','É exclusivamente o quadro das cargas DC','É exclusivamente o quadro de climatização'],1],
['Emergência','Quando ocorre perda da alimentação normal, qual sistema de emergência participa da continuidade de alimentação conforme o fluxograma?',['Somente o QFAC','Somente o QDF','O gerador, através da lógica de transferência/gerenciamento','Somente os racks'],2],
['Redundância','No fluxograma estudado, UPS 1 e UPS 2 são apresentados como:',['Equipamentos sem relação entre si','Redundância um do outro','Dois geradores','Dois QDF'],1],
['Redundância','FCC 1 e FCC 2 são apresentados no material como:',['Redundância um do outro','Dois QTA','Dois QFAC','Dois bancos de UPS'],0],
['Climatização','Qual é o caminho simplificado da climatização mostrado no fluxograma?',['QDGE → QFAC → evaporadoras/condensadoras → climatização do Data Center','UPS → QDF → evaporadoras → QTA','FCC → QDNB → climatização','QDT → QDCC → climatização'],0],
['Operação','Qual é a janela de manutenção informada para as atividades?',['06:00 às 12:00','12:00 às 18:00','18:00 às 00:00','21:00 às 06:45'],3],
['Ticket','Antes de iniciar uma atividade que depende de autorização, o profissional deve:',['Começar pelas medições e abrir o ticket depois','Entender o ticket e aguardar a liberação/autorização do Centro de Gerenciamento do Site','Desligar o QDGE imediatamente','Iniciar somente se estiver sozinho'],1],
['Ticket','Qual informação é importante conferir no ticket?',['Somente o nome do técnico','Somente o horário','Site, janela, atividade, equipamento/andar afetado, responsáveis e observações/restrições','Somente a empresa'],2],
['Equipe','Como normalmente é dividida a atividade entre duas pessoas?',['Uma mede e a outra registra/confere os dados','Uma trabalha e a outra fica sem função','As duas fazem somente relatório','As duas ficam somente aguardando o ticket'],0],
['Infratel','Qual é a finalidade do registro no Infratel?',['Apenas substituir o ticket','Registrar os resultados, evidências e condições encontradas, formando histórico da manutenção','Somente registrar presença','Somente registrar horário de saída'],1],
['Medições AC','Quais são exemplos de pontos em que a equipe mede tensão AC?',['Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC','Somente QDF e QDCC','Somente bancos de baterias','Somente FCC'],0],
['Medições DC','Quais são exemplos de pontos em que a equipe mede tensão DC?',['Padrão de Entrada e QFAC','QDF, QDCC e bancos de baterias de UPS/FCC','Somente QTA','Somente QDGE'],1],
['Medições AC','Quais relações de tensão AC podem fazer parte das medições, conforme o ponto e procedimento aplicável?',['Somente fase-fase','Somente fase-neutro','Fase-fase, fase-neutro e fase-terra, conforme aplicável','Somente neutro-terra em todos os casos'],2],
['Corrente','Além da tensão, o que a equipe mede nos circuitos/disjuntores?',['Somente temperatura ambiente','Corrente de cada circuito/disjuntor','Somente resistência de isolamento em todos os circuitos','Somente potência mecânica'],1],
['Corrente','Ao encontrar uma corrente elevada em um circuito, qual é uma sequência adequada de investigação?',['Trocar o disjuntor imediatamente sem investigar','Identificar circuito/rack, verificar a carga e a redundância das fontes e avaliar o balanceamento conforme procedimento','Desligar todas as UPS','Ignorar se a tensão estiver normal'],1],
['Balanceamento','Por que verificar a distribuição das cargas entre as fases?',['Para eliminar a necessidade de disjuntores','Para avaliar desequilíbrios e melhorar a distribuição da carga conforme projeto/procedimento','Para aumentar a tensão','Para substituir o gerador'],1],
['Redundância','Antes de alterar a alimentação de um rack, por que verificar se o equipamento possui fonte redundante?',['Para saber a marca do rack','Para preservar a continuidade da carga e entender se existe outro caminho de alimentação','Para aumentar a frequência','Para desligar o QFAC'],1],
['UPS','No material fornecido, qual configuração de baterias foi informada como típica para o UPS?',['40 elementos de bateria','4 elementos de 2 V','12 elementos de 1000 Ah','48 elementos exclusivamente no UPS'],0],
['UPS','Qual é a referência de campo informada para uma bateria de UPS de 12 V / 150 Ah em flutuação?',['Aproximadamente 9 V','Aproximadamente 12,0 V','Aproximadamente 13,7 V','Aproximadamente 24 V'],2],
['Baterias','Como as baterias são avaliadas na preventiva?',['Somente pela tensão total do banco','Uma a uma, com medições em flutuação e descarga e testes complementares quando necessário','Somente visualmente','Somente pelo ano de fabricação'],1],
['FCC','Qual outra tecnologia de bateria foi informada como existente em alguns FCC?',['Bateria selada 2 V / 1000 Ah','Bateria automotiva 1,5 V','Bateria alcalina AA','Bateria de lítio de celular'],0],
['Baterias','Quando uma bateria apresenta comportamento abaixo do esperado em flutuação ou descarga, o que pode ocorrer na rotina de diagnóstico?',['É automaticamente descartada sem teste','É submetida a teste complementar e avaliação de resistência interna','O rack é desligado sem análise','Somente o QFAC é medido'],1],
['Descarga FCC','No procedimento fornecido para descarga dos retificadores, qual é a sequência inicial?',['Ajustes de Parâmetros > ACU → Manual → Bat. em Descarga 47,0','Desligar o QDGE → QFAC → Automático','Manutenção > Grupo Ret → desligar todas as baterias','Infratel → exportar CSV → Manual'],0],
['Descarga FCC','Durante o procedimento informado, o Grupo Ret é ajustado para qual tensão para a etapa de descarga?',['12,00 V','24,00 V','48,00 V','54,00 V'],2],
['Descarga FCC','Após a descarga, qual é a condição final que deve ser confirmada no procedimento informado?',['Sistema permanecer em Manual e 48 V','Retornar a Automático e confirmar recuperação para aproximadamente 54,00 V','Desligar o retificador','Manter Bat. em Descarga em 47,0'],1],
['HIOKI','Antes das medições com o HIOKI BT3554-01, qual ajuste é realizado para conferir o zero do instrumento?',['0-ADJ','File Acquisition','Search','Export'],0],
['HIOKI','Qual é a vantagem de manter o A.MEM (Auto Memory) ativo durante uma sequência de medições?',['Ele aumenta a tensão da bateria','Ele registra automaticamente as leituras quando estabilizam','Ele desliga o banco','Ele altera a resistência da bateria'],1],
['Diagnóstico','Qual é a melhor forma de interpretar uma anomalia de bateria?',['Olhar apenas um número isolado','Considerar tensão, comportamento em descarga, resistência interna, comparação com outros elementos e condição física/histórico','Considerar somente a idade','Considerar somente a tensão total do banco'],1],
['Segurança','Qual princípio deve prevalecer durante uma preventiva em ambiente crítico?',['Executar o mais rápido possível, mesmo fora do procedimento','Preservar segurança, autorização, continuidade operacional e seguir os procedimentos aplicáveis','Fazer alterações sem registrar','Ignorar alarmes sempre que possível'],1],
];
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.prepare('DELETE FROM quiz_answers').run();
db.prepare('DELETE FROM quiz_attempts').run();
db.prepare('DELETE FROM question_options').run();
db.prepare('DELETE FROM questions').run();
QUESTIONS.forEach((q, i) => {
  const [cat, text, opts, correct] = q;
  const r = db.prepare(`INSERT INTO questions (category, question, difficulty, is_active, order_num) VALUES (?,?, 'MEDIUM', 1, ?)`).run(cat, text, i + 1);
  opts.forEach((t, j) => db.prepare(`INSERT INTO question_options (question_id, option_text, order_num, is_correct) VALUES (?,?,?,?)`).run(r.lastInsertRowid, t, j + 1, j === correct ? 1 : 0));
});
console.log('OK quiz: q=' + db.prepare('SELECT COUNT(*) c FROM questions').get().c + ' opts=' + db.prepare('SELECT COUNT(*) c FROM question_options').get().c);
db.close();
