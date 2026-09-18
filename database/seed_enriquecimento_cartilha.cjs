const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');
const MARKER = '<!-- CARTILHA_ENRIQUECIMENTO_v1 -->';
const QUIZ_MARKER = '<!-- CARTILHA_QUIZ_v1 -->';

// ============================================================================
// FASE DE ENRIQUECIMENTO DIDÁTICO E TÉCNICO DA CARTILHA
// Cada lição recebe a estrutura de "aula": objetivo, introdução, o que é,
// para que serve, onde está, relações, funcionamento, prática, medições,
// situações de atenção, anormalidades, segurança, registro, erros, resumo,
// checklist e teste de conhecimentos (quando aplicável).
// Somente informação sustentada pelo conteúdo já cadastrado e pela
// documentação do projeto é usada. Valores de campo continuam como
// referência — nunca como limite universal.
// ============================================================================

const AULA = {
  2: `
<h2>Visão Geral da Infraestrutura</h2>

<h3>Objetivo da aula</h3>
<p>Entender o caminho da energia desde a concessionária até os equipamentos finais, compreender o que é um HUB/Site/Data Center e por que a continuidade elétrica é crítica. O aluno deve sair desta aula sabendo <strong>de onde a energia vem, por onde passa e para onde vai</strong> antes de realizar qualquer medição.</p>

<h3>Introdução</h3>
<p>Antes de medir, o profissional deve saber de onde a energia vem, por onde passa, qual equipamento condiciona/protege a alimentação, para onde ela vai e o que acontece se um ponto falhar. Esta aula apresenta a visão geral da infraestrutura elétrica de um HUB/Site/Data Center e o papel de cada sistema.</p>

<h3>O que é um HUB, um Site e um Data Center?</h3>
<p>São instalações que concentram equipamentos críticos (telecomunicações, processamento, armazenamento e rede). Mesmo que os nomes variem conforme a operação, todas dependem de energia elétrica contínua e de climatização adequada para funcionar. A infraestrutura de energia existe para manter essas cargas operando, com redundância quando necessário.</p>

<h3>Por que a continuidade elétrica é importante?</h3>
<p>Uma interrupção de energia pode desligar cargas críticas, derrubar serviços e causar perdas operacionais. Por isso a instalação é projetada com caminhos redundantes e equipamentos de continuidade (UPS e FCC) que mantêm a alimentação durante falhas ou transferências. O papel da manutenção preventiva é identificar problemas <strong>antes</strong> de eles virarem falhas.</p>

<h3>Visão geral da infraestrutura</h3>
<div class="concept-box"><strong>Blocos da instalação:</strong> Entrada → Transferência → Distribuição → Sistemas de continuidade (UPS/FCC) → Cargas. Dentro dela existem dois mundos: <strong>sistema AC</strong> (UPS → QDNB → QDT → carga AC) e <strong>sistema DC</strong> (FCC → QDF → carga DC).</div>
<ul>
  <li>Concessionária → Padrão/Cabine</li>
  <li>Padrão/Cabine → QTA/ATM</li>
  <li>QTA/ATM ↔ Gerador</li>
  <li>QDGE → UPS / FCC / QFAC</li>
  <li>UPS → QDNB → QDT → carga AC</li>
  <li>FCC → QDF → carga DC</li>
  <li>QFAC → evaporadoras/condensadoras → climatização do Data Center</li>
</ul>

<h3>Diferença entre alimentação AC e DC</h3>
<p><strong>AC (corrente alternada):</strong> energia fornecida pela concessionária e distribuída pelos quadros; alimenta cargas que operam com a rede alternada (grande parte dos equipamentos, climatização, iluminação).<br>
<strong>DC (corrente contínua):</strong> energia retificada (convertida de AC para DC) pelos FCC para alimentar cargas que operam em corrente contínua, além de carregar os bancos de baterias.</p>

<h3>Importância dos principais sistemas</h3>
<ul>
  <li><strong>Distribuição (QDGE):</strong> centraliza e encaminha a energia para os diversos quadros e sistemas.</li>
  <li><strong>UPS:</strong> garante continuidade e qualidade da alimentação AC para cargas críticas.</li>
  <li><strong>FCC:</strong> converte AC em DC e mantém cargas DC com energia estabilizada.</li>
  <li><strong>Bancos de baterias:</strong> fornecem autonomia durante falhas ou procedimentos de descarga.</li>
  <li><strong>Gerador:</strong> fonte de energia de emergência quando a alimentação normal falha.</li>
  <li><strong>Climatização:</strong> mantém condições adequadas para a operação segura dos equipamentos.</li>
</ul>

<h3>Papel da manutenção preventiva</h3>
<div class="concept-box"><strong>Conceito:</strong> a manutenção preventiva não é apenas "tirar medidas". Ela envolve uma sequência de raciocínio: <strong>INSPECIONAR → MEDIR → COMPARAR → IDENTIFICAR ANORMALIDADES → REGISTRAR → TRATAR/ENCAMINHAR → DOCUMENTAR.</strong></div>
<p>Cada etapa existe para que a condição real do sistema seja conhecida, registrada e comparada com o histórico. O resultado é um tratamento adequado ou um encaminhamento técnico — nunca uma conclusão baseada em um único número.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Tratar uma medição isolada como se fosse um diagnóstico completo.</li>
  <li>Realizar qualquer medição sem entender de onde vem a energia e qual carga depende daquele circuito.</li>
  <li>Iniciar atividade sem autorização ou sem ticket.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Não improvisar. Registrar o que foi encontrado (medições, condição, horário, evidências), comparar com o histórico e o procedimento aplicável, comunicar conforme o fluxo e encaminhar o tratamento previsto. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> esta cartilha não substitui a NR-10, procedimentos corporativos, autorização formal, documentação técnica ou instruções do fabricante. Nenhuma medição justifica ignorar uma condição de risco.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Encarar os equipamentos de forma isolada, sem enxergar o caminho da energia.</li>
  <li>Começar a atividade sem autorização.</li>
  <li>Concluir diagnóstico com uma única medição.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O HUB/Site/Data Center depende de energia contínua. A energia entra pela concessionária, passa por transferência e distribuição, e chega às cargas pelos caminhos AC (UPS) e DC (FCC), com gerador, baterias e climatização compondo a infraestrutura. A preventiva existe para inspecionar, medir, comparar, identificar, registrar, tratar e documentar.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar o que é um HUB/Site/Data Center e por que a continuidade elétrica é importante.</li>
  <li>☐ Explicar a diferença entre alimentação AC e DC.</li>
  <li>☐ Descrever a visão geral do caminho da energia e dos sistemas de continuidade.</li>
  <li>☐ Explicar o papel da manutenção preventiva (inspecionar, medir, comparar, registrar, tratar, documentar).</li>
</ul>

<h3>Teste seus conhecimentos</h3>
<p>Ao final desta aula, responda as perguntas abaixo. Elas fazem parte da fixação desta lição e preparam você para o Simulado Final.</p>
`,
  3: `
<h2>Caminho da Energia</h2>

<h3>Objetivo da aula</h3>
<p>Compreender cada etapa do caminho da energia, da concessionária até as cargas finais, incluindo as derivações a partir do QDGE. O objetivo é dominar o conceito de <strong>seguir o caminho da energia</strong> para interpretar corretamente qualquer medição.</p>

<h3>Introdução</h3>
<p>O caminho da energia começa na concessionária e passa por diversos equipamentos até chegar aos dispositivos finais. Conhecer cada etapa permite ao profissional saber onde está, de onde vem a energia e qual carga depende daquele ponto.</p>

<h3>O que é?</h3>
<p>O caminho da energia é a sequência de equipamentos e quadros por onde a energia elétrica transita, desde o fornecimento externo até as cargas (equipamentos que consomem energia).</p>

<h3>Para que serve?</h3>
<p>Serve de referência para toda a atividade preventiva: sem entender o caminho, não se sabe qual ponto medir, o que uma medição significa e qual o impacto de uma intervenção.</p>

<h3>Onde está na infraestrutura?</h3>
<p>É o fluxo principal da instalação:</p>
<ol>
  <li><strong>Concessionária:</strong> fornecimento de energia primária.</li>
  <li><strong>Padrão de Entrada / Cabine Primária:</strong> entrada de energia elétrica.</li>
  <li><strong>QTA / ATM:</strong> sistemas de transferência automática e manual.</li>
  <li><strong>Gerador:</strong> fonte de energia de emergência.</li>
  <li><strong>QDGE:</strong> quadro geral de energia (distribuição).</li>
</ol>

<h3>Como se relaciona com os outros equipamentos?</h3>
<div class="procedure-box"><strong>Derivações do QDGE:</strong>
<ul>
  <li>QDNB / QDT Bypass</li>
  <li>UPS 1</li>
  <li>UPS 2</li>
  <li>QDLE</li>
  <li>QFAC</li>
  <li>FCC 01</li>
  <li>FCC 02</li>
  <li>QDNB</li>
</ul></div>

<h3>Como funciona?</h3>
<p>Após a distribuição no QDGE, a energia segue para os sistemas de continuidade e de apoio:</p>
<ul>
  <li><strong>UPS 1 → QDNB 1 → QDT 1 → Carga AC</strong></li>
  <li><strong>UPS 2 → QDNB 2 → QDT 2 → Carga AC</strong></li>
  <li><strong>FCC 01/02 → QDF → Carga DC</strong></li>
  <li><strong>QFAC → evaporadoras/condensadoras → climatização do Data Center</strong></li>
</ul>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Durante a preventiva, o profissional percorre os quadros na mesma ordem do fluxo: padrão de entrada, QTA/ATM, QDGE, e depois cada derivação (UPS, FCC, QFAC). Em cada ponto, deve saber responder: <em>"de onde vem essa energia e qual carga depende deste circuito?"</em></p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Condição física dos quadros e identificações.</li>
  <li>Indicações de funcionamento (tensões, sinais, alarmes).</li>
  <li>Qual caminho está alimentando cada carga no momento da visita.</li>
</ul>

<h3>Situações de atenção</h3>
<ul>
  <li>Presumir que a energia vem de um caminho sem confirmação no local.</li>
  <li>Medir um ponto sem saber a que sistema ele pertence.</li>
  <li>Desligar ou transferir circuitos sem entender a arquitetura.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar, comparar com histórico e procedimento, comunicar e encaminhar tratamento. Não alterar caminhos ou conexões sem autorização. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> antes de qualquer contato com quadros, confirmar autorização, EPI/EPC aplicáveis e condição operacional do ponto.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Decorar o fluxo sem conseguir aplicá-lo no local.</li>
  <li>Ignorar as derivações do QDGE e seus caminhos.</li>
  <li>Medir no ponto errado por não seguir o caminho da energia.</li>
</ul>

<h3>Resumo da aula</h3>
<p>A energia entra pela concessionária, passa pelo padrão/cabine, pela transferência (QTA/ATM, com o gerador como emergência) e chega ao QDGE, que distribui para UPS, FCC, QFAC e demais quadros. As cargas AC são alimentadas via UPS → QDNB → QDT; as cargas DC via FCC → QDF; e a climatização via QFAC.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Seguir o caminho da energia da concessionária até as cargas.</li>
  <li>☐ Explicar as derivações do QDGE.</li>
  <li>☐ Explicar os caminhos AC (UPS) e DC (FCC).</li>
  <li>☐ Explicar o caminho da climatização (QFAC).</li>
</ul>
`,
  4: `
<h2>Gerador e Transferência</h2>

<h3>Objetivo da aula</h3>
<p>Entender o funcionamento do gerador e dos sistemas de transferência QTA/ATM, e o que acontece na perda da alimentação normal.</p>

<h3>Introdução</h3>
<p>O gerador é a fonte de energia de emergência da instalação: quando a alimentação da concessionária falha, ele assume o fornecimento para manter a operação. Para isso, existe uma lógica de detecção, partida, estabilização e transferência.</p>

<h3>O que é?</h3>
<p>O gerador é um equipamento que converte energia mecânica em energia elétrica, utilizado como fonte alternativa de alimentação em condição de emergência. Os sistemas de transferência fazem a troca entre a fonte normal (concessionária) e a fonte alternativa (gerador).</p>

<h3>Para que serve?</h3>
<p>Mantém a alimentação durante falhas da concessionária, reduzindo o impacto da falta de energia sobre os sistemas críticos e dando tempo para uma operação segura da infraestrutura.</p>

<h3>Onde está na infraestrutura?</h3>
<p>No fluxo informado, o gerador está ligado ao esquema de transferência QTA/ATM, entre o padrão de entrada e o QDGE:</p>
<p><strong>Concessionária → Padrão de Entrada/Cabine Primária → QTA/ATM ↔ Gerador → QDGE</strong></p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<p>O QTA/ATM gerencia a fonte que alimenta o QDGE. Em condição normal, a energia vem da concessionária; em emergência, após a transferência, vem do gerador. O QDGE, por sua vez, distribui para UPS, FCC e QFAC — ou seja, o gerador sustenta todo o sistema de continuidade durante a falta de energia.</p>

<h3>Como funciona?</h3>
<div class="concept-box"><strong>Sequência de uma perda de alimentação:</strong>
<ol>
  <li>Perda da alimentação normal (concessionária).</li>
  <li>Detecção da ausência de energia pelo sistema.</li>
  <li>Partida do gerador.</li>
  <li>Estabilização (retorno dos parâmetros elétricos ao patamar adequado).</li>
  <li>Transferência da carga para o gerador.</li>
  <li>Com o retorno da alimentação normal, retorno ao fluxo normal conforme a lógica/procedimento do local.</li>
</ol></div>
<div class="reference-box"><strong>QTA:</strong> quadro de transferência <strong>automática</strong>.<br>
<strong>ATM:</strong> operação <strong>manual</strong>, conforme configuração e procedimento do local. Não são criados aqui tempos ou parâmetros de transferência que não foram fornecidos — seguir o procedimento da instalação.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>O gerador e os sistemas de transferência aparecem na preventiva na etapa de identificação da infraestrutura e nas medições dos pontos de entrada (padrão de entrada, QTA). O profissional deve conhecer qual fonte está alimentando o QDGE no momento da atividade.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Estado operacional do gerador e da lógica de transferência.</li>
  <li>Indicações/alarmes do QTA/ATM.</li>
  <li>Sinais de degradação, vazamentos ou anomalias aparentes (quando a inspeção do local permitir).</li>
</ul>

<h3>Situações de atenção</h3>
<ul>
  <li>Presumir que o gerador sempre parte em um tempo fixo sem base no procedimento informado.</li>
  <li>Tratar QTA e ATM como equivalentes: um é automático, o outro é manual.</li>
  <li>Intervir na lógica de transferência sem autorização e procedimento.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar a condição encontrada com medições e evidências, comparar com histórico e encaminhar. Não executar manobras de transferência fora do procedimento autorizado. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> partida de gerador e manobras de transferência envolvem riscos específicos. Somente realizar com autorização, procedimento, EPI/EPC adequados e equipe habilitada.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Inventar tempos ou sequências de transferência.</li>
  <li>Confundir transferência automática (QTA) com manual (ATM).</li>
  <li>Manobrar sem autorização.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O gerador é a fonte de emergência. Na perda da alimentação normal, o sistema detecta, parte o gerador, aguarda estabilização e transfere a carga. O QTA é automático; o ATM é manual, conforme procedimento do local. Tempos e parâmetros não informados não devem ser presumidos.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a função do gerador na infraestrutura.</li>
  <li>☐ Descrever a sequência de uma perda de alimentação normal.</li>
  <li>☐ Diferenciar QTA (automática) e ATM (manual).</li>
  <li>☐ Reconhecer que parâmetros/tempos não informados seguem o procedimento do local.</li>
</ul>
`,
  5: `
<h2>QDGE — Quadro de Distribuição Geral de Energia</h2>

<h3>Objetivo da aula</h3>
<p>Compreender o papel do QDGE (Quadro de Distribuição Geral de Energia) na distribuição de energia, suas principais derivações e por que inspeção e medições nesse quadro fazem parte da preventiva.</p>

<h3>Introdução</h3>
<p>O QDGE é o ponto central de distribuição de energia para os sistemas críticos do HUB/Site/Data Center. Praticamente todos os caminhos de energia nascem nele, o que torna esse quadro essencial para a continuidade e para a preventiva.</p>

<h3>O que é?</h3>
<p>O QDGE — Quadro de Distribuição Geral de Energia — é o quadro elétrico que recebe a energia já transferida (QTA/ATM) e a distribui para os diversos sistemas e quadros da instalação.</p>

<h3>Para que serve?</h3>
<p>Concentrar a distribuição de energia de forma organizada e protegida, alimentando os sistemas de continuidade (UPS e FCC), a climatização (QFAC) e demais cargas, permitindo inspeção, medição e manobras de forma controlada.</p>

<h3>Onde está na infraestrutura?</h3>
<p>Depois da transferência (QTA/ATM) e antes dos sistemas de continuidade:</p>
<p><strong>Concessionária → Padrão/Cabine → QTA/ATM ↔ Gerador → QDGE → distribuição</strong></p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<div class="procedure-box"><strong>Principais derivações do QDGE:</strong>
<ul>
  <li>QDNB / QDT Bypass</li>
  <li>UPS 1</li>
  <li>UPS 2</li>
  <li>QDLE</li>
  <li>QFAC</li>
  <li>FCC 01</li>
  <li>FCC 02</li>
  <li>QDNB</li>
</ul>
<p>Ou seja: o QDGE alimenta as UPS (carga AC), os FCC (carga DC) e o QFAC (climatização), além de quadros de distribuição como QDNB, QDT e QDLE.</p></div>

<h3>Como funciona?</h3>
<p>O QDGE recebe a energia do sistema de transferência e a distribui pelos circuitos que alimentam cada sistema. No caminho, cada derivação parte do quadro, e é a partir do QDGE que se identifica qual circuito alimenta qual sistema.</p>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o QDGE é um dos primeiros pontos de medição e inspeção: o profissional confere o quadro, identifica as derivações, mede as grandezas e verifica a condição física e a identificação dos circuitos.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Condição física geral do quadro (aquecimento, oxidação, aperto, sujeira).</li>
  <li>Identificação dos circuitos e respectivos sistemas alimentados.</li>
  <li>Possíveis sinais de sobrecarga, aquecimento ou degradação.</li>
</ul>

<h3>Medições / verificações</h3>
<p>Medições típicas neste ponto (AC): fase-fase, fase-neutro e fase-terra quando aplicável, corrente por fase e frequência — sem limites universais, conforme procedimento/projeto aplicável. Inspeção e medições no QDGE fazem parte da preventiva porque ele concentra a distribuição que sustenta todos os sistemas.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Aquecimento localizado em um circuito ou barramento.</li>
  <li>Identificação ausente ou errada de derivações.</li>
  <li>Anormalidade em qualquer ponto antes de alimentar sistemas críticos.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar a condição com medições e evidências, comparar com histórico e encaminhar. Não alterar derivações ou desligar cargas críticas sem autorização e procedimento. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> o QDGE concentra energia de vários sistemas. Qualquer contato exige autorização, EPI/EPC adequados e respeito às condições da NR-10.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Tratar o QDGE como um "quadro comum" sem relação com os sistemas críticos.</li>
  <li>Não registrar as derivações observadas.</li>
  <li>Concluir problema sem comparar tensões/correntes entre fases e histórico.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O QDGE é o centro de distribuição que recebe a energia transferida e alimenta UPS, FCC, QFAC e demais quadros. Por concentrar quase toda a energia, é ponto obrigatório de inspeção e medição na preventiva.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a função do QDGE.</li>
  <li>☐ Identificar as principais derivações do QDGE.</li>
  <li>☐ Explicar a relação do QDGE com UPS, FCC, QFAC, QDNB e QDT.</li>
  <li>☐ Explicar por que medições e inspeções no QDGE fazem parte da preventiva.</li>
</ul>
`,
  6: `
<h2>UPS — Unidades de Alimentação Ininterrupta</h2>

<h3>Objetivo da aula</h3>
<p>Entender o funcionamento das UPS (Unidades de Alimentação Ininterrupta), sua relação com as baterias e o caminho que a energia percorre até as cargas AC.</p>

<h3>Introdução</h3>
<p>As UPS garantem a continuidade da alimentação durante falhas de energia ou transferências entre fontes. Elas ficam entre o QDGE e as cargas AC, condicionando e protegendo a energia entregue.</p>

<h3>O que é?</h3>
<p>UPS — Unidade de Alimentação Ininterrupta — é um equipamento que mantém a alimentação da carga durante interrupções ou instabilidades da fonte, utilizando energia acumulada em baterias enquanto a fonte principal não é restabelecida.</p>

<h3>Para que serve?</h3>
<p>Proporcionar alimentação contínua e com qualidade adequada para os equipamentos críticos que operam em AC, evitando que pequenas falhas de energia interrompam a operação.</p>

<h3>Onde está na infraestrutura?</h3>
<p>A UPS recebe energia do QDGE e alimenta o caminho AC da carga:</p>
<ul>
  <li><strong>UPS 1 → QDNB 1 → QDT 1 → Carga AC</strong></li>
  <li><strong>UPS 2 → QDNB 2 → QDT 2 → Carga AC</strong></li>
</ul>
<p>UPS 1 e UPS 2 representam caminhos que compõem a redundância da alimentação AC.</p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<p>A UPS depende do QDGE (entrada), dos bancos de baterias (energia de reserva) e alimenta os quadros de distribuição QDNB e QDT, que encaminham a energia às cargas AC. Quando a alimentação normal oscila ou cai, a UPS usa a energia das baterias para manter a saída.</p>

<h3>Como funciona?</h3>
<p>Na condição normal, a UPS recebe a energia AC, mantém suas baterias na condição de flutuação (carregadas e prontas para atuar) e fornece energia estabilizada para a carga. Durante uma falha ou transferência, a energia armazenada nas baterias é convertida para manter a alimentação da carga até a fonte normal retornar.</p>

<h3>Referência de campo (configuração deste ambiente)</h3>
<div class="reference-box"><strong>Referências de campo informadas para as baterias UPS deste ambiente</strong> (não são limites universais):
<ul>
  <li>Baterias de 12 V;</li>
  <li>aproximadamente 150 Ah;</li>
  <li>40 elementos no banco;</li>
  <li>aproximadamente 13,7 V em flutuação;</li>
  <li>aproximadamente 12,5 V em descarga, como referência de campo.</li>
</ul>
<p>Esses valores não devem ser tratados isoladamente como limites universais de aprovação. A avaliação depende de fabricante, modelo, temperatura, histórico, procedimento e condição da bateria.</p></div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional identifica qual UPS alimenta qual caminho, observa o estado operacional (indicadores, alarmes), mede tensões/correntes nos pontos previstos e avalia as baterias elemento a elemento conforme procedimento.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Estado operacional das UPS 1 e UPS 2.</li>
  <li>Indicadores, alarmes e sinais de falha.</li>
  <li>Condição dos bancos de baterias ligados à UPS.</li>
</ul>

<h3>Medições / verificações</h3>
<p>Medições de tensão (AC na saída e DC nos bancos conforme ponto/procedimento) e corrente quando aplicável, sempre comparando com histórico e sem limites universais.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Elemento de bateria com comportamento desviante do grupo.</li>
  <li>Alarme ou condição de bypas/anomalia na UPS.</li>
  <li>Tensão de flutuação fora da referência de campo sem explicação técnica.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar medições e evidências, comparar com histórico e referência de campo, e encaminhar. Não desligar a UPS, não abrir bypass e não alterar parametrização sem autorização e procedimento. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> a UPS mantém energia mesmo em algumas condições de falha. Trabalhar nesse equipamento exige autorização, procedimento e conhecimento específico — não tratar como um quadro comum.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Usar 13,7 V ou 12,5 V como aprovação/reprovação automática.</li>
  <li>Confundir o caminho da UPS 1 com o da UPS 2.</li>
  <li>Desligar ou transferir a UPS sem procedimento.</li>
</ul>

<h3>Resumo da aula</h3>
<p>A UPS mantém a continuidade da alimentação AC usando baterias durante falhas. Neste ambiente, as baterias UPS são 12 V / ~150 Ah, 40 elementos, com referências de campo de ~13,7 V em flutuação e ~12,5 V em descarga — valores que não são universais.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar o que é uma UPS e por que ela existe.</li>
  <li>☐ Explicar o caminho UPS → QDNB → QDT → carga AC.</li>
  <li>☐ Citar as referências de campo das baterias UPS como referências, não limites.</li>
  <li>☐ Reconhecer que a avaliação da bateria depende de múltiplos fatores.</li>
</ul>
`,
  7: `
<h2>FCC e Sistema DC</h2>

<h3>Objetivo da aula</h3>
<p>Compreender o funcionamento do FCC (Fonte de Corrente Contínua), a conversão AC/DC, o caminho do sistema DC e a relação entre retificador e baterias.</p>

<h3>Introdução</h3>
<p>As FCC convertem energia AC em DC para alimentar equipamentos que operam em corrente contínua e mantêm os bancos de baterias na condição de flutuação. São o coração do sistema DC da instalação.</p>

<h3>O que é?</h3>
<p>O FCC — Fonte de Corrente Contínua — é o sistema (retificador) que recebe energia AC e entrega energia DC estabilizada para as cargas DC e para as baterias.</p>

<h3>Para que serve?</h3>
<p>Prover alimentação em corrente contínua estabilizada para equipamentos que operam em DC, além de manter os bancos de baterias carregados e prontos para atuar em caso de falha da entrada AC.</p>

<h3>Onde está na infraestrutura?</h3>
<p>O FCC recebe energia do QDGE e alimenta o caminho DC:</p>
<ul>
  <li><strong>FCC 01 → QDF → Carga DC</strong></li>
  <li><strong>FCC 02 → QDF → Carga DC</strong></li>
</ul>
<p>FCC 01 e FCC 02 compõem a redundância do sistema DC.</p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<p>O FCC depende do QDGE (entrada AC), carrega os bancos de baterias e alimenta o QDF que distribui para as cargas DC. Quando a entrada AC falha, as baterias assumem a alimentação DC até o retificador retornar.</p>

<h3>Como funciona?</h3>
<div class="concept-box"><strong>Conversão:</strong> <strong>AC → RETIFICAÇÃO → DC → CARGA / BATERIA.</strong><br>
Em operação normal, o retificador converte AC em DC, alimenta a carga DC e mantém a bateria em flutuação. Na falta de entrada AC, a bateria fornece DC para a carga (descarga), e o sistema retorna à flutuação quando a entrada é restabelecida conforme procedimento.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional identifica os FCC 01/02, verifica os retificadores, mede a tensão DC no barramento e no QDF, confere a condição dos bancos de baterias e observa a condição de flutuação do sistema.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Condição de flutuação do sistema DC.</li>
  <li>Tensão DC do barramento e das derivações para o QDF.</li>
  <li>Estado dos retificadores (indicadores, alarmes) e das baterias.</li>
</ul>

<h3>Medições / verificações</h3>
<p>Nos pontos DC (QDF, QDCC, bancos de baterias, UPS/FCC conforme o ponto e procedimento): tensão DC e corrente DC quando aplicável, comparando com histórico e sem limites universais.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Sistema DC fora da flutuação sem causa identificada.</li>
  <li>Elemento de bateria com tensão ou resistência desviante.</li>
  <li>Alarme ou falha em retificador.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar com medições e evidências, comparar com histórico e encaminhar. Não alterar parametrização do retificador nem forçar descarga sem procedimento autorizado. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> sistemas DC podem operar com tensões perigosas e sustentar cargas críticas. Trabalho em retificadores exige autorização, procedimento e EPI/EPC adequados.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Tratar o FCC como um simples "carregador", sem relação com a carga DC e as baterias.</li>
  <li>Presumir configuração de baterias sem consultar o local.</li>
  <li>Concluir diagnóstico com uma única medição de tensão.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O FCC retifica AC em DC, alimenta a carga DC via QDF e mantém as baterias em flutuação. FCC 01 e FCC 02 formam a redundância DC, e as baterias assumem a carga quando a entrada AC falha.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a função do FCC.</li>
  <li>☐ Explicar a conversão AC/DC e a relação entre retificador e bateria.</li>
  <li>☐ Descrever o caminho FCC → QDF → carga DC.</li>
  <li>☐ Explicar a condição de flutuação do sistema DC.</li>
</ul>
`,
  8: `
<h2>Bancos de Baterias — UPS e FCC</h2>

<h3>Objetivo da aula</h3>
<p>Entender a finalidade dos bancos de baterias, os conceitos de flutuação e descarga, a autonomia e as diferenças de configuração entre baterias de UPS e de FCC.</p>

<h3>Introdução</h3>
<p>Os bancos de baterias garantem a autonomia do sistema durante falhas de energia ou procedimentos de descarga. Eles fornecem a energia de reserva que mantém UPS e FCC operando quando a entrada normal falha.</p>

<h3>O que é?</h3>
<p>Um banco de baterias é um conjunto de elementos conectados entre si que armazena energia em DC e a libera quando o sistema precisa, mantendo a continuidade das cargas críticas.</p>

<h3>Para que serve?</h3>
<p>Fornecer autonomia: alimentar a carga durante a falta de alimentação normal, dar tempo para a transferência para o gerador ou permitir uma parada segura — conforme a configuração de cada instalação.</p>

<h3>Onde está na infraestrutura?</h3>
<p>As baterias estão ligadas às UPS (caminho AC) e aos FCC (sistema DC). Cada sistema mantém seu banco na condição de flutuação, pronto para entrar em descarga quando necessário.</p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<p>Durante a operação normal, a UPS/FCC mantém as baterias em flutuação. Na falta de energia da entrada, as baterias fornecem DC ao sistema para sustentar a carga. Depois, o sistema retorna as baterias à flutuação conforme o procedimento.</p>

<h3>Como funciona?</h3>
<div class="concept-box"><strong>Flutuação:</strong> condição em que o retificador/UPS mantém a bateria carregada e pronta para atuar.<br>
<strong>Descarga:</strong> condição em que a bateria fornece energia ao sistema (falha de entrada ou procedimento específico).</div>

<h3>Referências de campo (configurações informadas — não universais)</h3>
<div class="reference-box"><strong>Baterias UPS:</strong> 12 V / aproximadamente 150 Ah / 40 elementos no banco.<br>
<strong>Baterias FCC (algumas instalações):</strong> baterias de 12 V; outras com baterias seladas 2 V / 1000 Ah; determinadas instalações com 12 bancos / 48 baterias.<br><br>
<strong>Nenhum desses números deve ser presumido como configuração universal de todos os HUBs/Sites.</strong></div>
<div class="attention-box"><strong>Atenção — água desmineralizada:</strong> baterias que exigem manutenção podem prever reposição de água desmineralizada. Isso somente deve ser feito quando previsto pelo fabricante e pelo procedimento aplicável — nunca "porque parece baixa".</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional localiza os bancos, identifica a configuração de cada sistema (UPS/FCC), mede elemento a elemento em flutuação e, quando previsto, acompanha condições de descarga em procedimento específico.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Comportamento de cada elemento em flutuação.</li>
  <li>Comparação entre elementos do mesmo banco.</li>
  <li>Condição física (bornes, conexões, sinais de aquecimento, vazamentos).</li>
</ul>

<h3>Medições / verificações</h3>
<p>Medição individual (uma a uma): tensão, corrente quando aplicável, resistência interna e teste complementar quando previsto — avaliando junto com histórico e condição física.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Elemento com comportamento diferente do resto do banco.</li>
  <li>Aquecimento ou degradação nas conexões.</li>
  <li>Queda rápida em condição de descarga.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Repetir a medição, verificar conexão, comparar com o grupo e o histórico, avaliar temperatura e resistência, realizar teste complementar quando previsto e registrar. Não concluir por um único parâmetro. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> bancos de baterias podem apresentar tensão DC perigosa e riscos de curto-circuito (ferramentas, anéis, contatos). Utilizar EPI/EPC adequados e seguir o procedimento.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Presumir a mesma configuração de baterias em todos os HUBs/Sites.</li>
  <li>Repor água sem previsão do fabricante.</li>
  <li>Usar um único valor para aprovar/reprovar o banco.</li>
</ul>

<h3>Resumo da aula</h3>
<p>Os bancos dão autonomia via flutuação e descarga. Neste projeto há configurações diferentes (UPS 12 V/~150 Ah/40 elementos; FCC variável), sempre como referência do ambiente, nunca como regra universal.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a finalidade dos bancos de baterias e o conceito de autonomia.</li>
  <li>☐ Diferenciar flutuação e descarga.</li>
  <li>☐ Citar as referências de campo de UPS e FCC sem tratá-las como universais.</li>
  <li>☐ Explicar quando a água desmineralizada pode ser utilizada.</li>
</ul>
`,
  9: `
<h2>QFAC e Climatização</h2>

<h3>Objetivo da aula</h3>
<p>Compreender o papel do QFAC no caminho da climatização, a importância da climatização para os equipamentos críticos e por que a inspeção elétrica desse sistema faz parte da preventiva.</p>

<h3>Introdução</h3>
<p>O sistema de climatização mantém a temperatura adequada para o funcionamento dos equipamentos do Data Center. Ele é alimentado eletricamente pelo QFAC — motivo pelo qual uma anormalidade elétrica pode impactar diretamente a climatização e, por consequência, os equipamentos críticos.</p>

<h3>O que é?</h3>
<p>O QFAC — Quadro de Força de Ar Condicionado — é o quadro que alimenta eletricamente os equipamentos de climatização (evaporadoras e condensadoras).</p>

<h3>Para que serve?</h3>
<p>Distribuir energia para os equipamentos de ar condicionado, mantendo a climatização do Data Center em condições adequadas de temperatura para a operação segura dos equipamentos.</p>

<h3>Onde está na infraestrutura?</h3>
<div class="procedure-box"><strong>Caminho da climatização:</strong><br>
<strong>QFAC → evaporadoras/condensadoras → climatização do Data Center</strong></div>
<p>O QFAC recebe energia do QDGE e a distribui para os equipamentos de climatização.</p>

<h3>Como se relaciona com os outros equipamentos?</h3>
<p>O QFAC depende do QDGE (entrada). Uma falha elétrica nesse caminho pode parar a climatização, elevando a temperatura do ambiente e colocando em risco os equipamentos críticos alimentados pelas UPS/FCC. Por isso a inspeção elétrica do QFAC protege, indiretamente, todo o sistema.</p>

<h3>Como funciona?</h3>
<p>A energia sai do QDGE, passa pelo QFAC e alimenta evaporadoras e condensadoras. Essas máquinas mantêm a temperatura do Data Center dentro dos parâmetros de operação definidos pelo projeto/instalação.</p>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional identifica o QFAC, confere o quadro, mede os pontos previstos e observa a condição dos circuitos que alimentam a climatização.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Condição física do QFAC e de suas derivações.</li>
  <li>Indicações de sobrecarga, aquecimento ou mau contato.</li>
  <li>Funcionamento geral da climatização (sem inventar parâmetros de temperatura).</li>
</ul>

<h3>Medições / verificações</h3>
<p>Medições típicas no ponto QFAC (AC): fase-fase, fase-neutro e fase-terra quando aplicável, corrente e frequência — conforme procedimento aplicável, sem limites universais e sem inventar setpoints do ambiente.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Anormalidade elétrica no QFAC (tensão/corrente fora de padrão, aquecimento).</li>
  <li>Sinais de degradação ou sobrecarga nos circuitos de climatização.</li>
  <li>Impacto potencial sobre a temperatura do Data Center.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar com medições e evidências, avaliar o impacto sobre a climatização, comparar com histórico e encaminhar. Não desligar a climatização sem procedimento e autorização — o desligamento pode afetar a temperatura do ambiente crítico. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> o QFAC alimenta cargas de climatização de grande porte. Evitar contato sem autorização, EPI/EPC adequados e observância da NR-10.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Tratar o QFAC isoladamente, sem enxergar o impacto na climatização e nos equipamentos críticos.</li>
  <li>Inventar valores de temperatura ou setpoints do ambiente.</li>
  <li>Desligar a climatização por conta própria.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O QFAC alimenta evaporadoras e condensadoras e sustenta a climatização do Data Center. Como a climatização protege os equipamentos críticos, a inspeção elétrica do QFAC é parte importante da preventiva.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar o caminho QFAC → evaporadoras/condensadoras → climatização.</li>
  <li>☐ Explicar por que a climatização protege os equipamentos críticos.</li>
  <li>☐ Explicar como uma anormalidade elétrica no QFAC pode impactar a climatização.</li>
  <li>☐ Reconhecer que parâmetros de temperatura seguem o projeto/instalação, sem inventar valores.</li>
</ul>
`,
  10: `
<h2>Rotina da Manutenção Preventiva</h2>

<h3>Objetivo da aula</h3>
<p>Executar a rotina preventiva conforme fluxo, janela, ticket e autorização informados. Esta deve ser a aula mais completa: ela explica, do início ao fim, como a atividade acontece em campo.</p>

<h3>Introdução</h3>
<p>A manutenção preventiva não começa no multímetro. Ela começa na preparação: chegada, instrumentos, ferramentas, EPI/EPC, identificação da atividade e autorização. Cada etapa existe por um motivo e nenhuma deve ser pulada.</p>

<h3>Janela de trabalho</h3>
<div class="reference-box"><strong>Referência operacional informada:</strong> a janela de preventiva normalmente ocorre das <strong>21:00 às 06:45</strong>. Esse horário é referência do projeto e não uma regra universal — deve ser confirmado no ticket do local. Fora dela, as atividades necessitam autorização/justificativa específica.</div>

<h3>Etapas da rotina (por que cada etapa existe)</h3>
<ol>
  <li><strong>Chegada:</strong> apresentar-se no local e confirmar as condições de acesso.</li>
  <li><strong>Coleta de instrumentos:</strong> garantir que os equipamentos de medição necessários estão disponíveis e em condição de uso.</li>
  <li><strong>Ferramentas:</strong> separar as ferramentas adequadas à atividade.</li>
  <li><strong>EPI/EPC:</strong> conferir os equipamentos de proteção individual e coletiva aplicáveis antes de qualquer contato.</li>
  <li><strong>Identificação da atividade:</strong> compreender o que será realizado, onde e com quais restrições.</li>
  <li><strong>Abertura do Ticket:</strong> registrar a atividade para que ela exista formalmente (local, data, horário, atividade, equipamento, responsáveis, restrições e observações).</li>
  <li><strong>Conferência das informações:</strong> confirmar no ticket: site, janela, atividade, equipamento/andar afetado, responsáveis e observações/restrições.</li>
  <li><strong>Espera pela autorização:</strong> aguardar o aval necessário antes de iniciar.</li>
  <li><strong>Autorização do Site Management Center:</strong> formalização da liberação da atividade.</li>
  <li><strong>Início da atividade:</strong> somente após a autorização.</li>
  <li><strong>Equipe:</strong> normalmente a atividade é realizada por duas pessoas — uma mede e a outra registra/confere os dados, reduzindo erros e aumentando a rastreabilidade.</li>
  <li><strong>Inspeção:</strong> observar a condição real dos equipamentos e quadros.</li>
  <li><strong>Medições:</strong> realizar as medições nos pontos previstos pela preventiva.</li>
  <li><strong>Registro:</strong> anotar os valores encontrados de forma objetiva.</li>
  <li><strong>Análise:</strong> comparar com histórico e identificar anormalidades.</li>
  <li><strong>Evidências:</strong> coletar registros (anotações/fotos) que comprovem a condição.</li>
  <li><strong>Documentação:</strong> organizar registros, medições e evidências.</li>
  <li><strong>Relatório:</strong> consolidar o resultado da atividade.</li>
  <li><strong>Encerramento no Infratel:</strong> finalizar a atividade no sistema, formando o histórico da manutenção.</li>
</ol>

<div class="attention-box"><strong>Regra fundamental:</strong> <em>o profissional não deve começar a atividade antes da autorização necessária</em>, mesmo que tudo pareça pronto.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na prática, a sequência é: Preparação → Autorização → Inspeção → Medições → Registros → Análise → Documentação → Encerramento. O profissional sempre confirma a janela, o ticket e a autorização antes de tocar em qualquer equipamento.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Autorização formal e ticket abertos.</li>
  <li>EPI/EPC em uso durante toda a atividade.</li>
  <li>Condições reais de quadros, medições e comportamento dos sistemas.</li>
</ul>

<h3>Situações de atenção</h3>
<ul>
  <li>Iniciar sem autorização.</li>
  <li>Trabalhar sozinho quando o procedimento prevê dois profissionais.</li>
  <li>Encerrar sem conferir se todas as medições foram realizadas e registradas.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar imediatamente com medições e evidências, comparar com o histórico, comunicar conforme o fluxo e encaminhar o tratamento conforme procedimento. Nunca improvisar nem esconder a condição encontrada.</p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> a rotina inteira depende de autorização, EPIs/EPCs e respeito aos procedimentos. Nenhuma medição ou pressão por prazo pode justificar abrir mão da segurança.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Começar antes da autorização.</li>
  <li>Realizar atividade sem ticket/identificação.</li>
  <li>Registrar apenas "feito" sem detalhar o que foi encontrado.</li>
</ul>

<h3>Resumo da aula</h3>
<p>A preventiva vai da chegada ao encerramento no Infratel, passando por preparação, ticket, autorização, inspeção, medições, registro, análise, evidências, documentação e relatório. Autorização e registro correto são partes inegociáveis da rotina.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a janela de trabalho informada (21:00–06:45) como referência do projeto.</li>
  <li>☐ Descrever as etapas da rotina do início ao fim.</li>
  <li>☐ Explicar por que a autorização é obrigatória antes do início.</li>
  <li>☐ Explicar por que a rotina normalmente usa dois profissionais.</li>
  <li>☐ Explicar a importância de documentação e encerramento no Infratel.</li>
</ul>
`,
  11: `
<h2>Medições Elétricas AC e DC</h2>

<h3>Objetivo da aula</h3>
<p>Identificar os pontos e as grandezas das medições AC e DC, compreender o significado de cada grandeza em linguagem simples e saber o que registrar durante a preventiva.</p>

<h3>Introdução</h3>
<p>Medir é comparar o comportamento atual com o esperado (histórico e referências do local). Esta aula explica quais pontos são medidos e o que cada grandeza significa, sem inventar limites universais.</p>

<h3>Pontos de medição AC</h3>
<div class="procedure-box"><strong>Pontos informados:</strong> Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC.</div>

<h3>Grandezas AC e seus significados</h3>
<ul>
  <li><strong>Fase-fase:</strong> tensão medida entre duas fases do sistema trifásico. Indica a tensão de linha no ponto.</li>
  <li><strong>Fase-neutro:</strong> tensão medida entre uma fase e o neutro. Indica a tensão que os circuitos monofásicos veem.</li>
  <li><strong>Fase-terra (quando aplicável):</strong> tensão medida entre a fase e a terra. Auxilia a identificar fugas ou problemas de referência de terra — mede-se quando previsto no ponto/procedimento.</li>
  <li><strong>Corrente:</strong> magnitude da energia circulando em cada fase. Permite avaliar carga e possíveis desequilíbrios.</li>
  <li><strong>Frequência:</strong> número de ciclos da tensão por segundo. Indica qualidade da alimentação CA (variações podem sinalizar problemas de fonte).</li>
</ul>

<h3>Pontos de medição DC</h3>
<div class="procedure-box"><strong>Pontos informados:</strong> QDF, QDCC e bancos de baterias de UPS/FCC (conforme o ponto e o procedimento).</div>

<h3>Grandezas DC e seus significados</h3>
<ul>
  <li><strong>Tensão DC:</strong> nível de tensão contínua do barramento ou do elemento. É a grandeza principal para conferir flutuação e estado do sistema.</li>
  <li><strong>Corrente DC (quando aplicável):</strong> corrente circulando no circuito DC; usada para avaliar carga e comportamento do sistema.</li>
</ul>

<h3>Como interpretar uma medição?</h3>
<div class="attention-box"><strong>Cuidado:</strong> uma medição isolada não é "boa" nem "ruim" por si só. Considere sempre: equipamento, ponto de medição, configuração do local, histórico, procedimento aplicável, fabricante e condições reais da instalação.</div>
<div class="concept-box"><strong>Interpretação:</strong> os números servem para comparar comportamento esperado vs medido. Histórico e referência do local são mais úteis do que "limites decorados".</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional percorre os pontos previstos, mede as grandezas aplicáveis a cada ponto e registra os valores — sempre anotando onde mediu, qual grandeza, o valor e a condição encontrada.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Grandeza incompatível com o histórico do ponto.</li>
  <li>Desequilíbrio relevante entre fases.</li>
  <li>Medir no ponto errado por não seguir o caminho da energia.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Repetir a medição quando pertinente, registrar com evidências, comparar com histórico e encaminhar. Não criar limites nem conclusões automáticas. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> medições em quadros energizados envolvem risco elétrico. Exigem autorização, EPI/EPC adequados, instrumentos apropriados e observância da NR-10.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Classificar medição sem considerar histórico e contexto.</li>
  <li>Usar limite decorado de outra instalação.</li>
  <li>Esquecer de registrar o ponto exato da medição.</li>
</ul>

<h3>Resumo da aula</h3>
<p>Pontos AC: Padrão de Entrada, QTA, QDGE, QDNB, PDT e QFAC — grandezas: fase-fase, fase-neutro, fase-terra (quando aplicável), corrente e frequência. Pontos DC: QDF, QDCC e bancos de baterias — grandezas: tensão DC e corrente DC quando aplicável.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Listar os pontos AC e as grandezas correspondentes.</li>
  <li>☐ Listar os pontos DC e as grandezas correspondentes.</li>
  <li>☐ Explicar, em linguagem simples, o que significa cada grandeza.</li>
  <li>☐ Interpretar uma medição com contexto, sem criar limites universais.</li>
</ul>
`,
  12: `
<h2>Medição de Corrente dos Circuitos</h2>

<h3>Objetivo da aula</h3>
<p>Medir a corrente de cada circuito/disjuntor, entender a relação entre corrente e carga e aprender a investigar uma corrente elevada sem regra simplista.</p>

<h3>Introdução</h3>
<p>Medir somente a tensão não é suficiente. A corrente de cada circuito mostra quanta carga está sendo consumida e permite identificar desequilíbrios, sobrecargas e circuitos sobrecarregados. Esta aula torna esse processo prático.</p>

<h3>Por que medir cada circuito/disjuntor?</h3>
<p>Cada disjuntor protege um circuito que alimenta determinada carga. Medir cada um permite saber a carga real, comparar com o esperado, detectar desequilíbrio entre fases e avaliar se há condição de atenção — sempre respeitando capacidade, condutor e projeto.</p>

<h3>Relação entre corrente e carga</h3>
<div class="concept-box"><strong>Conceito:</strong> a corrente é proporcional à carga consumida pelo equipamento/circuito. Corrente maior que o histórico pode significar aumento de carga, problema no equipamento ou mau contato — precisa investigação.</div>

<h3>Fluxo de investigação de corrente elevada</h3>
<div class="procedure-box"><strong>Sequência didática:</strong>
<ol>
  <li>Identificar a corrente elevada na medição.</li>
  <li>Identificar o circuito/disjuntor.</li>
  <li>Identificar o rack e o equipamento alimentado.</li>
  <li>Verificar a carga real do equipamento.</li>
  <li>Confirmar se existe redundância de alimentação e como ela está.</li>
  <li>Avaliar a distribuição entre as fases (balanceamento).</li>
  <li>Definir o tratamento conforme procedimento e autorização.</li>
</ol></div>

<h3>Identificação de circuito, rack e equipamento</h3>
<p>Não basta medir o número: é preciso saber <strong>qual circuito</strong>, <strong>qual rack</strong> e <strong>qual equipamento</strong> está sendo alimentado. Essa identificação torna a medida interpretável e permite decidir a ação correta.</p>

<h3>Verificação de redundância</h3>
<div class="attention-box"><strong>Atenção — redundância:</strong> antes de alterar a alimentação de um rack, verifique se o equipamento possui fonte redundante. Nunca desligue ou transfira um circuito crítico só porque a corrente está elevada: primeiro confirme a redundância e a condição atual.</div>

<h3>Avaliação das fases e balanceamento</h3>
<p>Verifique a distribuição das cargas entre as fases para avaliar desequilíbrios. O balanceamento é avaliado <strong>quando tecnicamente aplicável e autorizado</strong>, respeitando a arquitetura e os procedimentos existentes.</p>

<div class="attention-box"><strong>Regra importante:</strong> <em>corrente elevada não significa automaticamente que o disjuntor deve ser substituído.</em> É um sinal para INVESTIGAR.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional vai circuito a circuito, mede a corrente em cada fase, identifica carga/rack e registra. Quando encontra corrente elevada, aplica o fluxo de investigação antes de qualquer ação.</p>

<h3>O que observar durante a preventiva?</h3>
<ul>
  <li>Corrente de cada fase por circuito.</li>
  <li>Desequilíbrio relevante entre fases.</li>
  <li>Sinais de aquecimento associados ao circuito.</li>
</ul>

<h3>Situações de atenção</h3>
<ul>
  <li>Corrente elevada com aquecimento no disjuntor/cabo.</li>
  <li>Rack sem redundância sendo investigado.</li>
  <li>Desequilíbrio acentuado entre fases.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Seguir o fluxo de investigação, registrar medições e evidências, comparar com histórico e encaminhar o tratamento conforme procedimento e autorização. Não trocar componentes por suspeita. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> a medição de corrente pode exigir aproximação de partes energizadas. Somente com autorização, procedimento, instrumentos adequados e EPI/EPC conforme a NR-10.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>"Corrente alta = trocar disjuntor".</li>
  <li>Desligar carga crítica sem confirmar redundância.</li>
  <li>Medir sem identificar circuito/rack/equipamento.</li>
  <li>Balancear fases sem autorização técnica.</li>
</ul>

<h3>Resumo da aula</h3>
<p>Medir corrente circuito a circuito e interpretar com contexto: identificar circuito, rack, carga, redundância e distribuição entre fases. Corrente elevada exige investigação — não troca automática do disjuntor.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar por que medir a corrente de cada circuito/disjuntor.</li>
  <li>☐ Explicar a relação entre corrente e carga.</li>
  <li>☐ Aplicar o fluxo de investigação de corrente elevada.</li>
  <li>☐ Explicar que corrente elevada não significa trocar o disjuntor.</li>
</ul>
`,
  13: `
<h2>Inspeção e Anormalidades</h2>

<h3>Objetivo da aula</h3>
<p>Identificar preventivamente sinais que exigem investigação, registro e histórico, usando um raciocínio completo — não apenas números isolados.</p>

<h3>Introdução</h3>
<p>Nem tudo se vê em uma leitura. A inspeção combina medição, observação, histórico e contexto para identificar condições que podem evoluir para falhas.</p>

<h3>O que é uma anormalidade?</h3>
<div class="concept-box"><strong>Conceito:</strong> anormalidade é qualquer condição fora do esperado para aquele ponto: aquecimento, corrente anormal, tensão anormal, degradação física, comportamento diferente do histórico, anormalidades em quadros e anormalidades em baterias.</div>

<h3>Exemplos sustentados pelo conteúdo</h3>
<ul>
  <li><strong>Aquecimento:</strong> ponto mais quente que o histórico indica resistência de contato, sobrecarga ou mau aperto.</li>
  <li><strong>Corrente anormal:</strong> fora do esperado para a carga configurada — investigar (ver M11).</li>
  <li><strong>Tensão anormal:</strong> fora do histórico ou das referências de campo — verificar condição da fonte.</li>
  <li><strong>Degradação:</strong> sinais visíveis de envelhecimento, oxidação ou dano físico.</li>
  <li><strong>Quadros:</strong> mau contato, aquecimento, identificação errada, componentes danificados.</li>
  <li><strong>Baterias:</strong> comportamento em flutuação/descarga diferente do grupo e condição física alterada.</li>
</ul>

<h3>Como o profissional deve pensar durante a inspeção</h3>
<div class="procedure-box"><strong>Método de análise:</strong><br>
<strong>MEDIR</strong> (leitura no ponto)<br>
<strong>+ OBSERVAR</strong> (condição física e do ambiente)<br>
<strong>+ COMPARAR COM HISTÓRICO</strong> (medições anteriores e tendência)<br>
<strong>+ ANALISAR CONTEXTO</strong> (procedimento, configuração, fabricante, restrições).</div>

<h3>Importância de evidências e registros</h3>
<div class="procedure-box"><strong>Registro mínimo de uma anormalidade:</strong>
<ul>
  <li>equipamento e circuito afetado;</li>
  <li>condição encontrada;</li>
  <li>medição/valor lido;</li>
  <li>horário da observação;</li>
  <li>evidência coletada (foto/anotação);</li>
  <li>observação objetiva;</li>
  <li>ação realizada ou recomendada.</li>
</ul></div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Durante a rotina, o profissional inspeciona quadros, caminhos, conexões e baterias, mede os pontos previstos e registra qualquer condição fora do esperado. A inspeção não termina na medição — termina na interpretação com contexto.</p>

<h3>Situações de atenção</h3>
<div class="attention-box"><strong>Atenção — tendência:</strong> uma alteração gradual no tempo pode ser tão importante quanto uma anormalidade imediata. O histórico permite ver tendências: medição anterior → medição atual.</div>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar com medições e evidências, comparar com histórico, comunicar conforme o fluxo e encaminhar o tratamento previsto. Não concluir diagnóstico com uma única medição. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> ao encontrar uma condição de risco, priorizar a segurança: sinalizar, comunicar e evitar contato — primeiro a segurança, depois a medição.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Concluir por uma leitura isolada.</li>
  <li>Ignorar sinais visuais (aquecimento, degradação).</li>
  <li>Registrar de forma genérica, sem detalhes.</li>
</ul>

<h3>Resumo da aula</h3>
<p>A inspeção preventiva identifica anormalidades combinando medição, observação, histórico e contexto. Todo achado é registrado com evidências para formar o histórico e permitir o tratamento adequado.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Citar exemplos de anormalidades (aquecimento, correntes/tensões anormais, degradação).</li>
  <li>☐ Explicar o método: medir + observar + comparar com histórico + analisar contexto.</li>
  <li>☐ Explicar a importância de evidências e registros.</li>
  <li>☐ Reconhecer que alterações graduais (tendências) também são relevantes.</li>
</ul>
`,
  14: `
<h2>Teste de Baterias</h2>

<h3>Objetivo da aula</h3>
<p>Avaliar baterias elemento a elemento, em flutuação e em descarga, com testes complementares quando previsto, usando uma metodologia baseada nos dados fornecidos — sem diagnóstico por leitura isolada.</p>

<h3>Introdução</h3>
<p>Um banco aparentemente normal pode esconder um elemento com comportamento desviante. Por isso as baterias são medidas <strong>uma a uma</strong>, e cada parâmetro é comparado com o grupo e com o histórico.</p>

<h3>O que é o teste de baterias?</h3>
<p>É o conjunto de medições e verificações realizadas em cada elemento para avaliar a condição da bateria: tensão (flutuação e descarga), resistência interna, corrente quando aplicável, condição física e — quando previsto — teste complementar com resistor/carga.</p>

<h3>Por que medir individualmente?</h3>
<div class="concept-box"><strong>Conceito:</strong> o banco pode parecer normal no conjunto, mas um único elemento desviante pode comprometer a autonomia. A comparação entre elementos do mesmo grupo é a primeira referência relativa.</div>

<h3>Grandezas avaliadas</h3>
<ul>
  <li><strong>Tensão:</strong> nível de cada elemento, em flutuação e em descarga.</li>
  <li><strong>Resistência interna:</strong> indicador de estado interno do elemento; nunca analisado isoladamente.</li>
  <li><strong>Corrente (quando aplicável):</strong> auxilia a avaliar comportamento do circuito.</li>
  <li><strong>Teste com resistor/carga (quando previsto):</strong> teste complementar que submete o elemento a uma condição controlada.</li>
  <li><strong>Histórico:</strong> comparação com medições anteriores e tendência.</li>
  <li><strong>Condição física:</strong> bornes, conexões, sinais de aquecimento, vazamentos e danos.</li>
  <li><strong>Flutuação / descarga:</strong> comportamento em operação normal e durante descarga.</li>
</ul>

<h3>Metodologia de análise baseada nos dados fornecidos</h3>
<ol>
  <li>Medir cada elemento (tensão; resistência interna quando prevista; corrente quando aplicável).</li>
  <li>Comparar os elementos entre si (o próprio grupo como referência relativa).</li>
  <li>Comparar com o histórico e com as referências de campo informadas para o ambiente.</li>
  <li>Verificar condição física e temperatura das conexões.</li>
  <li>Quando um elemento destoa, repetir a medição e aplicar o teste complementar previsto.</li>
  <li>Registrar tudo e encaminhar conclusão conforme procedimento aplicável.</li>
</ol>

<h3>Referências de campo (não universais)</h3>
<div class="reference-box"><strong>Referências informadas:</strong><br>
UPS: 12 V / ~150 Ah, 40 elementos, ~13,7 V em flutuação, referência de campo ~12,5 V em descarga.<br>
FCC: configurações de 2 V / ~1000 Ah seladas; 12 V; determinadas instalações com 12 bancos / 48 baterias.<br>
<strong>Não são limites universais de aprovação.</strong></div>

<div class="attention-box"><strong>Importante:</strong> <em>uma única leitura de resistência interna não deve ser usada isoladamente para concluir que uma bateria está aprovada ou reprovada.</em> Análise sempre em conjunto com tensão, descarga, temperatura, histórico, condição física e especificação do fabricante.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Com o HIOKI BT3554-01 (ou instrumento previsto), o profissional mede elemento a elemento, registra as leituras e compara o comportamento de cada bateria com o do grupo.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Elemento com tensão ou resistência bem diferente dos demais.</li>
  <li>Aquecimento ou sinais de vazamento em um elemento.</li>
  <li>Queda de tensão rápida durante descarga.</li>
</ul>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Repetir a medição, verificar conexão, comparar com o grupo e o histórico, avaliar temperatura e resistência, realizar teste complementar quando previsto e registrar. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> risco de curto-circuito e de contato com tensão DC. Retirar objetos metálicos, usar ferramentas isoladas e seguir o procedimento com autorização.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Diagnosticar pela resistência interna isolada.</li>
  <li>Medir apenas a tensão total do banco.</li>
  <li>Não comparar com o grupo e o histórico.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O teste de baterias mede elemento a elemento (tensão, resistência interna, corrente quando aplicável), compara com o grupo e o histórico, e usa testes complementares quando previsto. Nenhum parâmetro isolado fecha diagnóstico.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar por que as baterias são medidas uma a uma.</li>
  <li>☐ Listar os parâmetros avaliados no teste de baterias.</li>
  <li>☐ Explicar que resistência interna isolada não é diagnóstico definitivo.</li>
  <li>☐ Aplicar a metodologia de análise com grupo, histórico e testes complementares.</li>
</ul>
`,
  15: `
<h2>Procedimento FCC — Descarga dos Retificadores</h2>

<h3>Objetivo da aula</h3>
<p>Executar fielmente a sequência de descarga dos retificadores informada, entendendo o que acontece em cada etapa, sem expor credenciais e sem improvisar parâmetros.</p>

<h3>Introdução</h3>
<p>Este procedimento é realizado para exercitar os retificadores e as baterias do FCC, colocando o sistema em condição de descarga controlada por um tempo limitado. A sequência abaixo está descrita <strong>exatamente como fornecida</strong> para este ambiente.</p>

<div class="attention-box"><strong>Atenção:</strong> este é um procedimento operacional específico do ambiente informado. Não é regra universal para qualquer FCC — sempre consultar o procedimento do equipamento/site.</div>

<h3>Procedimento operacional específico</h3>
<ol>
  <li><strong>Ajustes de Parâmetros → ACU:</strong> entrar na tela de ajuste de parâmetros do ACU para alterar a referência de descarga.</li>
  <li><strong>Modo Manual:</strong> colocar o modo de operação em manual, permitindo controlar os ajustes de forma comandada.</li>
  <li><strong>Bat. em Descarga = 47.0:</strong> ajustar o parâmetro de bateria em descarga para o valor informado (47.0).</li>
  <li><strong>Menu Principal → Manutenção → Grupo Ret:</strong> acessar o menu de manutenção e o grupo de retificadores.</li>
  <li><strong>Tensão = 48.00 V:</strong> ajustar a tensão do grupo de retificadores para 48.00 V, levando o sistema à condição de descarga controlada.</li>
  <li><strong>Aguardar aproximadamente 10 minutos:</strong> manter o sistema em descarga por esse tempo. <em>A duração pode variar conforme a carga do HUB e o procedimento.</em></li>
  <li><strong>Retornar tensão para 54.00 V:</strong> reajustar a tensão para 54.00 V, começando o retorno do sistema.</li>
  <li><strong>Ajustes de Parâmetros → ACU:</strong> voltar à tela de ajuste de parâmetros do ACU.</li>
  <li><strong>Bat. em Descarga = 49.2:</strong> ajustar o parâmetro de bateria em descarga para o valor informado (49.2).</li>
  <li><strong>Modo Automático:</strong> retornar o modo de operação para automático.</li>
  <li><strong>Verificar retorno para aproximadamente 54.00 V:</strong> confirmar que o sistema retorna para aproximadamente 54.00 V.</li>
</ol>

<div class="attention-box"><strong>Atenção — credenciais:</strong> <strong>senhas ou credenciais de acesso não fazem parte deste treinamento</strong> e não devem ser expostas ou registradas.</div>

<h3>O que observar durante o procedimento?</h3>
<ul>
  <li>Comportamento da tensão em cada etapa (descida na descarga e retorno após o ajuste).</li>
  <li>Duração aproximada de 10 minutos — dependente da carga do HUB.</li>
  <li>Retorno do sistema para aproximadamente 54.00 V no modo automático.</li>
</ul>

<h3>Situações de atenção</h3>
<ul>
  <li>Sistema não retornando ao comportamento esperado.</li>
  <li>Alarme ou indicação incomum durante a descarga.</li>
</ul>

<h3>O que fazer quando houver uma divergência?</h3>
<p>Conferir os ajustes realizados conforme o procedimento. <strong>Não alterar parâmetros "por conta"</strong> nem improvisar valores. Registar e consultar o responsável. <strong>Consultar procedimento aplicável, documentação técnica, fabricante ou configuração específica do local.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> a descarga controlada envolve o sistema DC e baterias. Exigir autorização, procedimento, equipe habilitada e EPI/EPC adequados. Não aplicar em outros FCCs sem o procedimento do local.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Trocar a ordem ou os valores do procedimento.</li>
  <li>Improvisar ajustes quando o sistema não retorna.</li>
  <li>Expor senhas/credenciais.</li>
  <li>Tratar o procedimento como universal.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O procedimento leva os retificadores à descarga controlada (47.0 → 48.00 V por ~10 min) e depois retorna (54.00 V → 49.2 → automático, verificando ~54.00 V). Sequência e valores seguem rigorosamente o informado; duração varia com a carga do HUB.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Reproduzir a sequência exata do procedimento de descarga dos retificadores.</li>
  <li>☐ Explicar o que ocorre em cada etapa.</li>
  <li>☐ Reconhecer que o tempo pode variar conforme a carga do HUB.</li>
  <li>☐ Explicar por que o procedimento é específico do ambiente e não universal.</li>
</ul>
`,
  16: `
<h2>HIOKI BT3554-01 — Medição e Registro</h2>

<h3>Objetivo da aula</h3>
<p>Operar o HIOKI BT3554-01 conforme o fluxo informado: instalação do driver, conexão USB, 0-ADJ, medição individual, memória, transferência no GENNECT One e exportação de PDF/CSV.</p>

<h3>Introdução</h3>
<p>O BT3554-01 é o instrumento utilizado para a medição de baterias (tensão e resistência interna). Uma operação correta evita leituras inválidas e registros errados — o que começa no driver e termina na exportação dos dados.</p>

<h3>O que é?</h3>
<p>O HIOKI BT3554-01 é um medidor de bateria que mede a resistência interna e a tensão de elementos de forma rápida, armazenando leituras em memória para transferência ao computador.</p>

<h3>Para que serve?</h3>
<p>Medir baterias elemento a elemento na preventiva e organizar os dados no GENNECT One para análise, comparação com histórico e registro (exportação PDF/CSV).</p>

<h3>Instalação do driver</h3>
<div class="procedure-box"><strong>Passos informados:</strong>
<ol>
  <li>Localizar o driver na pasta informada do GENNECT One: <code>C:\\Program Files (x86)\\HIOKI\\GENNECT One\\driver</code>.</li>
  <li>Executar o instalador correspondente à arquitetura do sistema: <strong>DPInst64.exe</strong> (64 bits) ou <strong>DPInst32.exe</strong> (32 bits).</li>
  <li>Executar com privilégios de administrador.</li>
  <li>Instalar o driver HIOKI E.E. CORPORATION.</li>
</ol></div>

<h3>Conexão USB e reconhecimento</h3>
<p>Após instalar o driver, conectar o equipamento ao computador por USB e confirmar o reconhecimento do instrumento (ícone/indicador de conexão com o PC).</p>

<h3>Zero Adjustment — 0-ADJ</h3>
<div class="procedure-box"><strong>Como realizar o 0-ADJ (padronizar a grafia "0-ADJ"):</strong>
<ol>
  <li>Conectar as pontas de teste conforme orientação.</li>
  <li>Encostar o pino central de uma ponta na parte externa da outra (curto de ajuste).</li>
  <li>Executar <strong>0-ADJ</strong> no instrumento.</li>
  <li>Confirmar indicação próxima de zero.</li>
</ol></div>

<h3>A.MEM (memória automática)</h3>
<div class="concept-box"><strong>A.MEM:</strong> quando ativo, o instrumento armazena a leitura automaticamente após a estabilização. Se estiver desativado, registrar/manter memória manualmente após o aviso sonoro.</div>

<h3>Medição individual</h3>
<div class="procedure-box"><strong>Fluxo de medição:</strong>
<ol>
  <li>Posicionar as pontas no elemento.</li>
  <li>Aguardar a estabilização da leitura.</li>
  <li>Aguardar o aviso sonoro.</li>
  <li>Registrar a leitura na memória.</li>
  <li>Repetir elemento a elemento.</li>
</ol></div>

<h3>Transferência e registro — GENNECT One</h3>
<div class="procedure-box"><strong>Fluxo (referência):</strong>
<ol>
  <li>Instrument Connection → Search → BT3554-01 Connected.</li>
  <li>File Acquisition → selecionar os dados desejados → Import.</li>
  <li>Data List para conferir as leituras.</li>
  <li>Exportar em <strong>PDF</strong> (relatório) e/ou <strong>CSV</strong> (planilha), conforme necessidade.</li>
</ol></div>

<h3>Troubleshooting (baseado nas informações fornecidas)</h3>
<div class="procedure-box"><strong>Equipamento não aparece no GENNECT One:</strong>
<ul>
  <li>verificar cabo USB;</li>
  <li>testar outra porta USB;</li>
  <li>verificar instalação do driver.</li>
</ul></div>
<div class="procedure-box"><strong>Dados não aparecem após a aquisição:</strong>
<ul>
  <li>verificar o contador de memória do instrumento;</li>
  <li>confirmar que a memória não está em <strong>000</strong> antes da aquisição.</li>
</ul></div>

<div class="attention-box"><strong>Atenção:</strong> a resistência interna medida deve ser analisada <strong>em conjunto</strong> com as demais informações (tensão, descarga, comparação entre elementos, histórico e condição física). Uma única leitura não é diagnóstico definitivo.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Na preventiva, o profissional prepara o instrumento (driver + conexão), faz o 0-ADJ, mede as baterias elemento a elemento com A.MEM e transfere os dados pelo GENNECT One para exportação e registro.</p>

<h3>Situações de atenção</h3>
<ul>
  <li>Medir sem realizar o 0-ADJ.</li>
  <li>Transferir dados com a memória em 000 (sem registros).</li>
  <li>Apresentar resistência interna isolada como conclusão.</li>
</ul>

<h3>O que fazer diante de um problema?</h3>
<p>Seguir o troubleshooting: cabo USB, outra porta, driver; memória/contador antes da aquisição. Se persistir, registrar e encaminhar. <strong>Consultar manual do fabricante, documentação técnica ou procedimento aplicável.</strong></p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> o 0-ADJ e a medição exigem contato adequado das pontas com os elementos. Utilizar o instrumento conforme orientação e com EPI/EPC conforme o ponto de trabalho.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Escrever "0ADJ" — a forma padronizada é <strong>0-ADJ</strong>.</li>
  <li>Medir sem estabilização da leitura.</li>
  <li>Esquecer de transferir/exportar os dados após a medição.</li>
  <li>Concluir bateria aprovada/reprovada só pela resistência interna.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O HIOKI BT3554-01 é usado para medir baterias: driver (DPInst64/32), conexão USB, 0-ADJ, medição individual com A.MEM, transferência no GENNECT One e exportação PDF/CSV. Resistência interna é analisada com contexto.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Instalar o driver e conectar o instrumento por USB.</li>
  <li>☐ Realizar o 0-ADJ corretamente.</li>
  <li>☐ Medir elemento a elemento com A.MEM e memória do instrumento.</li>
  <li>☐ Transferir e exportar dados no GENNECT One (PDF/CSV).</li>
  <li>☐ Aplicar o troubleshooting básico (USB, porta, driver, memória).</li>
</ul>
`,
  17: `
<h2>Infratel e Registro</h2>

<h3>Objetivo da aula</h3>
<p>Registrar atividade, medições, evidências, anormalidades, relatório e encerramento de forma objetiva, formando o histórico auditável da manutenção — sem inventar telas.</p>

<h3>Introdução</h3>
<p>A preventiva só está completa quando está registrada. O registro no Infratel transforma medições e observações em histórico, permitindo comparações futuras e rastreabilidade.</p>

<h3>O que é?</h3>
<p>O Infratel é o sistema usado para registrar e encerrar as atividades de manutenção. Registrar é descrever o que foi feito e o que foi encontrado, com dados e evidências.</p>

<h3>Para que serve?</h3>
<div class="concept-box"><strong>Finalidade:</strong> registrar o que foi feito, quando, onde, quem participou, quais medições, quais anormalidades e quais evidências. Sem registro, não há histórico auditável da manutenção.</div>

<h3>Elementos de um bom registro</h3>
<ul>
  <li><strong>Ticket:</strong> identifica a atividade autorizada.</li>
  <li><strong>Atividade:</strong> descreve o que está sendo executado.</li>
  <li><strong>Autorização:</strong> validada antes do início.</li>
  <li><strong>Medições:</strong> valores encontrados nos pontos previstos.</li>
  <li><strong>Evidências:</strong> registros que comprovam a condição (anotações/fotos).</li>
  <li><strong>Anormalidades:</strong> condições fora do esperado encontradas.</li>
  <li><strong>Relatório:</strong> sumariza o resultado da atividade.</li>
  <li><strong>Encerramento:</strong> finalização formal no Infratel.</li>
</ul>

<h3>Diferença entre registrar o que "fez" e o que "encontrou"</h3>
<div class="attention-box"><strong>Atenção:</strong> escrever apenas "Preventiva realizada" informa que você esteve lá — mas não informa <strong>o que foi encontrado</strong>. Um bom registro permite que outra pessoa, sem estar presente, entenda exatamente o que aconteceu.</div>

<h3>Exemplo de registro objetivo (sem inventar campos do sistema)</h3>
<div class="procedure-box"><strong>Estrutura sugerida de registro:</strong>
<ul>
  <li>Equipamento: QDGE</li>
  <li>Ponto: Circuito X</li>
  <li>Medição: valor encontrado</li>
  <li>Condição: normal/anormal conforme procedimento</li>
  <li>Observação: descrição objetiva</li>
  <li>Evidência: registro correspondente</li>
  <li>Ação: realizada ou encaminhada</li>
</ul></div>

<h3>Como o profissional encontra isso na prática?</h3>
<p>Durante a rotina, um profissional mede enquanto o outro registra/confere. Ao final, toda a documentação (medições, anormalidades, evidências) é consolidada e a atividade é encerrada no Infratel.</p>

<h3>Situações de atenção</h3>
<div class="attention-box"><strong>Atenção:</strong> neste treinamento, nenhuma tela ou campo específico do Infratel é descrito além do fluxo informado. Não inventar telas, campos ou funcionalidades.</div>

<h3>O que fazer quando encontrar uma anormalidade?</h3>
<p>Registrar imediatamente no relatório da atividade: condição, medição, horário, evidência e ação realizada ou recomendada. Comparar com histórico e encaminhar conforme procedimento.</p>

<h3>Segurança</h3>
<div class="attention-box"><strong>Atenção:</strong> registrar não substitui segurança. A atividade registrada deve, antes de tudo, ter sido autorizada e executada de forma segura.</div>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Registro genérico ("Preventiva realizada") sem detalhes.</li>
  <li>Registrar valores sem informar onde foram medidos.</li>
  <li>Esquecer de registrar anormalidades encontradas.</li>
  <li>Encerrar a atividade antes de conferir as medições.</li>
</ul>

<h3>Resumo da aula</h3>
<p>O Infratel registra ticket, atividade, autorização, medições, evidências, anormalidades, relatório e encerramento. O objetivo é formar um histórico auditável — registrar o que foi encontrado, não apenas que a atividade foi feita.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar a finalidade do registro no Infratel.</li>
  <li>☐ Diferenciar "registrar que fez" de "registrar o que foi encontrado".</li>
  <li>☐ Produzir um registro objetivo com os elementos essenciais.</li>
  <li>☐ Explicar o fluxo: ticket → autorização → execução → medições → registros → relatório → encerramento.</li>
</ul>
`,
  18: `
<h2>Segurança — NR-10 e Procedimentos</h2>

<h3>Objetivo da aula</h3>
<p>Aplicar princípios de segurança, EPI/EPC, autorização, procedimentos, documentação e análise de risco, e reconhecer os limites deste treinamento em relação à legislação e aos procedimentos corporativos.</p>

<h3>Introdução</h3>
<p>Segurança vem antes de qualquer medição: nenhuma leitura justifica ignorar uma condição de risco. Esta aula consolida os princípios que orientam toda a rotina preventiva.</p>

<h3>O que é?</h3>
<p>Segurança em instalações elétricas envolve o conjunto de medidas de proteção aplicáveis a quem atua em eletricidade: controle de riscos, uso de equipamentos de proteção, autorização, procedimentos e documentação.</p>

<h3>Princípios fundamentais</h3>
<ul>
  <li><strong>Autorização:</strong> nenhuma intervenção começa sem autorização formal.</li>
  <li><strong>Procedimentos:</strong> seguir o procedimento do local antes de qualquer improviso.</li>
  <li><strong>EPI/EPC:</strong> usar os equipamentos de proteção individual e coletiva aplicáveis ao ponto.</li>
  <li><strong>Análise de risco:</strong> identificar e avaliar os riscos do ponto antes da atividade.</li>
  <li><strong>Documentação:</strong> registrar a atividade e as condições encontradas.</li>
  <li><strong>Respeito ao fabricante:</strong> seguir as instruções e documentação técnica do fabricante.</li>
</ul>

<h3>NR-10</h3>
<div class="concept-box"><strong>NR-10:</strong> atividades em instalações elétricas devem observar os requisitos aplicáveis da NR-10 — além de procedimentos corporativos, normas técnicas pertinentes e documentação do local. Este treinamento não substitui a NR-10, procedimentos corporativos, autorização formal, documentação técnica ou instruções do fabricante.</div>

<h3>Como o profissional encontra isso na prática?</h3>
<div class="procedure-box"><strong>Antes de começar:</strong>
<ul>
  <li>verificar autorização;</li>
  <li>verificar procedimento aplicável;</li>
  <li>utilizar EPI/EPC correspondentes;</li>
  <li>avaliar os riscos do ponto;</li>
  <li>conhecer o equipamento;</li>
  <li>respeitar as condições operacionais vigentes.</li>
</ul></div>

<h3>Operação segura</h3>
<ul>
  <li>Identificar os pontos de risco e sinalizar quando necessário.</li>
  <li>Utilizar instrumentos e ferramentas adequados ao trabalho.</li>
  <li>Trabalhar em equipe quando o procedimento prevê (um mede, o outro registra/confere).</li>
  <li>Parar e comunicar diante de uma condição de risco.</li>
</ul>

<h3>Situações de atenção</h3>
<div class="attention-box"><strong>Não improvisar:</strong>
<ul>
  <li>não altere parâmetros sem autorização;</li>
  <li>não modifique circuitos sem compreender a arquitetura;</li>
  <li>não desligue cargas críticas sem procedimento;</li>
  <li>não ignore alarmes em andamento;</li>
  <li>não substitua componentes "por suspeita";</li>
  <li>não use valores de referência como limites universais.</li>
</ul></div>

<h3>O que fazer em caso de condição de risco?</h3>
<p>Interromper a atividade conforme o procedimento, sinalizar, comunicar o responsável e registrar o ocorrido. Segurança tem prioridade sobre qualquer prazo ou conveniência.</p>

<h3>Documentação</h3>
<p>Registrar autorização, medições, anormalidades e evidências. Documentação bem feita protege a equipe, a operação e o histórico da manutenção.</p>

<h3>Erros que devem ser evitados</h3>
<ul>
  <li>Começar sem autorização.</li>
  <li>Ignorar EPI/EPC.</li>
  <li>Abrir mão da análise de risco por pressa.</li>
  <li>Substituir o procedimento do local por conhecimento genérico decorado.</li>
</ul>

<h3>Resumo da aula</h3>
<p>A segurança envolve autorização, procedimentos, EPI/EPC, análise de risco, documentação e respeito às instruções do fabricante, nos termos aplicáveis da NR-10. A cartilha não substitui esses requisitos.</p>

<h3>Ao final desta aula, você deve ser capaz de:</h3>
<ul class="checklist-aula">
  <li>☐ Explicar os princípios de segurança da atividade (autorização, EPI/EPC, procedimentos).</li>
  <li>☐ Explicar que a NR-10 e os procedimentos corporativos prevalecem sobre este treinamento.</li>
  <li>☐ Listar itens da lista "não improvisar".</li>
  <li>☐ Explicar que documento e autorização não são opcionais na rotina preventiva.</li>
</ul>
`
};

