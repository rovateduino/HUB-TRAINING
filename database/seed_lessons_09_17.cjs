const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../training.db');

// Conteúdo derivado EXCLUSIVAMENTE das informações já definidas no projeto
// (DOCUMENTAÇÃO MASTER + questões do simulado). Sem valores inventados.
const LESSONS = [
  { module: 'Rotina da Manutenção Preventiva', title: 'Rotina da Manutenção Preventiva', objective: 'Executar a rotina preventiva conforme fluxo, janela, ticket e autorização informados', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Rotina da Manutenção Preventiva</h2>
<p>Fluxo informado para a atividade de manutenção preventiva em HUB/Site.</p>
<h3>Fluxo</h3>
<ol>
<li>Janela normalmente 01:00–05:00.</li>
<li>Chegada ao HUB/Site com equipamentos de medição, ferramentas adequadas e EPIs/EPCs.</li>
<li>Abertura do Ticket de Entrada e acionamento da atividade.</li>
<li>Aguardar autorização do Site Management Center (Centro de Gerenciamento do Site).</li>
<li>Iniciar a atividade somente após autorização.</li>
<li>Normalmente dois profissionais quando aplicável: uma pessoa mede e a outra registra/confere os dados.</li>
<li>Execução: medição e registro nos pontos previstos.</li>
<li>Documentação, encerramento e relatório no Infratel, formando histórico da manutenção.</li>
</ol>
<p> Conferir no ticket: site, janela, atividade, equipamento/andar afetado, responsáveis e observações/restrições.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong> — fluxo descritivo; limites e critérios de aceitação não são definidos neste treinamento.</p>` },
  { module: 'Medições Elétricas', title: 'Medições Elétricas AC e DC', objective: 'Identificar pontos e grandezas das medições AC e DC', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Medições Elétricas</h2>
<h3>Pontos AC</h3><p>Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC.</p>
<h3>Pontos DC</h3><p>QDF, QDCC e bancos de baterias de UPS/FCC.</p>
<h3>Grandezas</h3><ul>
<li>AC: fase-fase, fase-neutro e fase-terra quando aplicável, corrente, frequência.</li>
<li>DC: tensão DC e corrente DC quando aplicável.</li></ul>
<p>Não há limites universais de aceitação definidos neste treinamento — seguir procedimento/projeto aplicável.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Medição de Corrente dos Circuitos', title: 'Medição de Corrente dos Circuitos', objective: 'Medir corrente por circuito e investigar anormalidades sem regra simplista', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Medição de Corrente dos Circuitos</h2>
<ul>
<li>Medir a corrente de cada circuito/disjuntor.</li>
<li>Ao identificar corrente elevada: identificar circuito e rack/equipamento, verificar a carga e a redundância das fontes, e avaliar o balanceamento de fases quando tecnicamente aplicável e autorizado.</li>
<li>Antes de alterar a alimentação de um rack, verificar se o equipamento possui fonte redundante para preservar a continuidade da carga.</li>
<li>Verificar a distribuição das cargas entre as fases para avaliar desequilíbrios conforme projeto/procedimento.</li>
</ul>
<p>A anormalidade deve gerar investigação técnica — <strong>não</strong> aplicar "corrente alta = trocar disjuntor".</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Inspeção e Anormalidades', title: 'Inspeção e Anormalidades', objective: 'Identificar preventivamente sinais que exigem investigação, registro e histórico', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Inspeção e Anormalidades</h2>
<p>Identificação preventiva de condições que exigem investigação:</p>
<ul>
<li>Aquecimento, corrente anormal, tensão anormal e sinais de degradação.</li>
<li>Anormalidades em baterias (comportamento em flutuação/descarga, condição física) e em quadros.</li>
<li>Qualquer condição fora do esperado deve ser registrada, com medições e evidências, formando histórico.</li>
</ul>
<p>Nenhum limite universal é definido neste treinamento — a avaliação segue procedimento/projeto aplicável.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Teste de Baterias', title: 'Teste de Baterias', objective: 'Avaliar baterias elemento a elemento com flutuação, descarga e testes complementares', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Teste de Baterias</h2>
<ul>
<li>Medição individual (uma a uma), em flutuação e em descarga: tensão e corrente quando aplicável.</li>
<li>Resistência interna e teste com resistor/carga quando previsto.</li>
<li>Comparação entre elementos, histórico e condição física.</li>
<li>Referências de campo informadas (não universais): UPS — baterias normalmente 12 V / aproximadamente 150 Ah, aproximadamente 13,7 V em flutuação, configuração informada de 40 elementos; FCC — configurações informadas com baterias seladas 2 V / aproximadamente 1000 Ah; 12 bancos / 48 baterias em determinadas instalações; algumas baterias de manutenção podem utilizar água desmineralizada conforme fabricante/procedimento aplicável.</li>
<li>Quando uma bateria apresenta comportamento abaixo do esperado, pode ser submetida a teste complementar e avaliação de resistência interna.</li>
</ul>
<p>Uma bateria não deve ser diagnosticada somente por uma leitura isolada; resistência interna isoladamente não é diagnóstico definitivo.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Procedimento FCC', title: 'Procedimento FCC — Descarga dos Retificadores', objective: 'Executar fielmente a sequência de descarga informada, sem expor credenciais', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Procedimento FCC — Descarga dos Retificadores</h2>
<p>Sequência fiel ao procedimento fornecido (não alterar valores nem ordem; senhas não são expostas):</p>
<ol>
<li>Ajustes de Parâmetros → ACU</li>
<li>Selecionar modo Manual</li>
<li>Bat. em Descarga = 47.0</li>
<li>Menu Principal → Manutenção → Grupo Ret</li>
<li>Ajustar tensão = 48.00 V</li>
<li>Aguardar aproximadamente 10 minutos (a duração pode variar conforme a carga do HUB)</li>
<li>Retornar para 54.00 V</li>
<li>Ajustes de Parâmetros → ACU</li>
<li>Bat. em Descarga = 49.2</li>
<li>Selecionar modo Automático</li>
<li>Verificar subida/retorno para aproximadamente 54.00 V</li>
</ol>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'HIOKI BT3554-01', title: 'HIOKI BT3554-01 — Medição e Registro', objective: 'Operar o HIOKI conforme fluxo informado: driver, 0-ADJ, medição, GENNECT One', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>HIOKI BT3554-01</h2>
<h3>Preparação</h3><ul>
<li>Instalar driver HIOKI (DPInst64.exe / DPInst32.exe) com execução como administrador.</li>
<li>Conectar via USB e confirmar reconhecimento do instrumento.</li></ul>
<h3>Medição</h3><ul>
<li>Realizar 0-ADJ para conferir o zero do instrumento.</li>
<li>Manter A.MEM (Auto Memory) ativo para registrar automaticamente as leituras quando estabilizam; MEMORY/armazenamento das leituras.</li>
<li>Medição individual, elemento a elemento.</li></ul>
<h3>Registro (GENNECT One)</h3><ul>
<li>Instrument Connection → Search → Connected; File Acquisition → Import → Data List; exportar PDF e CSV.</li></ul>
<p>Resistência interna não é apresentada isoladamente como diagnóstico definitivo — considerar tensão, descarga, comparação e histórico.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Infratel e Registro', title: 'Infratel e Registro', objective: 'Registrar atividade, medições, documentação e encerramento sem inventar telas', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Infratel e Registro</h2>
<p>Finalidade: registrar os resultados, evidências e condições encontradas, formando histórico da manutenção.</p>
<ul>
<li>Registro da atividade: ticket, autorização, execução, medições, documentação, relatório e encerramento.</li>
<li>Normalmente dois profissionais: uma pessoa mede e a outra registra/confere.</li>
</ul>
<p>Nenhuma tela ou campo de sistema é descrito neste treinamento além do fluxo informado.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
  { module: 'Segurança', title: 'Segurança — NR-10 e Procedimentos', objective: 'Aplicar princípios de segurança e reconhecer limites do treinamento', classification: 'PROCEDIMENTO_OPERACIONAL', content: `
<h2>Segurança</h2>
<ul>
<li>NR-10, EPIs, EPCs, autorização, procedimentos, documentação e segurança operacional em instalações elétricas.</li>
<li>Princípio: preservar segurança, autorização, continuidade operacional e seguir os procedimentos aplicáveis.</li>
</ul>
<p><strong>O treinamento não substitui NR-10, procedimentos corporativos, autorização formal, documentação técnica ou instruções do fabricante.</strong></p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>` },
];

function main() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  let created = 0;
  for (const L of LESSONS) {
    const mod = db.prepare('SELECT id FROM training_modules WHERE title=?').get(L.module);
    if (!mod) { console.log('Módulo não encontrado: ' + L.module); continue; }
    const ex = db.prepare('SELECT id FROM training_lessons WHERE module_id=? AND title=?').get(mod.id, L.title);
    if (ex) { console.log('Já existe: ' + L.title); continue; }
    const maxOrder = db.prepare('SELECT COALESCE(MAX(order_num),0) m FROM training_lessons WHERE module_id=?').get(mod.id).m;
    db.prepare(`INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status) VALUES (?,?,?,?,?,?, 'PENDING_TECHNICAL_VALIDATION')`)
      .run(mod.id, L.title, maxOrder + 1, L.objective, L.content, L.classification);
    created++;
    console.log('Criada: ' + L.title);
  }
  const total = db.prepare('SELECT COUNT(*) c FROM training_lessons').get().c;
  console.log(`OK lições 09-17: criadas=${created} total=${total}`);
  db.close();
}
main();
