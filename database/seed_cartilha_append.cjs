const Database = require('better-sqlite3');
const db = new Database('./training.db');

const APPEND_MARKER = '<!-- CARTILHA_APPENDED_v1 -->';

const appends = {
  2: `
<div class="concept-box"><strong>📘 Conceito:</strong> A manutenção preventiva não é apenas "medir tensão" — seu objetivo é verificar as condições gerais da infraestrutura que mantém a carga crítica funcionando (energia, climatização, monitoramento).</div>
<div class="concept-box"><strong>📘 Blocos da instalação:</strong> Entrada → Transferência → Distribuição → Sistemas de continuidade (UPS/FCC) → Cargas. Dentro dela existem dois mundos: <strong>sistema AC</strong> (UPS → QDNB → QDT → carga AC) e <strong>sistema DC</strong> (FCC → QDF → carga DC).</div>
<div class="reference-box"><strong>📚 Referência ilustrativa:</strong> A lista de equipamentos a estudar compreende: Concessionária, Padrão/Cabine, QTA/ATM, Gerador, QDGE, UPS 1/2, QDNB, QDT, FCC 01/02, QDF, QFAC, PDT, QDCC e bancos de baterias. Cada equipamento tem uma função específica — não encare-os isoladamente.</div>
<div class="attention-box"><strong>⚠️ Pergunta fundamental antes de qualquer medição:</strong> <em>"Onde estou medindo, de onde vem essa energia e qual carga depende desse circuito?"</em> Evita tratar uma medição como dado isolado.</div>
<h3>🧭 Fluxo completo da Manutenção Preventiva (visão geral)</h3>
<ol>
  <li>Preparação</li><li>Chegada ao HUB/Site</li><li>Equipamentos + ferramentas + EPI/EPC</li>
  <li>Abertura do Ticket</li><li>Autorização do SMC</li><li>Identificação da infraestrutura</li>
  <li>Inspeção</li><li>Medições AC</li><li>Medições DC</li>
  <li>Medição dos circuitos</li><li>Avaliação de baterias</li><li>Identificação de anormalidades</li>
  <li>Registro das evidências</li><li>Tratamento/encaminhamento</li><li>Conferência</li>
  <li>Relatório</li><li>Encerramento no Infratel</li>
</ol>
<div class="procedure-box"><strong>🛠️ Na prática:</strong> a carga AC transita por UPS → QDNB → QDT; a carga DC por FCC → QDF; a climatização por QFAC → evaporadoras/condensadoras. Entender esses três caminhos evita interpretações erradas durante as medições.</div>`,

  8: `
<div class="concept-box"><strong>📘 Baterias da UPS — referências do ambiente descrito:</strong> 12 V · ~150 Ah · 40 elementos no banco · ~13,7 V em flutuação · referência de campo ~12,5 V em descarga. <em>Não são limites universais.</em></div>
<div class="reference-box"><strong>📚 Referência ilustrativa — Baterias FCC:</strong> existem instalações com baterias seladas 2 V / 1000 Ah e outras com 12 V. Há casos com 12 bancos e 48 baterias no total. <strong>Nunca presumir configuração igual em todos os HUBs</strong> — sempre consultar a documentação do local.</div>
<div class="attention-box"><strong>⚠️ Água desmineralizada:</strong> algumas baterias (não seladas) podem exigir reposição de água. Só realize o procedimento se previsto pelo <strong>fabricante + procedimento aplicável</strong>. Não complete apenas porque "parece baixa".</div>
<div class="procedure-box"><strong>🛠️ Como observar:</strong> flutuação mantém o banco preparado para atuar; descarga ocorre durante falta de energia ou em procedimento específico (M14). Compare sempre o <strong>comportamento de cada elemento</strong> — uma bateria fora da curva do grupo merece investigação (M13).</div>`,

  10: `
<div class="concept-box"><strong>📘 Janela de trabalho:</strong> normalmente <strong>01:00 às 05:00</strong>. Fora dela as atividades necessitam autorização/justificativa específica.</div>
<div class="procedure-box"><strong>🛠️ Chegada ao local:</strong> reunir equipamentos de medição + ferramentas; conferir EPIs/EPCs aplicáveis; identificar qual atividade está programada antes de tocar em qualquer equipamento.</div>
<div class="procedure-box"><strong>🛠️ Ticket de entrada:</strong> o registro deve permitir identificar: <em>local, data, horário, atividade, equipamento, responsáveis, restrições e observações</em>. Sem ticket/acionamento a atividade não inicia.</div>
<div class="attention-box"><strong>⚠️ Autorização obrigatória:</strong> aguardar o aval do Site Management Center (SMC). A atividade não deve começar antes da autorização necessária, mesmo que tudo pareça pronto.</div>
<div class="concept-box"><strong>📘 Equipe:</strong> normalmente 2 profissionais — 1 realiza medições, o outro registra/acompanha/confere. Reduz erros de registro e aumenta a rastreabilidade.</div>
<div class="procedure-box"><strong>🛠️ Sequência geral:</strong> Preparação → Autorização → Inspeção → Medições → Registros → Análise → Documentação → Encerramento.</div>
<div class="procedure-box"><strong>🛠️ Encerramento:</strong> conferir registros; verificar se todas as medições foram realizadas; registrar anormalidades; organizar evidências; finalizar documentação; encerrar a atividade no Infratel.</div>`,

  11: `
<div class="attention-box"><strong>⚠️ Medição isolada ≠ diagnóstico:</strong> não classifique uma medição automaticamente como "boa" ou "ruim" sem contexto. Considere sempre: equipamento, ponto de medição, configuração do local, histórico, procedimento aplicável, fabricante e condições reais da instalação.</div>
<div class="concept-box"><strong>📘 Interpretação:</strong> os números servem para comparar comportamento esperado vs medido. Histórico e referência do local são mais úteis do que "limites decorados".</div>
<div class="procedure-box"><strong>🛠️ O que observar nos pontos AC:</strong> fase-fase, fase-neutro, fase-terra (quando aplicável), corrente por fase e frequência. Nos pontos DC: tensão do barramento e corrente (quando aplicável).</div>`,

  12: `
<div class="procedure-box"><strong>🛠️ Fluxo de investigação de corrente elevada:</strong>
<ol>
  <li>Medição elevada identificada</li>
  <li>Identificar disjuntor/circuito</li>
  <li>Identificar rack/equipamento alimentado</li>
  <li>Verificar carga real do equipamento</li>
  <li>Confirmar existência de redundância de alimentação</li>
  <li>Avaliar distribuição de carga entre as fases</li>
  <li>Definir ação conforme procedimento e autorização</li>
</ol>
</div>
<div class="attention-box"><strong>⚠️ Redundância:</strong> nunca desligue/transfira um circuito crítico só porque sua corrente está elevada. Primeiro confirme se existe alimentação redundante e como ela está atualmente.</div>
<div class="attention-box"><strong>⚠️ Regra importante:</strong> <em>corrente elevada é um sinal para INVESTIGAR — não é uma ordem automática para trocar o disjuntor.</em></div>
<div class="concept-box"><strong>📘 Balanceamento:</strong> quando tecnicamente aplicável e autorizado, avaliar o balanceamento de carga entre fases. O objetivo é melhorar a distribuição respeitando a arquitetura e os procedimentos existentes.</div>`,

  13: `
<div class="concept-box"><strong>📘 Anomalias visuais:</strong> aquecimento, corrente/tensão fora do histórico, comportamento diferente do esperado, degradação física, anormalidades em quadros, anormalidades em baterias, alterações aparentes. Tudo entra no registro.</div>
<div class="procedure-box"><strong>🛠️ Evidência de anormalidade:</strong> registre, no mínimo:
<ul>
  <li>equipamento e circuito afetado;</li>
  <li>condição encontrada;</li>
  <li>medição/valor lido;</li>
  <li>horário da observação;</li>
  <li>evidência coletada (foto/anotação);</li>
  <li>observação objetiva;</li>
  <li>ação realizada ou recomendada.</li>
</ul></div>
<div class="reference-box"><strong>📚 Histórico e tendência:</strong> uma das maiores vantagens da preventiva é a comparação no tempo: medição anterior → medição atual → tendência. Uma alteração gradual pode ser tão importante quanto uma anormalidade imediata.</div>`,

  14: `
<div class="concept-box"><strong>📘 Por que medir individualmente?</strong> um banco aparentemente normal pode esconder um elemento com comportamento desviante. Por isso as baterias são medidas <strong>uma a uma</strong>.</div>
<div class="concept-box"><strong>📘 Avaliação multidimensional:</strong> tensão, corrente (quando aplicável), condição em flutuação, condição em descarga, resistência interna e — quando previsto — teste complementar com carga/resistor.</div>
<div class="attention-box"><strong>⚠️ Resistência interna isolada:</strong> uma única leitura de resistência não serve para aprovar/reprovar bateria. Analise sempre junto com: tensão, comportamento em descarga, temperatura, histórico, condição física e especificação do fabricante.</div>
<div class="procedure-box"><strong>🛠️ Comparação entre elementos:</strong> Bateria A com comportamento normal vs Bateria B com comportamento diferente = investigação. Use o próprio grupo como referência relativa.</div>`,

  15: `
<div class="attention-box"><strong>⚠️ Procedimento específico do ambiente:</strong> o módulo FCC descrito é específico do local informado. Não aplique como procedimento universal para qualquer FCC — sempre consulte o procedimento do equipamento/site.</div>
<div class="attention-box"><strong>⚠️ Não improvisar ajustes:</strong> se o sistema não retornar ao comportamento esperado, confira os ajustes realizados segundo o procedimento. Não altere parâmetros "por conta".</div>
<div class="reference-box"><strong>📚 Referência ilustrativa da sequência:</strong> Modo Manutenção (47,0 V) → Manutenção (48,00 V × ~10 min) → Retorno (54,00 V) → Modo Automático (49,2 V) → Verificação final (~54,00 V). Valores e tempos são do procedimento do ambiente informado.</div>`,

  16: `
<div class="reference-box"><strong>📚 Caminho de driver (ambiente informado):</strong> <code>C:\\Program Files (x86)\\HIOKI\\GENNECT One\\driver</code> com <code>DPInst64.exe</code> (64 bits) / <code>DPInst32.exe</code> (32 bits). Instalação com privilégios administrativos.</div>
<div class="procedure-box"><strong>🛠️ Conexão:</strong> após instalar driver, conectar o equipamento por USB; verificar reconhecimento no sistema; confirmar ícone/indicador de conexão com o PC.</div>
<div class="procedure-box"><strong>🛠️ Zero Adjustment (0-ADJ):</strong> conectar as pontas conforme orientação; encostar o pino central de uma ponta na parte externa da outra; executar 0-ADJ; conferir indicação próxima de zero.</div>
<div class="concept-box"><strong>📘 A.MEM:</strong> quando ativo, armazena a leitura automaticamente quando a leitura estabiliza. Se estiver desativado, acione a memória manualmente após o aviso sonoro.</div>
<div class="procedure-box"><strong>🛠️ Medição de cada bateria:</strong> posicionar as pontas; aguardar estabilização; aguardar o sinal sonoro; registrar a leitura; repetir elemento a elemento.</div>
<div class="procedure-box"><strong>🛠️ Fluxo GENNECT One (referência):</strong> Instrument Connection → Search → BT3554-01 Connected → File Acquisition → selecionar dados → Import → Data List → Export PDF Report / CSV.</div>
<div class="procedure-box"><strong>🛠️ Problemas comuns:</strong>
<ul>
  <li><strong>Equipamento não aparece:</strong> conferir cabo USB; testar outra porta USB; revalidar instalação do driver.</li>
  <li><strong>Dados não aparecem após aquisição:</strong> conferir contador de memória do HIOKI; não pode estar em 000 antes da aquisição.</li>
</ul></div>`,

  17: `
<div class="attention-box"><strong>⚠️ Registros genéricos NÃO ajudam:</strong> evite escrever algo vago como "Preventiva realizada". Um bom registro permite que outra pessoa — sem estar presente — entenda exatamente o que aconteceu.</div>
<div class="procedure-box"><strong>🛠️ Estrutura sugerida de registro:</strong>
<ul>
  <li>Equipamento: QDGE</li>
  <li>Ponto: Circuito X</li>
  <li>Medição: valor encontrado</li>
  <li>Condição: normal/anormal conforme procedimento</li>
  <li>Observação: descrição objetiva</li>
  <li>Evidência: registro correspondente</li>
  <li>Ação: realizada ou encaminhada</li>
</ul></div>
<div class="concept-box"><strong>📘 Finalidade do Infratel:</strong> registrar o que foi feito, quando, onde, quem participou, quais medições, quais anormalidades e quais evidências. Sem registro, não há histórico auditável da manutenção.</div>
<div class="procedure-box"><strong>🛠️ Fluxo resumido:</strong> Ticket → Autorização → Execução → Medições → Registros → Documentação → Relatório → Encerramento no Infratel.</div>`,

  18: `
<div class="attention-box"><strong>⚠️ Segurança vem ANTES de qualquer medição:</strong> nenhuma leitura justifica ignorar uma condição de risco.</div>
<div class="procedure-box"><strong>🛠️ Antes de começar:</strong> verificar autorização; verificar procedimento aplicável; utilizar EPI/EPC correspondentes; avaliar riscos do ponto; conhecer o equipamento; respeitar as condições operacionais vigentes.</div>
<div class="concept-box"><strong>📘 NR-10:</strong> atividades em eletricidade devem observar os requisitos aplicáveis da NR-10 — além de procedimentos corporativos, normas técnicas pertinentes e documentação do local.</div>
<div class="attention-box"><strong>⚠️ Lista de "não improvisar":</strong>
<ul>
  <li>não altere parâmetros sem autorização;</li>
  <li>não modifique circuitos sem compreender a arquitetura;</li>
  <li>não desligue cargas críticas sem procedimento;</li>
  <li>não ignore alarmes em andamento;</li>
  <li>não substitua componentes "por suspeita";</li>
  <li>não use valores de referência como limites universais.</li>
</ul></div>
<h3>✅ Checklist do Profissional (antes de encerrar a preventiva)</h3>
<div class="reference-box"><strong>📚 Infraestrutura:</strong> sei de onde vem a energia · sei identificar o QDGE · sei explicar o caminho AC · sei explicar o caminho DC · sei onde estão UPS e FCC · sei identificar QDF/QDCC/QFAC.</div>
<div class="reference-box"><strong>📚 Operação:</strong> sei o horário da janela · sei abrir/consultar o ticket · sei que preciso aguardar autorização · sei seguir o procedimento aplicável do local.</div>
<div class="reference-box"><strong>📚 Medições:</strong> sei os pontos AC · sei os pontos DC · sei medir corrente dos circuitos · sei interpretar anormalidade sem conclusão precipitada.</div>
<div class="reference-box"><strong>📚 Baterias:</strong> sei medir elemento a elemento · sei diferenciar flutuação e descarga · sei utilizar o HIOKI · sei que resistência interna isolada não fecha diagnóstico.</div>
<div class="reference-box"><strong>📚 Registro:</strong> sei registrar medições · sei registrar anormalidades · sei organizar evidências · sei finalizar a atividade no Infratel.</div>
<div class="reference-box"><strong>📚 Segurança:</strong> sei os requisitos de segurança · sei que autorização é obrigatória · sei que procedimento do local/fabricante prevalece sobre regras decoradas.</div>`
};

const upd = db.prepare('UPDATE training_lessons SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const get = db.prepare('SELECT id, content FROM training_lessons WHERE id = ?');

let updated = 0;
let skipped = 0;

Object.entries(appends).forEach(([lessonId, extraHtml]) => {
  const row = get.get(Number(lessonId));
  if (!row) { console.log('SKIP lessonId=' + lessonId + ' (not found)'); skipped++; return; }
  if (String(row.content || '').includes(APPEND_MARKER)) {
    console.log('SKIP lessonId=' + lessonId + ' (already appended)');
    skipped++;
    return;
  }
  const newContent = (row.content || '').trimEnd() + '\n\n' + APPEND_MARKER + '\n' + extraHtml + '\n';
  const info = upd.run(newContent, Number(lessonId));
  console.log('UPDATE lessonId=' + lessonId + ' changes=' + info.changes);
  updated++;
});

db.close();
console.log('DONE. updated=' + updated + ' skipped=' + skipped);