// ============================================================================
// Aplicação  (idempotente: pula lições que já contêm o marcador)
// ============================================================================
function main() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const get = db.prepare('SELECT id, title, content FROM training_lessons WHERE id = ?');
  const upd = db.prepare('UPDATE training_lessons SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

  let updated = 0;
  let skipped = 0;
  const report = [];

  Object.entries(AULA).forEach(([lessonId, newBody]) => {
    const id = Number(lessonId);
    const row = get.get(id);
    if (!row) { console.log('SKIP lessonId=' + id + ' (not found)'); skipped++; return; }
    if (String(row.content || '').includes(MARKER)) {
      console.log('SKIP lessonId=' + id + ' (already enriched)');
      skipped++;
      return;
    }

    const before = String(row.content || '').length;

    // Reaproveita o bloco "Teste seus conhecimentos" existente (se houver)
    const existing = String(row.content || '');
    const qIdx = existing.indexOf(QUIZ_MARKER);
    const quizBlock = qIdx >= 0 ? existing.slice(qIdx).trimEnd() : '';

    const testeSeusConhecimentos = quizBlock
      ? quizBlock
      : `<div class="concept-box"><strong>🧠 Teste seus conhecimentos:</strong> responda os checkpoints desta aula no final da lição. As perguntas avaliam exatamente o que foi explicado aqui — se tiver dúvida, reveja o conteúdo antes de prosseguir. Isso prepara você para o Simulado Final.</div>`;

    let content = MARKER + '\n' + newBody.trim() + '\n\n' + testeSeusConhecimentos.trim() + '\n';

    const info = upd.run(content, id);
    report.push({ id, title: row.title, before, after: content.length });
    console.log('ENRIQUECIDA lessonId=' + id + ' "' + row.title + '" antes=' + before + ' depois=' + content.length + ' (+' + (content.length - before) + ')');
    updated++;
  });

  const totalLessons = db.prepare('SELECT COUNT(*) c FROM training_lessons').get().c;
  const stillPending = db.prepare("SELECT COUNT(*) c FROM training_lessons WHERE status='PENDING_TECHNICAL_VALIDATION'").get().c;
  console.log('\n=== RESUMO ENRIQUECIMENTO ===');
  console.log('Lições atualizadas: ' + updated + ' | puladas: ' + skipped);
  console.log('Total de lições no banco: ' + totalLessons);
  console.log('Lições com status PENDING_TECHNICAL_VALIDATION: ' + stillPending + '/' + totalLessons);

  db.close();
}

main();