// Seed do MINI-CURSO NR-10 — Segurança em Instalações e Serviços em Eletricidade
// Segue os mesmos padrões e requisitos dos demais módulos do site:
//   training_modules -> training_lessons -> lesson_checkpoints/checkpoint_options
//   questions/question_options (avaliação final, com explanation = justificativa)
// Idempotente: só insere o que ainda não existe. NÃO apaga nada (diferente do seed_quiz.cjs).
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

const MODULES = [
  { title: 'NR-10 — Introdução e Conceitos Fundamentais', description: 'Por que a NR-10 existe, onde se aplica e os conceitos-chave de tensão e zonas (BT, AT, EBT, zonas de risco, controlada e livre).', order: 18, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — Riscos em Instalações Elétricas', description: 'Choque elétrico, limiares fisiológicos, fatores de gravidade, fenômenos patológicos, arco elétrico e campos eletromagnéticos.', order: 19, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — Medidas de Controle do Risco', description: 'Sequência de desenergização, tipos e esquemas de aterramento, DR, SELV/PELV, barreiras, invólucros, obstáculos e bloqueios.', order: 20, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — EPI e EPC', description: 'Equipamentos de proteção coletiva e individual aplicados a trabalhos elétricos e classes de luvas isolantes.', order: 21, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — Riscos Adicionais', description: 'Altura, ambientes confinados, áreas classificadas, umidade, condições atmosféricas e tipos de proteção Ex.', order: 22, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — Rotinas de Trabalho e Documentação', description: 'Prontuário de instalações elétricas, habilitação/qualificação/capacitação, treinamentos e sinalização de segurança.', order: 23, category: 'NR-10', duration: 17 },
  { title: 'NR-10 — Responsabilidades', description: 'Responsabilidades trabalhista, civil e criminal, culpa e suas modalidades, responsabilidade objetiva e direito de recusa.', order: 24, category: 'NR-10', duration: 16 },
];

const LESSONS = [
  {
    module: 'NR-10 — Introdução e Conceitos Fundamentais',
    title: 'NR-10 — Introdução e Conceitos Fundamentais',
    objective: 'Compreender por que a NR-10 existe, onde se aplica e dominar os conceitos de BT, AT, EBT e zonas',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>NR-10 — Introdução e Conceitos Fundamentais</h2>
<h3>Por que a NR-10 existe?</h3>
<p>A eletricidade é a forma de energia mais utilizada na sociedade moderna. Sua invisibilidade é o maior perigo: não a vemos, não a sentimos até que seja tarde. A NR-10 estabelece requisitos e condições mínimas para garantir a segurança e a saúde dos trabalhadores que interajam direta ou indiretamente com instalações elétricas.</p>
<div class="concept-box"><strong>📘 Aplicação:</strong> geração, transmissão, distribuição e consumo — incluindo projeto, construção, montagem, operação e manutenção.</div>
<h3>Números que assustam (dados históricos)</h3>
<ul>
<li>Para cada morte de empregado próprio do setor elétrico, correspondem cerca de <strong>4 mortes de terceirizados</strong> e <strong>15 mortes envolvendo a população</strong>.</li>
<li>Em 2006: <strong>93 acidentes fatais</strong> na força de trabalho do setor.</li>
<li>Média diária: quase <strong>3 acidentes com a população</strong>, sendo <strong>1 fatal</strong>.</li>
</ul>
<h3>Conceitos-chave que você precisa dominar</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Termo</th><th>Definição</th></tr>
<tr><td>Baixa Tensão (BT)</td><td>&gt; 50V CA ou 120V CC e ≤ 1000V CA / 1500V CC</td></tr>
<tr><td>Alta Tensão (AT)</td><td>&gt; 1000V CA ou 1500V CC</td></tr>
<tr><td>Extra-Baixa Tensão (EBT)</td><td>≤ 50V CA ou 120V CC</td></tr>
<tr><td>Zona de Risco</td><td>Entorno de parte energizada — só profissionais autorizados</td></tr>
<tr><td>Zona Controlada</td><td>Entorno de parte energizada — só profissionais autorizados com técnicas apropriadas</td></tr>
<tr><td>Zona Livre</td><td>Fora das zonas de risco e controlada</td></tr>
</table>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong> — material educacional; não substitui o curso oficial de NR-10 (40h) nem a leitura integral da norma atualizada.</p>`,
  },
  {
    module: 'NR-10 — Riscos em Instalações Elétricas',
    title: 'NR-10 — Riscos em Instalações Elétricas',
    objective: 'Identificar os riscos do choque elétrico, limiares fisiológicos, fenômenos patológicos, arco elétrico e campos eletromagnéticos',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — Riscos em Instalações Elétricas</h2>
<h3>Choque Elétrico</h3>
<p><strong>Definição:</strong> passagem de corrente elétrica pelo corpo humano, usando-o como condutor.</p>
<p>3 categorias:</p>
<ul>
<li><strong>Contato com circuito energizado</strong> — dura enquanto houver contato</li>
<li><strong>Contato com corpo eletrizado</strong> — eletricidade estática, curtíssima duração</li>
<li><strong>Descarga atmosférica (raio)</strong> — efeitos terríveis e imediatos</li>
</ul>
<h3>Limiares fisiológicos (DECORE!)</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Limiar</th><th>Valor</th><th>Efeito</th></tr>
<tr><td>Sensação</td><td>1 mA (CA) / 5 mA (CC)</td><td>Formigamento / aquecimento</td></tr>
<tr><td>Não largar</td><td>9–23 mA (homens) / 6–14 mA (mulheres)</td><td>Contração muscular, "agarramento"</td></tr>
<tr><td>Fibrilação ventricular</td><td>Acima destes</td><td>Risco de morte</td></tr>
</table>
<h3>Fatores que influenciam a gravidade do choque</h3>
<ul>
<li>Percurso da corrente no corpo (mão-mão e mão-pé são os mais perigosos)</li>
<li>Tipo de corrente (CA é mais perigosa que CC)</li>
<li>Tensão nominal (acima de 50V CA já é perigoso)</li>
<li>Intensidade da corrente</li>
<li>Tempo de duração (quanto maior, pior)</li>
<li>Frequência (frequências &gt; 100.000 Hz são menos sentidas)</li>
</ul>
<h3>Os 4 fenômenos patológicos críticos</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Fenômeno</th><th>O que é</th></tr>
<tr><td>Tetanização</td><td>Contração muscular involuntária que "trava" a vítima</td></tr>
<tr><td>Parada respiratória</td><td>Paralisia dos músculos respiratórios</td></tr>
<tr><td>Queimadura</td><td>Efeito Joule — calor gerado pela corrente</td></tr>
<tr><td>Fibrilação ventricular</td><td>Coração perde o ritmo coordenado — leva à morte em ~3 min</td></tr>
</table>
<h3>Arco Elétrico</h3>
<p>Ruptura dielétrica do ar que gera descarga de plasma. Libera:</p>
<ul>
<li>Calor intenso</li>
<li>Partículas metálicas ionizadas</li>
<li>Radiação UV (prejudicial à visão)</li>
<li>Alta pressão (prejudicial ao sistema auditivo)</li>
</ul>
<p><strong>Causas principais:</strong> mau contato, depreciação da isolação, defeito de fabricação, projeto inadequado, manutenção incorreta, erro humano.</p>
<h3>Campos Eletromagnéticos</h3>
<p>Presentes em linhas de transmissão, subestações e equipamentos elétricos. Pessoas com marca-passo, aparelhos auditivos e outros dispositivos eletrônicos devem ter cuidado especial.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'NR-10 — Medidas de Controle do Risco',
    title: 'NR-10 — Medidas de Controle do Risco',
    objective: 'Aplicar a sequência de desenergização, esquemas de aterramento, DR, SELV/PELV e proteções contra contato',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — Medidas de Controle do Risco</h2>
<h3>A Sequência Sagrada da Desenergização (DECORE!)</h3>
<p>Toda instalação só é considerada desenergizada após cumprir rigorosamente esta sequência:</p>
<div class="procedure-box"><strong>🛠️ Sequência (item 10.5.1):</strong>
<ol>
<li><strong>SECCIONAMENTO</strong></li>
<li><strong>IMPEDIMENTO DE REENERGIZAÇÃO</strong></li>
<li><strong>CONSTATAÇÃO DA AUSÊNCIA DE TENSÃO</strong></li>
<li><strong>ATERRAMENTO TEMPORÁRIO + EQUIPOTENCIALIZAÇÃO</strong></li>
<li><strong>PROTEÇÃO DOS ELEMENTOS ENERGIZADOS EXISTENTES</strong></li>
<li><strong>SINALIZAÇÃO DE IMPEDIMENTO DE REENERGIZAÇÃO</strong></li>
</ol>
<p><strong>Reenergização:</strong> sequência inversa, removendo tudo na ordem oposta.</p></div>
<h3>Tipos de Aterramento</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Função</th></tr>
<tr><td>Funcional</td><td>Aterrar o neutro para correto funcionamento</td></tr>
<tr><td>de Proteção</td><td>Aterrar massas para proteger contra choques</td></tr>
<tr><td>Temporário</td><td>Ligação à terra durante intervenção (equipotencialidade)</td></tr>
</table>
<h3>Esquemas de Aterramento (3 letras)</h3>
<p><strong>1ª letra</strong> — situação da alimentação em relação à terra: T = ponto diretamente aterrado; I = isolação ou aterramento por impedância.</p>
<p><strong>2ª letra</strong> — situação das massas: T = massas aterradas independentemente; N = massas ligadas ao ponto aterrado da alimentação.</p>
<p><strong>3ª letra (eventual):</strong> S = neutro e proteção em condutores distintos; C = funções combinadas em um único condutor (PEN).</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Esquema</th><th>Significado</th></tr>
<tr><td>TN-S</td><td>Neutro e PE separados</td></tr>
<tr><td>TN-C-S</td><td>Combinado em parte do esquema</td></tr>
<tr><td>TN-C</td><td>Combinado em todo o esquema</td></tr>
<tr><td>TT</td><td>Alimentação aterrada + massas aterradas independentes</td></tr>
<tr><td>IT</td><td>Alimentação isolada ou por impedância</td></tr>
</table>
<h3>Dispositivos a Corrente de Fuga (DR / DDR)</h3>
<ul>
<li><strong>DR de alta sensibilidade (AS):</strong> IΔn ≤ 30 mA</li>
<li><strong>DR de baixa sensibilidade (BS):</strong> IΔn &gt; 30 mA</li>
</ul>
<p><strong>Obrigatório em:</strong> banheiros/chuveiros, áreas externas, cozinhas, lavanderias, garagens, locais molhados.</p>
<h3>Proteção por Extra-Baixa Tensão (SELV e PELV)</h3>
<ul>
<li><strong>SELV:</strong> separado da terra, sem massas aterradas</li>
<li><strong>PELV:</strong> pode ter massas aterradas, mas atende todos os requisitos de SELV</li>
</ul>
<h3>Barreiras, Invólucros e Obstáculos</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Dispositivo</th><th>Função</th></tr>
<tr><td>Barreira</td><td>Impede QUALQUER contato com partes energizadas</td></tr>
<tr><td>Invólucro</td><td>Envoltório que impede contato com partes internas</td></tr>
<tr><td>Obstáculo</td><td>Impede contato ACIDENTAL, mas não deliberado</td></tr>
<tr><td>Bloqueio</td><td>Mantém dispositivo em posição fixa (cadeados)</td></tr>
</table>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'NR-10 — EPI e EPC',
    title: 'NR-10 — EPI e EPC',
    objective: 'Diferenciar EPC de EPI, conhecer os equipamentos obrigatórios e as classes de luvas isolantes',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — EPI e EPC</h2>
<h3>EPC — Equipamentos de Proteção Coletiva</h3>
<div class="concept-box"><strong>📘 Prioridade sobre o EPI.</strong> Exemplos:</div>
<ul>
<li>Cone de sinalização</li>
<li>Fita de sinalização</li>
<li>Sinalizador eletrônico (STROBO)</li>
<li>Banqueta isolante</li>
<li>Tapete de borracha isolante</li>
<li>Lençol de borracha isolante</li>
</ul>
<h3>EPI — Equipamentos de Proteção Individual</h3>
<p>Obrigatórios em trabalhos elétricos:</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>EPI</th><th>Aplicação</th></tr>
<tr><td>Capacete de proteção</td><td>Impactos, perfurações</td></tr>
<tr><td>Protetor auricular</td><td>Ruído (inserção ou concha)</td></tr>
<tr><td>Luva isolante de borracha</td><td>Choque elétrico — 6 classes (00 a 4)</td></tr>
<tr><td>Luva de cobertura (vaqueta)</td><td>Proteção mecânica da luva isolante</td></tr>
<tr><td>Manga isolante</td><td>Braço e antebraço</td></tr>
<tr><td>Óculos de segurança</td><td>Partículas volantes</td></tr>
<tr><td>Botas e meias condutivas</td><td>Trabalhos ao potencial</td></tr>
<tr><td>Perneira de segurança</td><td>Objetos perfurantes/cortantes</td></tr>
<tr><td>Cinturão tipo paraquedista</td><td>Trabalhos em altura</td></tr>
<tr><td>Talabarte</td><td>Trabalho em altura + cinturão</td></tr>
<tr><td>Trava-quedas</td><td>Trabalho em altura</td></tr>
<tr><td>Mosquetão</td><td>Resistência ≥ 22 kN</td></tr>
<tr><td>Corda de segurança (linha de vida)</td><td>Trabalhos em altura</td></tr>
<tr><td>Vestimenta antichama</td><td>Proteção contra arco elétrico</td></tr>
</table>
<div class="attention-box"><strong>⚠️ Regras de ouro:</strong> é VEDADO o uso de adornos pessoais (anéis, correntes, relógios) em instalações elétricas (item 10.2.9.3). O trava-quedas deve ser utilizado OBRIGATORIAMENTE com cinturão tipo paraquedista. O EPC deve ser priorizado sobre o EPI (10.2.8.1).</div>
<h3>Classes de Luvas Isolantes (DECORE!)</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Classe</th><th>Cor da Tarja</th><th>Tensão máx. de uso (CA)</th></tr>
<tr><td>00</td><td>Bege</td><td>500 V</td></tr>
<tr><td>0</td><td>Vermelha</td><td>1.000 V</td></tr>
<tr><td>1</td><td>Branca</td><td>7.500 V</td></tr>
<tr><td>2</td><td>Amarela</td><td>17.000 V</td></tr>
<tr><td>3</td><td>Verde</td><td>26.500 V</td></tr>
<tr><td>4</td><td>Laranja</td><td>36.000 V</td></tr>
</table>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'NR-10 — Riscos Adicionais',
    title: 'NR-10 — Riscos Adicionais',
    objective: 'Reconhecer os riscos adicionais (altura, confinados, áreas classificadas, umidade, clima) e a classificação Ex',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — Riscos Adicionais</h2>
<p>Além do risco elétrico, o trabalhador pode estar exposto a:</p>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Risco</th><th>Ponto-chave</th></tr>
<tr><td>Altura</td><td>Cinturão tipo paraquedista obrigatório acima de 2 m</td></tr>
<tr><td>Ambientes confinados</td><td>Deficiência de O₂ (&lt; 19,5%), gases tóxicos/inflamáveis</td></tr>
<tr><td>Áreas classificadas</td><td>Atmosfera explosiva (Zonas 0, 1, 2)</td></tr>
<tr><td>Umidade</td><td>Aumenta a condutividade — reduz resistência da pele</td></tr>
<tr><td>Condições atmosféricas</td><td>Raios, chuvas, ventos fortes</td></tr>
</table>
<h3>Classificação de Áreas Explosivas</h3>
<ul>
<li><strong>Zona 0:</strong> mistura explosiva presente permanentemente</li>
<li><strong>Zona 1:</strong> mistura provável durante operação normal</li>
<li><strong>Zona 2:</strong> mistura só em falhas (curta duração)</li>
</ul>
<h3>Grupos e Classes de Temperatura</h3>
<ul>
<li><strong>Grupo 1:</strong> gás metano (minas de carvão) — T ≤ 150°C ou 450°C</li>
<li><strong>Grupo 2:</strong> demais — T1 (450°C) a T6 (85°C)</li>
</ul>
<h3>Tipos de Proteção (Ex-)</h3>
<ul>
<li><strong>Ex-d:</strong> à prova de explosão</li>
<li><strong>Ex-p:</strong> pressurização / diluição contínua</li>
<li><strong>Ex-e:</strong> segurança aumentada</li>
<li><strong>Ex-i:</strong> segurança intrínseca</li>
<li><strong>Ex-o:</strong> imersão em óleo</li>
<li><strong>Ex-q:</strong> enchimento com areia</li>
</ul>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'NR-10 — Rotinas de Trabalho e Documentação',
    title: 'NR-10 — Rotinas de Trabalho e Documentação',
    objective: 'Conhecer o prontuário obrigatório, categorias de trabalhadores, treinamentos e sinalização',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — Rotinas de Trabalho e Documentação</h2>
<h3>Documentação Obrigatória (Prontuário de Instalações Elétricas)</h3>
<p>Empresas com carga instalada <strong>&gt; 75 kW</strong> devem manter:</p>
<ul>
<li>Esquemas unifilares atualizados</li>
<li>Documentação de inspeções e medições (SPDA, aterramentos)</li>
<li>Especificação de EPI, EPC e ferramental</li>
<li>Documentação de qualificação dos trabalhadores</li>
<li>Resultados de testes de isolação</li>
<li>Certificações de equipamentos em áreas classificadas</li>
<li>Relatório técnico das inspeções</li>
</ul>
<h3>Habilitação, Qualificação, Capacitação (DECORE!)</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Categoria</th><th>Requisito</th></tr>
<tr><td>Qualificado</td><td>Curso específico na área elétrica reconhecido</td></tr>
<tr><td>Habilitado</td><td>Qualificado + registro no conselho de classe</td></tr>
<tr><td>Capacitado</td><td>Trabalha sob responsabilidade de habilitado/autorizado</td></tr>
<tr><td>Autorizado</td><td>Qualificado/capacitado/habilitado + anuência formal da empresa</td></tr>
</table>
<h3>Treinamentos</h3>
<ul>
<li><strong>Curso Básico (NR-10):</strong> 40 horas — para trabalhadores autorizados</li>
<li><strong>Curso Complementar (SEP):</strong> 40 horas — segurança no Sistema Elétrico de Potência</li>
<li><strong>Reciclagem:</strong> bienal (a cada 2 anos) ou em situações específicas</li>
</ul>
<h3>Sinalização de Segurança</h3>
<p>Obrigatória para:</p>
<ul>
<li>Identificação de circuitos elétricos</li>
<li>Travamentos e bloqueios</li>
<li>Restrições e impedimentos de acesso</li>
<li>Delimitações de áreas</li>
<li>Sinalização de impedimento de energização</li>
</ul>
<div class="attention-box"><strong>⚠️ Antes de trabalhos em circuitos energizados de AT:</strong> é obrigatório realizar avaliação prévia, estudar e planejar as atividades (item 10.7.5).</div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'NR-10 — Responsabilidades',
    title: 'NR-10 — Responsabilidades',
    objective: 'Distinguir responsabilidades trabalhista, civil e criminal, as modalidades de culpa e o direito de recusa',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>NR-10 — Responsabilidades</h2>
<h3>Tipos de Responsabilidade</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Base</th></tr>
<tr><td>Trabalhista</td><td>CLT, NRs</td></tr>
<tr><td>Civil</td><td>Reparação de danos (subjetiva ou objetiva)</td></tr>
<tr><td>Criminal</td><td>Independente da civil</td></tr>
</table>
<h3>Responsabilidade Civil Subjetiva</h3>
<p>Requer <strong>3 elementos simultâneos</strong>:</p>
<ol>
<li>Ação ou omissão</li>
<li>Dano</li>
<li>Nexo de causalidade</li>
</ol>
<p><strong>Modalidades de culpa:</strong></p>
<ul>
<li><strong>Negligência:</strong> omissão de diligência</li>
<li><strong>Imprudência:</strong> ação precipitada</li>
<li><strong>Imperícia:</strong> falta de habilidade técnica</li>
</ul>
<h3>Responsabilidade Objetiva</h3>
<p>Independe de culpa — baseada no risco da atividade (ex.: concessionárias de energia elétrica).</p>
<h3>Direito de Recusa</h3>
<div class="concept-box"><strong>📘 Todo trabalhador pode interromper suas tarefas</strong> quando constatar riscos graves e iminentes, comunicando imediatamente o superior.</div>
<h3>Conclusão do mini-curso</h3>
<p>Você percorreu os 7 módulos essenciais da NR-10: Introdução e Conceitos, Riscos, Medidas de Controle, EPI/EPC, Riscos Adicionais, Rotinas e Documentação, Responsabilidades.</p>
<p><strong>Pontuação do simulado + avaliação final:</strong> 25–30 acertos: Excelente · 18–24: Bom (revise os módulos com mais erros) · 10–17: Regular (revisão recomendada) · &lt; 10: estude novamente os módulos 2, 3 e 4 com atenção.</p>
<div class="attention-box"><strong>⚠️ Este material é educacional e não substitui:</strong> o curso oficial de NR-10 (40h) ministrado por profissional habilitado; a leitura integral da norma oficial atualizada (Portaria MTP 672/2021); a orientação de um engenheiro de segurança do trabalho. Aproveite este conhecimento para salvar vidas — inclusive a sua.</div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
];

// Checkpoints = SIMULADO DE FIXAÇÃO (10 questões do mini-curso), distribuídos nas lições,
// no mesmo padrão dos demais checkpoints (1 pergunta + 4 opções, 1 correta).
// Ordem das opções preservada (a, b, c, d) e índice correto conforme gabarito 1-B,2-C,3-B,4-D,5-C,6-B,7-A,8-C,9-C,10-B.
const CHECKPOINTS = [
  {
    lesson: 'NR-10 — Introdução e Conceitos Fundamentais',
    question: 'O que caracteriza a Zona de Risco segundo o glossário da NR-10?',
    options: ['Entorno de parte energizada — só profissionais autorizados', 'Área em que qualquer pessoa pode circular', 'Área isolada sem risco elétrico', 'Zona interna do painel sem energização'],
    correct: 0,
  },
  {
    lesson: 'NR-10 — Riscos em Instalações Elétricas',
    question: 'Qual o limiar de "não largar" para homens em CA 50/60 Hz?',
    options: ['1 mA', '5 mA', '9 a 23 mA', '100 mA'],
    correct: 2,
  },
  {
    lesson: 'NR-10 — Medidas de Controle do Risco',
    question: 'Qual a sequência CORRETA da desenergização?',
    options: [
      'Sinalização → Seccionamento → Aterramento',
      'Seccionamento → Impedimento → Constatação → Aterramento → Proteção → Sinalização',
      'Aterramento → Seccionamento → Sinalização',
      'Constatação → Impedimento → Seccionamento',
    ],
    correct: 1,
  },
  {
    lesson: 'NR-10 — Medidas de Controle do Risco',
    question: 'O esquema de aterramento TN-S significa:',
    options: [
      'Alimentação aterrada, massas aterradas independentes, neutro e PE separados',
      'Alimentação aterrada, massas ligadas ao ponto aterrado, neutro e PE separados',
      'Alimentação isolada, massas aterradas independentes',
      'Alimentação e massas combinadas',
    ],
    correct: 1,
  },
  {
    lesson: 'NR-10 — EPI e EPC',
    question: 'A classe de luva com tarja AMARELA suporta qual tensão máxima?',
    options: ['500 V', '1.000 V', '7.500 V', '17.000 V'],
    correct: 3,
  },
  {
    lesson: 'NR-10 — EPI e EPC',
    question: 'Qual EPI é usado EXCLUSIVAMENTE para proteger a luva isolante de borracha?',
    options: ['Luva de vaqueta', 'Manga isolante', 'Óculos de segurança', 'Perneira'],
    correct: 0,
  },
  {
    lesson: 'NR-10 — EPI e EPC',
    question: 'Qual desses é um EPC (não EPI)?',
    options: ['Capacete', 'Luva isolante', 'Tapete de borracha isolante', 'Protetor auricular'],
    correct: 2,
  },
  {
    lesson: 'NR-10 — Riscos Adicionais',
    question: 'Acima de qual altura é obrigatório o cinturão tipo paraquedista?',
    options: ['1,5 m', '2 m', '3 m', '5 m'],
    correct: 1,
  },
  {
    lesson: 'NR-10 — Rotinas de Trabalho e Documentação',
    question: 'Empresas com carga instalada acima de ___ kW devem manter Prontuário de Instalações Elétricas.',
    options: ['25 kW', '50 kW', '75 kW', '100 kW'],
    correct: 2,
  },
  {
    lesson: 'NR-10 — Rotinas de Trabalho e Documentação',
    question: 'A carga horária mínima do Curso Básico de NR-10 é:',
    options: ['20 horas', '30 horas', '40 horas', '60 horas'],
    correct: 2,
  },
  {
    lesson: 'NR-10 — Responsabilidades',
    question: 'O que significa "Direito de Recusa"?',
    options: [
      'Direito de recusar trabalhar em qualquer situação',
      'Direito de interromper atividades em risco grave e iminente',
      'Direito de não usar EPI',
      'Direito de não fazer horas extras',
    ],
    correct: 1,
  },
];

// AVALIAÇÃO FINAL — 30 questões, mesmo padrão da tabela questions/question_options.
// order 101-130: NÃO interfere no simulado principal (que usa as 30 primeiras por order_num).
// explanation = justificativa do gabarito comentado. module = módulo NR-10 correspondente.
const QUESTIONS = [
  { m: 0, cat: 'NR-10 - Conceitos', q: 'A NR-10 estabelece requisitos mínimos para garantir segurança em instalações elétricas. A qual faixa de tensão ela NÃO se aplica?', o: ['Baixa Tensão (BT)', 'Alta Tensão (AT)', 'Extra-Baixa Tensão (EBT)', 'Média Tensão'], c: 2, e: 'NR-10 não se aplica a EBT (art. 10.14.6).' },
  { m: 1, cat: 'NR-10 - Riscos', q: 'O choque elétrico é mais grave quando:', o: ['A corrente passa pelo dedo mindinho', 'A corrente passa da mão esquerda para o pé direito', 'A corrente passa de mão para mão ou de mão para pé', 'A corrente dura menos de 1 segundo'], c: 2, e: 'Mão-mão e mão-pé são os percursos mais perigosos.' },
  { m: 1, cat: 'NR-10 - Riscos', q: 'A fibrilação ventricular pode causar morte em aproximadamente:', o: ['30 minutos', '10 minutos', '3 minutos', '30 segundos'], c: 2, e: '~3 minutos causam lesões irreparáveis no coração e cérebro.' },
  { m: 1, cat: 'NR-10 - Riscos', q: 'O arco elétrico NÃO causa:', o: ['Queimaduras', 'Radiação UV prejudicial à visão', 'Descarga de plasma', 'Congelamento de tecidos'], c: 3, e: 'Arco elétrico causa calor extremo, não congelamento.' },
  { m: 0, cat: 'NR-10 - Conceitos', q: 'Qual a definição de "Zona Controlada"?', o: ['Área em que qualquer pessoa pode circular', 'Entorno de parte energizada acessível, só para profissionais autorizados', 'Área isolada sem risco elétrico', 'Zona interna do painel elétrico'], c: 1, e: 'Definição oficial do glossário da NR-10.' },
  { m: 2, cat: 'NR-10 - Controle', q: 'A sequência de desenergização inclui:', o: ['Seccionamento → Sinalização → Aterramento', 'Aterramento → Seccionamento → Constatação', 'Seccionamento → Impedimento → Constatação → Aterramento → Proteção → Sinalização', 'Impedimento → Aterramento → Seccionamento'], c: 2, e: 'Sequência sagrada do item 10.5.1.' },
  { m: 2, cat: 'NR-10 - Controle', q: 'O aterramento temporário tem como objetivo principal:', o: ['Economizar energia', 'Garantir equipotencialidade durante a intervenção', 'Reduzir a conta de luz', 'Substituir o DR'], c: 1, e: 'Garante equipotencialidade durante intervenção.' },
  { m: 2, cat: 'NR-10 - Controle', q: 'O esquema de aterramento TT significa:', o: ['Alimentação isolada e massas isoladas', 'Alimentação aterrada e massas aterradas independentemente', 'Neutro e PE no mesmo condutor', 'Alimentação e massas combinadas'], c: 1, e: 'T (terra na alimentação) + T (massas aterradas independentes).' },
  { m: 2, cat: 'NR-10 - Controle', q: 'O DR de alta sensibilidade tem corrente diferencial-residual nominal de:', o: ['Até 30 mA', 'Até 100 mA', 'Acima de 30 mA', 'Até 300 mA'], c: 0, e: 'Alta sensibilidade: ≤ 30 mA.' },
  { m: 2, cat: 'NR-10 - Controle', q: 'A proteção SELV se caracteriza por:', o: ['Ser isolada da terra e sem massas aterradas', 'Ser aterrada com massas energizadas', 'Ser a mesma coisa que PELV', 'Usar tensão acima de 50V'], c: 0, e: 'SELV é separado da terra e sem massas aterradas.' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'Qual classe de luva isolante suporta 26.500 V em CA?', o: ['Classe 1', 'Classe 2', 'Classe 3', 'Classe 4'], c: 2, e: 'Classe 3 = verde = 26.500 V CA.' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'O capacete de proteção deve ter a suspensão posicionada a:', o: ['10 mm do casco', '20 mm do casco', '40 mm do casco', '60 mm do casco'], c: 2, e: '40 mm entre suspensão e casco.' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'Sobre o EPI, qual afirmativa está CORRETA?', o: ['O EPI substitui o EPC', 'O EPC deve ser priorizado sobre o EPI', 'O EPI é opcional', 'O EPI não tem CA (Certificado de Aprovação)'], c: 1, e: 'EPC tem prioridade sobre EPI (10.2.8.1).' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'Qual desses NÃO é um EPC?', o: ['Cone de sinalização', 'Fita de sinalização', 'Capacete de segurança', 'Banqueta isolante'], c: 2, e: 'Capacete é EPI, não EPC.' },
  { m: 5, cat: 'NR-10 - Rotinas', q: 'Empresas com carga instalada superior a 75 kW devem manter:', o: ['Apenas o PCMSO', 'Apenas a NR-10 assinada', 'Prontuário de Instalações Elétricas', 'Apenas o PPRA'], c: 2, e: 'Prontuário obrigatório > 75 kW.' },
  { m: 5, cat: 'NR-10 - Rotinas', q: 'O trabalhador "capacitado" segundo a NR-10 é aquele que:', o: ['Tem curso específico reconhecido', 'Tem registro no conselho de classe', 'Recebeu capacitação sob orientação e trabalha sob responsabilidade de habilitado', 'Tem anuência formal da empresa apenas'], c: 2, e: 'Capacitação = treinamento + supervisão.' },
  { m: 5, cat: 'NR-10 - Rotinas', q: 'A reciclagem do curso NR-10 é obrigatória a cada:', o: ['6 meses', '1 ano', '2 anos', '5 anos'], c: 2, e: 'Reciclagem bienal (2 anos).' },
  { m: 5, cat: 'NR-10 - Rotinas', q: 'O Curso Complementar de NR-10 (SEP) tem carga horária mínima de:', o: ['20 horas', '30 horas', '40 horas', '60 horas'], c: 2, e: 'Curso Complementar = 40 horas.' },
  { m: 6, cat: 'NR-10 - Responsabilidades', q: 'Sobre a responsabilidade civil, quais são os 3 pressupostos simultâneos?', o: ['Ação, dano e nexo de causalidade', 'Dolo, culpa e imprudência', 'Negligência, imperícia e imprudência', 'Ação, omissão e dolo'], c: 0, e: 'Ação/omissão + dano + nexo causal.' },
  { m: 6, cat: 'NR-10 - Responsabilidades', q: 'A "imperícia" é definida como:', o: ['Ação voluntária consciente', 'Falta de habilidade técnica ou experiência no exercício de determinada função', 'Ação precipitada sem precauções', 'Omissão de diligência'], c: 1, e: 'Imperícia = falta de habilidade técnica.' },
  { m: 6, cat: 'NR-10 - Responsabilidades', q: 'O direito de recusa permite ao trabalhador:', o: ['Recusar-se a usar EPI', 'Interromper atividade com risco grave e iminente', 'Recusar trabalhos fora do horário', 'Recusar treinamentos'], c: 1, e: 'Direito de interromper por risco grave e iminente.' },
  { m: 4, cat: 'NR-10 - Riscos Adicionais', q: 'A Zona 0 de áreas classificadas significa:', o: ['Área sem risco', 'Mistura explosiva presente permanentemente', 'Mistura explosiva só em falhas', 'Área com risco apenas para pessoas'], c: 1, e: 'Zona 0 = permanente ou maior parte do tempo.' },
  { m: 4, cat: 'NR-10 - Riscos Adicionais', q: 'Qual o tipo de proteção "Ex-d"?', o: ['Segurança intrínseca', 'Pressurização', 'À prova de explosão', 'Imersão em óleo'], c: 2, e: 'Ex-d = à prova de explosão.' },
  { m: 1, cat: 'NR-10 - Riscos', q: 'O "Limiar de Não Largar" para mulheres em CA 50/60 Hz é:', o: ['1 mA', '5 mA', '6 a 14 mA', '20 a 30 mA'], c: 2, e: 'Mulheres: 6 a 14 mA.' },
  { m: 5, cat: 'NR-10 - Rotinas', q: 'Antes de iniciar trabalhos em circuitos energizados de AT, é obrigatório:', o: ['Apenas avisar o gerente', 'Realizar avaliação prévia, estudar e planejar as atividades', 'Trabalhar individualmente', 'Ignorar procedimentos para ganhar tempo'], c: 1, e: 'Item 10.7.5 — avaliação prévia e planejamento.' },
  { m: 2, cat: 'NR-10 - Controle', q: 'O disjuntor DR (Diferencial Residual) é OBRIGATÓRIO em:', o: ['Escritórios administrativos', 'Banheiros, chuveiros, áreas externas, cozinhas e lavanderias', 'Apenas em indústrias', 'Apenas em residências'], c: 1, e: 'Item 4.4.2 da NBR 5410.' },
  { m: 1, cat: 'NR-10 - Riscos', q: 'Os efeitos principais que a corrente elétrica produz no corpo humano são:', o: ['Tetanização, parada respiratória, queimadura e fibrilação ventricular', 'Desmaio, vômito, febre e dor de cabeça', 'Náusea, tontura, sudorese e taquicardia', 'Fratura, luxação, contusão e corte'], c: 0, e: 'Os 4 fenômenos patológicos críticos.' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'O trava-quedas deve ser utilizado OBRIGATORIAMENTE com:', o: ['Capacete', 'Cinturão tipo paraquedista', 'Luva de vaqueta', 'Óculos de segurança'], c: 1, e: 'Trava-quedas só com cinturão tipo paraquedista.' },
  { m: 0, cat: 'NR-10 - Conceitos', q: 'A NR-10 se aplica a qual fase do sistema elétrico?', o: ['Apenas geração', 'Apenas transmissão', 'Apenas distribuição', 'Geração, transmissão, distribuição E consumo'], c: 3, e: 'Aplica-se a todas as fases.' },
  { m: 3, cat: 'NR-10 - EPI/EPC', q: 'Segundo a NR-10, é VEDADO ao trabalhador em instalações elétricas:', o: ['Usar EPI', 'Usar adornos pessoais (anéis, correntes, relógios)', 'Realizar treinamento', 'Respeitar a sinalização'], c: 1, e: 'Item 10.2.9.3 — vedado uso de adornos.' },
];

function main() {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  let modCreated = 0;
  const moduleIds = {};
  const getModule = db.prepare('SELECT id FROM training_modules WHERE title = ?');
  const insertModule = db.prepare(
    'INSERT INTO training_modules (title, description, order_num, category, estimated_duration, status) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const m of MODULES) {
    let row = getModule.get(m.title);
    if (!row) {
      const r = insertModule.run(m.title, m.description, m.order, m.category, m.duration, 'PENDING_TECHNICAL_VALIDATION');
      moduleIds[m.title] = r.lastInsertRowid;
      modCreated++;
      console.log('Modulo criado: ' + m.title);
    } else {
      moduleIds[m.title] = row.id;
      console.log('Modulo ja existe: ' + m.title);
    }
  }

  let lesCreated = 0;
  const lessonIds = {};
  for (const L of LESSONS) {
    const mid = moduleIds[L.module];
    if (!mid) { console.log('Modulo nao encontrado: ' + L.module); continue; }
    const ex = db.prepare('SELECT id FROM training_lessons WHERE module_id = ? AND title = ?').get(mid, L.title);
    if (ex) {
      lessonIds[L.title] = ex.id;
      console.log('Licao ja existe: ' + L.title);
      continue;
    }
    const maxOrder = db.prepare('SELECT COALESCE(MAX(order_num), 0) m FROM training_lessons WHERE module_id = ?').get(mid).m;
    const r = db.prepare(
      'INSERT INTO training_lessons (module_id, title, order_num, objective, content, classification, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(mid, L.title, maxOrder + 1, L.objective, L.content, L.classification, 'PENDING_TECHNICAL_VALIDATION');
    lessonIds[L.title] = r.lastInsertRowid;
    lesCreated++;
    console.log('Licao criada: ' + L.title);
  }

  let cpCreated = 0;
  let cpOptCreated = 0;
  for (const cp of CHECKPOINTS) {
    const lid = lessonIds[cp.lesson];
    if (!lid) { console.log('Licao nao encontrada p/ checkpoint: ' + cp.lesson); continue; }
    let cprow = db.prepare('SELECT id FROM lesson_checkpoints WHERE lesson_id = ? AND question = ?').get(lid, cp.question);
    if (!cprow) {
      const maxO = db.prepare('SELECT COALESCE(MAX(order_num), 0) m FROM lesson_checkpoints WHERE lesson_id = ?').get(lid).m;
      const r = db.prepare(
        'INSERT INTO lesson_checkpoints (lesson_id, question, type, order_num, points) VALUES (?, ?, ?, ?, 1)'
      ).run(lid, cp.question, 'MULTIPLE_CHOICE', maxO + 1);
      cprow = { id: r.lastInsertRowid };
      cpCreated++;
      console.log('Checkpoint criado: ' + cp.question.slice(0, 60) + '...');
    }
    const n = db.prepare('SELECT COUNT(*) c FROM checkpoint_options WHERE checkpoint_id = ?').get(cprow.id).c;
    if (n === 0) {
      cp.options.forEach((t, i) => {
        db.prepare('INSERT INTO checkpoint_options (checkpoint_id, option_text, order_num, is_correct) VALUES (?, ?, ?, ?)')
          .run(cprow.id, t, i + 1, i === cp.correct ? 1 : 0);
        cpOptCreated++;
      });
    }
  }

  let qCreated = 0;
  let qOptCreated = 0;
  QUESTIONS.forEach((item, idx) => {
    const mid = moduleIds[MODULES[item.m].title] || null;
    let qrow = db.prepare('SELECT id FROM questions WHERE category = ? AND question = ?').get(item.cat, item.q);
    if (!qrow) {
      const r = db.prepare(
        'INSERT INTO questions (category, question, difficulty, explanation, is_active, module_id, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(item.cat, item.q, 'MEDIUM', item.e, 1, mid, 101 + idx);
      qrow = { id: r.lastInsertRowid };
      qCreated++;
    }
    const n = db.prepare('SELECT COUNT(*) c FROM question_options WHERE question_id = ?').get(qrow.id).c;
    if (n === 0) {
      item.o.forEach((t, i) => {
        db.prepare('INSERT INTO question_options (question_id, option_text, order_num, is_correct) VALUES (?, ?, ?, ?)')
          .run(qrow.id, t, i + 1, i === item.c ? 1 : 0);
        qOptCreated++;
      });
    }
  });

  const totals = {
    modules: db.prepare('SELECT COUNT(*) c FROM training_modules').get().c,
    lessons: db.prepare('SELECT COUNT(*) c FROM training_lessons').get().c,
    checkpoints: db.prepare('SELECT COUNT(*) c FROM lesson_checkpoints').get().c,
    questions: db.prepare('SELECT COUNT(*) c FROM questions').get().c,
    nr10questions: db.prepare("SELECT COUNT(*) c FROM questions WHERE category LIKE 'NR-10%'").get().c,
  };
  console.log('OK nr10: modulos_novos=' + modCreated + ' licoes_novas=' + lesCreated + ' checkpoints_novos=' + cpCreated + ' questoes_novas=' + qCreated);
  console.log('Totais: ' + JSON.stringify(totals));
  db.close();
}

main();
