// Seed do MINI-CURSO — Instalação e Manutenção de Ar Condicionado
// Mesmo padrão dos demais cursos do site (NR-10 incluso):
//   training_modules -> training_lessons -> lesson_checkpoints/checkpoint_options
//   questions/question_options (avaliação final, com explanation = justificativa)
// Idempotente: só insere o que ainda não existe. NÃO apaga nada.
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

const MODULES = [
  { title: 'AC — Fundamentos e Conceitos-Chave', description: 'História, diferença entre ar-condicionado, refrigeração e climatização, finalidades e setores que dependem de AC.', order: 25, category: 'AC', duration: 20 },
  { title: 'AC — Termodinâmica Aplicada', description: 'Transferência de calor, ciclo de refrigeração por compressão de vapor e unidades de medida (BTU, TR, kW).', order: 26, category: 'AC', duration: 20 },
  { title: 'AC — Componentes do Sistema', description: 'Compressor, condensador, dispositivos de expansão, trocadores de calor, ventiladores e motores.', order: 27, category: 'AC', duration: 20 },
  { title: 'AC — Tipos de Sistemas', description: 'Expansão direta/indireta, unitário/centralizado: janela, split, self, VRF/VRV, fan coil + chiller.', order: 28, category: 'AC', duration: 20 },
  { title: 'AC — Instalação Passo a Passo', description: 'Ferramentas, 6 passos da instalação, suportes, conexões, processo de vácuo em 3 estágios e teste de amperagem.', order: 29, category: 'AC', duration: 20 },
  { title: 'AC — Manutenção', description: 'As 6 manutenções mais comuns, troca de capacitor, higienização, carga de refrigerante, vazamentos e reparos.', order: 30, category: 'AC', duration: 20 },
  { title: 'AC — Eficiência Energética', description: 'Boas práticas, tecnologia inverter × convencional e classificação energética.', order: 31, category: 'AC', duration: 20 },
  { title: 'AC — Segurança no Trabalho', description: 'EPIs obrigatórios, segurança em altura (NR-35) e cuidados elétricos.', order: 32, category: 'AC', duration: 20 },
  { title: 'AC — Precificação', description: 'Fórmula básica de preço, margem de lucro e estratégias de precificação de serviços.', order: 33, category: 'AC', duration: 20 },
];

const LESSONS = [
  {
    module: 'AC — Fundamentos e Conceitos-Chave',
    title: 'AC — Fundamentos e Conceitos-Chave',
    objective: 'Diferenciar ar-condicionado, refrigeração e climatização e conhecer finalidades e setores atendidos',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>AC — Fundamentos e Conceitos-Chave</h2>
<h3>História em 30 segundos</h3>
<ul>
<li><strong>1834</strong> — Jacob Perkins patenteia o refrigerador por compressão de vapor</li>
<li><strong>1902</strong> — Willis Haviland Carrier inventa o ar-condicionado moderno</li>
<li><strong>Pós-2ª Guerra</strong> — AC se populariza em residências e comércios</li>
<li><strong>Hoje</strong> — Tecnologias inverter, solar e geotermia dominam a eficiência</li>
</ul>
<h3>Ar-condicionado × Refrigeração × Climatização</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Termo</th><th>Significado</th></tr>
<tr><td>Ar-condicionado</td><td>O equipamento (a máquina em si)</td></tr>
<tr><td>Climatização</td><td>O sistema/resultado — qualidade final do ambiente (QAI)</td></tr>
<tr><td>Refrigeração</td><td>Foco em conservação (alimentos, produtos) — temperaturas de -70 °C a 10 °C</td></tr>
</table>
<div class="concept-box"><strong>📘 Faixas de atuação:</strong> Climatização: 10 °C a 30 °C (conforto humano) · Refrigeração: -70 °C a 10 °C (processo/armazenamento).</div>
<h3>Finalidades do ar-condicionado</h3>
<ul>
<li><strong>Conforto térmico</strong> — bem-estar das pessoas (residências, escritórios, shoppings)</li>
<li><strong>Processo</strong> — condições controladas para indústria/laboratório (ex: ANVISA, precisão de peças)</li>
</ul>
<h3>Setores que dependem de AC</h3>
<ul>
<li><strong>Residencial</strong> — conforto</li>
<li><strong>Comercial</strong> — produtividade e vendas</li>
<li><strong>Industrial</strong> — processos + segurança</li>
<li><strong>Saúde (hospitais)</strong> — controle de infecções, salas cirúrgicas</li>
<li><strong>Tecnologia (data centers)</strong> — dissipação de calor crítico</li>
<li><strong>Transporte</strong> — conforto em veículos</li>
</ul>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong> — material educacional; não substitui curso técnico, certificações (NR-35, NR-10), manuais dos fabricantes nem prática supervisionada.</p>`,
  },
  {
    module: 'AC — Termodinâmica Aplicada',
    title: 'AC — Termodinâmica Aplicada',
    objective: 'Explicar os mecanismos de transferência de calor, as 4 etapas do ciclo de refrigeração e as unidades de medida',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>AC — Termodinâmica Aplicada</h2>
<h3>Transferência de Calor — 4 mecanismos</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Mecanismo</th><th>O que é</th><th>Onde aparece no AC</th></tr>
<tr><td>Condução</td><td>Calor através de sólidos em contato</td><td>Tubos, aletas, isolamento</td></tr>
<tr><td>Convecção</td><td>Calor por fluido em movimento</td><td>Ar passando pelas serpentinas</td></tr>
<tr><td>Radiação</td><td>Ondas eletromagnéticas</td><td>Exposição solar direta no condensador</td></tr>
<tr><td>Lei de Newton</td><td>Taxa ∝ diferença de temperatura</td><td>Cálculo de carga térmica</td></tr>
</table>
<h3>O Ciclo de Refrigeração por Compressão de Vapor (DECORE!)</h3>
<div class="procedure-box"><strong>🛠️ As 4 etapas:</strong>
<ol>
<li><strong>Compressão</strong> — refrigerante é comprimido → aumenta pressão e temperatura</li>
<li><strong>Condensação</strong> — no condensador, libera calor para o ambiente externo → vira líquido</li>
<li><strong>Expansão</strong> — passa por válvula/tubo capilar → queda brusca de pressão e temperatura</li>
<li><strong>Evaporação</strong> — no evaporador, absorve calor do ambiente interno → vira vapor e volta ao compressor</li>
</ol></div>
<h3>Unidades de medida (DECORE!)</h3>
<div class="concept-box"><strong>📘 1 TR (Tonelada de Refrigeração) = 12.000 BTU/h = 3.024 kcal/h = 3,52 kW = 4,72 HP.</strong></div>
<ul>
<li>Na prática: 1 BTU/h ≈ 0,293 W</li>
<li>Ambientes residenciais: 7.000 a 30.000 BTU/h</li>
<li>1 TR ≈ capacidade de derreter 1 tonelada de gelo em 24h</li>
</ul>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Componentes do Sistema',
    title: 'AC — Componentes do Sistema',
    objective: 'Identificar os 4 componentes do ciclo, tipos de compressores, dispositivos de expansão e trocadores de calor',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>AC — Componentes do Sistema</h2>
<h3>Os 4 componentes essenciais do ciclo</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Componente</th><th>Função</th></tr>
<tr><td>Compressor</td><td>Circula o refrigerante, comprime e descarrega no condensador</td></tr>
<tr><td>Condensador</td><td>Muda refrigerante de vapor → líquido (libera calor)</td></tr>
<tr><td>Elemento de expansão</td><td>Causa restrição → diferença de pressão no circuito</td></tr>
<tr><td>Evaporador</td><td>Muda refrigerante de líquido → vapor (absorve calor)</td></tr>
</table>
<h3>Compressores — tipos e aplicações</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Característica</th><th>Aplicação</th></tr>
<tr><td>Pistão (reciprocante)</td><td>Simples, confiável, barulhento</td><td>Residencial/comercial pequeno</td></tr>
<tr><td>Rotativo</td><td>Compacto, silencioso, eficiente</td><td>Split residencial</td></tr>
<tr><td>Scroll</td><td>Silencioso, confiável, eficiente</td><td>Comercial/industrial</td></tr>
<tr><td>Parafuso</td><td>Alta capacidade</td><td>Grandes edifícios</td></tr>
</table>
<h3>Dispositivos de Expansão — comparação</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Dispositivo</th><th>Precisão</th><th>Custo</th><th>Aplicação</th></tr>
<tr><td>Tubo capilar</td><td>Baixa</td><td>Muito baixo</td><td>Split pequeno, janela</td></tr>
<tr><td>Válvula TXV (termostática)</td><td>Alta</td><td>Médio</td><td>Comercial, industrial</td></tr>
<tr><td>Válvula EEV (eletrônica)</td><td>Muito alta</td><td>Alto</td><td>Data centers, precisão</td></tr>
<tr><td>Válvula AEV (automática)</td><td>Alta</td><td>Médio</td><td>Grandes capacidades</td></tr>
</table>
<h3>Trocadores de Calor</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Onde encontra</th></tr>
<tr><td>Evaporador</td><td>Unidade interna (absorve calor)</td></tr>
<tr><td>Condensador</td><td>Unidade externa (libera calor)</td></tr>
<tr><td>Tubo e aleta</td><td>Padrão em ACs split (serpentinas)</td></tr>
<tr><td>Placas brasadas</td><td>Alta pressão / temperatura</td></tr>
<tr><td>Placas soldadas</td><td>Baixa pressão / temperatura</td></tr>
</table>
<h3>Ventiladores e Motores</h3>
<ul>
<li><strong>Unidade interna</strong> — circula ar do ambiente pelo evaporador</li>
<li><strong>Unidade externa</strong> — dissipa calor do condensador</li>
<li><strong>Motores</strong> — convertem energia elétrica em mecânica</li>
</ul>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Tipos de Sistemas',
    title: 'AC — Tipos de Sistemas',
    objective: 'Classificar sistemas por expansão e centralização e detalhar janela, split e centralizado',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>AC — Tipos de Sistemas de Ar Condicionado</h2>
<h3>Classificação por expansão</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Como funciona</th><th>Exemplos</th></tr>
<tr><td>Expansão Direta</td><td>Refrigerante resfria o ar diretamente</td><td>Janela, Split, Self, VRF/VRV</td></tr>
<tr><td>Expansão Indireta</td><td>Água gelada como intermediária</td><td>Fan coil + Chiller</td></tr>
</table>
<h3>Classificação por centralização</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Tipo</th><th>Característica</th></tr>
<tr><td>Unitário</td><td>Equipamentos independentes por ambiente</td></tr>
<tr><td>Centralizado</td><td>Um sistema central distribui frio para vários pontos</td></tr>
</table>
<h3>Tipos de equipamentos — visão geral</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Equipamento</th><th>Expansão</th><th>Centralização</th></tr>
<tr><td>Ar-condicionado de janela</td><td>Direta</td><td>Unitário</td></tr>
<tr><td>Split</td><td>Direta</td><td>Unitário</td></tr>
<tr><td>Self-contained</td><td>Direta</td><td>Unitário</td></tr>
<tr><td>VRF / VRV</td><td>Direta</td><td>Unitário</td></tr>
<tr><td>Fan coil + Chiller</td><td>Indireta</td><td>Centralizado</td></tr>
</table>
<h3>Detalhamento dos principais</h3>
<p><strong>🔹 Ar-condicionado de Janela</strong> — Monobloco (tudo em uma estrutura). Capacidade: 7.000 a 30.000 BTU/h. Vantagem: simples e barato. Desvantagem: ruidoso, precisa de parede externa.</p>
<p><strong>🔹 Split (o mais popular no Brasil)</strong> — Duas unidades: interna (evaporador) + externa (condensador + compressor). Silencioso (compressor fora do ambiente). Flexível: parede, teto, piso-teto. Capacidade: 9.000 a 36.000 BTU/h (residencial).</p>
<p><strong>🔹 Centralizado (Fan coil + Chiller)</strong> — Chiller resfria água → água gelada circula → fan coils nos ambientes. Ideal para shoppings, edifícios, hotéis. Vantagem: controle uniforme, silencioso. Desvantagem: alto investimento inicial, precisa de espaço.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Instalação Passo a Passo',
    title: 'AC — Instalação Passo a Passo',
    objective: 'Executar os 6 passos da instalação, conexões, vácuo em 3 estágios e teste de amperagem',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>AC — Instalação Passo a Passo</h2>
<h3>Ferramentas essenciais</h3>
<ul>
<li>Chaves de fenda (fenda e Phillips)</li>
<li>Alicates de corte e bico</li>
<li>Multímetro (tensão, corrente, resistência)</li>
<li>Termômetro infravermelho</li>
<li>Bomba de vácuo</li>
<li>Maçarico (brasagem)</li>
<li>Manifold (mede pressão e vácuo)</li>
<li>Válvula de serviço</li>
<li>Furadeira + brocas</li>
<li>Nível a laser</li>
</ul>
<h3>Os 6 passos da instalação completa</h3>
<div class="procedure-box"><strong>🛠️ Sequência:</strong>
<ol>
<li><strong>FIXAÇÃO SUPORTE INTERNO</strong></li>
<li><strong>CONEXÕES INTERNAS</strong> (hidráulica, elétrica, fluido)</li>
<li><strong>FIXAÇÃO SUPORTE EXTERNO</strong></li>
<li><strong>CONEXÕES EXTERNAS</strong> (hidráulica, elétrica, fluido)</li>
<li><strong>PROCESSO DE VÁCUO</strong> (3 estágios)</li>
<li><strong>TESTE DE AMPERAGEM DO MOTOR</strong></li>
</ol></div>
<h3>Suporte interno — pontos críticos</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Item</th><th>Especificação</th></tr>
<tr><td>Parede</td><td>Concreto, alvenaria ou tijolo (evitar drywall sem reforço)</td></tr>
<tr><td>Peso suportado</td><td>10-20 kg (evaporadora)</td></tr>
<tr><td>Distância entre unidades</td><td>3 a 15 m (seguir fabricante)</td></tr>
<tr><td>Altura ideal</td><td>Distribuição uniforme, acesso para manutenção</td></tr>
<tr><td>Distância do teto</td><td>15 a 30 cm</td></tr>
<tr><td>Distância de paredes adjacentes</td><td>10 a 20 cm</td></tr>
<tr><td>Obstáculos</td><td>Evitar móveis, cortinas, fontes de calor</td></tr>
</table>
<h3>Conexões — 3 tipos</h3>
<p><strong>🔹 Hidráulicas (tubulação + drenagem)</strong> — Tubulação de cobre entre unidades. Drenagem com inclinação adequada.</p>
<div class="attention-box"><strong>⚠️ NUNCA fazer sifão direto na saída da evaporadora. NUNCA jogar drenagem na rede de esgoto (usar rede pluvial).</strong></div>
<p><strong>🔹 Elétricas</strong> — Fios dimensionados para a carga. Disjuntores e fusíveis adequados. Proteção contra umidade.</p>
<p><strong>🔹 Fluido (linhas de refrigerante)</strong> — Vedação hermética (fita teflon, solda prata, silicone). Testes de pressão e vazamento obrigatórios.</p>
<h3>Processo de Vácuo — 3 estágios (DECORE!)</h3>
<div class="procedure-box"><strong>🛠️ Estágios:</strong>
<ol>
<li><strong>ESTÁGIO 1: EVACUAÇÃO INICIAL</strong> — pressão até ~500-1000 microns</li>
<li><strong>ESTÁGIO 2: DESGASEIFICAÇÃO</strong> — 30 min a algumas horas (remove umidade residual)</li>
<li><strong>ESTÁGIO 3: ESTABILIZAÇÃO DO VÁCUO</strong> — monitorar por horas (pressão deve permanecer estável)</li>
</ol>
<p><strong>TESTE DE VAZAMENTO</strong> (detector eletrônico ou solução de bolhas).</p></div>
<p><strong>Por que é crítico? Umidade residual causa:</strong> formação de gelo nas bobinas · corrosão dos componentes · redução de eficiência · danos ao compressor.</p>
<h3>Teste de amperagem</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Passo</th><th>Ação</th></tr>
<tr><td>1</td><td>Desligar energia na fonte principal</td></tr>
<tr><td>2</td><td>Acessar o motor do compressor</td></tr>
<tr><td>3</td><td>Preparar multímetro para medir corrente</td></tr>
<tr><td>4</td><td>Abrir o circuito (cuidado com segurança)</td></tr>
<tr><td>5</td><td>Posicionar alicate amperímetro ao redor de um fio</td></tr>
<tr><td>6</td><td>Ler valor no display</td></tr>
<tr><td>7</td><td>Interpretar — comparar com especificação do fabricante</td></tr>
<tr><td>8</td><td>Fechar circuito e restaurar energia</td></tr>
</table>
<p><strong>Interpretação:</strong> dentro da faixa = OK · corrente baixa = falha no motor ou conexão solta · corrente alta = sobrecarga ou obstrução.</p>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Manutenção',
    title: 'AC — Manutenção',
    objective: 'Diagnosticar as 6 manutenções mais comuns, trocar capacitor, higienizar, recarregar e reparar vazamentos',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>AC — Manutenção</h2>
<h3>As 6 manutenções mais comuns</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Manutenção</th><th>Sintomas de problema</th></tr>
<tr><td>Troca de capacitor</td><td>Desligamentos frequentes, falta de resfriamento, ruídos</td></tr>
<tr><td>Troca da válvula reversora</td><td>Falha ao alternar quente/frio</td></tr>
<tr><td>Troca do compressor</td><td>Ruídos anormais, vibrações, vazamentos, falhas no ciclo</td></tr>
<tr><td>Troca da placa eletrônica</td><td>Códigos de erro, perda de controle, falhas intermitentes</td></tr>
<tr><td>Troca do sensor ambiente</td><td>Leituras erradas, sistema liga/desliga sozinho</td></tr>
<tr><td>Troca do sensor bimetálico</td><td>Não liga/desliga conforme temperatura</td></tr>
</table>
<h3>Troca de capacitor — passo a passo</h3>
<div class="procedure-box"><strong>🛠️ Sequência:</strong>
<ol>
<li><strong>DESLIGAR ENERGIA</strong></li>
<li><strong>IDENTIFICAR</strong> capacitor defeituoso (visual: inchaço, vazamento)</li>
<li><strong>DESCARREGAR</strong> (curto-circuito com chave isolada nos terminais)</li>
<li><strong>REMOVER</strong> capacitor antigo (desconectar fios, soltar fixação)</li>
<li><strong>INSTALAR</strong> novo capacitor (mesma posição, mesmos terminais)</li>
<li><strong>TESTAR</strong> sistema</li>
<li><strong>VERIFICAR</strong> estabilidade</li>
</ol></div>
<h3>Higienização (evaporador + condensador)</h3>
<p><strong>Produtos recomendados:</strong> produtos específicos para HVAC · escovas macias e aspirador de pó · água pressurizada (cuidado com a pressão) · desinfetantes e antibacterianos.</p>
<p><strong>Procedimento:</strong> desligar energia → acessar componentes (remover painéis) → remover sujeira (escovas + aspirador) → aplicar produto de limpeza → enxaguar com água → aplicar desinfetante → secar completamente → testar sistema.</p>
<h3>Carga de refrigerante</h3>
<p><strong>Passo a passo:</strong> identificar o refrigerante correto (placa de identificação) → verificar vazamentos → conectar manifold às portas de serviço → evacuar o sistema (bomba de vácuo) → adicionar refrigerante (monitorando pressão) → verificar a carga (pressão e temperatura dentro da faixa) → ajustes finos se necessário.</p>
<h3>Como achar vazamentos — 5 métodos</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Método</th><th>Como funciona</th><th>Melhor para</th></tr>
<tr><td>Detector eletrônico</td><td>Detecta corrente elétrica gerada pelo gás</td><td>Vazamentos pequenos</td></tr>
<tr><td>Solução de bolhas</td><td>Aplica líquido → forma bolhas</td><td>Áreas acessíveis</td></tr>
<tr><td>Pressurização com N₂</td><td>Nitrogênio a 100-150 psi + manômetro</td><td>Sistemas grandes</td></tr>
<tr><td>Inspeção visual + ultrassom</td><td>Ondas sonoras de alta frequência</td><td>Locais difíceis</td></tr>
<tr><td>Detector de halogênio</td><td>Sensível a R-134a, R-410A</td><td>Vazamentos sutis</td></tr>
</table>
<h3>Reparo de vazamentos — 5 técnicas</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Técnica</th><th>Durabilidade</th><th>Aplicação</th></tr>
<tr><td>Soldagem/brasagem</td><td>Permanente</td><td>Tubulações cobre/alumínio</td></tr>
<tr><td>Selantes</td><td>Média</td><td>Pequenas fissuras</td></tr>
<tr><td>Solda a frio (epóxi)</td><td>Média</td><td>Vazamentos menores</td></tr>
<tr><td>Fita adesiva</td><td>Temporária</td><td>Emergência</td></tr>
<tr><td>Substituição de componentes</td><td>Permanente</td><td>Danos extensos</td></tr>
</table>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Eficiência Energética',
    title: 'AC — Eficiência Energética',
    objective: 'Aplicar boas práticas de eficiência, comparar inverter × convencional e ler a classificação energética',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>AC — Eficiência Energética</h2>
<h3>Como melhorar a eficiência</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Prática</th><th>Impacto</th></tr>
<tr><td>Sistemas de zona</td><td>Evita climatizar áreas não utilizadas</td></tr>
<tr><td>Isolamento adequado</td><td>Reduz carga térmica</td></tr>
<tr><td>Manutenção regular</td><td>Filtros limpos = menos energia</td></tr>
<tr><td>Termostatos programáveis</td><td>Evita desperdício em horários vazios</td></tr>
<tr><td>Tecnologia inverter</td><td>Compressor ajusta velocidade continuamente</td></tr>
<tr><td>Equipamentos classe A</td><td>Menor consumo para mesma capacidade</td></tr>
</table>
<h3>Tecnologia Inverter × Convencional</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>Aspecto</th><th>Convencional</th><th>Inverter</th></tr>
<tr><td>Compressor</td><td>Liga/desliga</td><td>Velocidade variável</td></tr>
<tr><td>Temperatura</td><td>Flutua</td><td>Estável</td></tr>
<tr><td>Consumo</td><td>Maior</td><td>Menor</td></tr>
<tr><td>Ruído</td><td>Maior</td><td>Menor</td></tr>
<tr><td>Vida útil</td><td>Menor</td><td>Maior</td></tr>
</table>
<h3>Classificação energética</h3>
<div class="concept-box"><strong>📘 A → Mais eficiente (verde) · B → Eficiente · C → Médio · D → Abaixo da média · E → Ineficiente · F → Muito ineficiente · G → Pior (vermelho).</strong></div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Segurança no Trabalho',
    title: 'AC — Segurança no Trabalho',
    objective: 'Usar os EPIs obrigatórios, aplicar a NR-35 em altura e os cuidados elétricos',
    classification: 'PROCEDIMENTO_OPERACIONAL',
    content: `
<h2>AC — Segurança no Trabalho</h2>
<h3>EPIs obrigatórios</h3>
<table border="1" cellpadding="6" cellspacing="0">
<tr><th>EPI</th><th>Proteção</th></tr>
<tr><td>Óculos de proteção</td><td>Partículas, respingos</td></tr>
<tr><td>Luvas isolantes</td><td>Choques elétricos</td></tr>
<tr><td>Calçado com biqueira de aço</td><td>Quedas de objetos</td></tr>
<tr><td>Capacete</td><td>Impactos</td></tr>
<tr><td>Protetor auricular</td><td>Ruído de ferramentas</td></tr>
<tr><td>Máscara respiratória</td><td>Poeira, vapores</td></tr>
<tr><td>Cinto paraquedista</td><td>Trabalho em altura (NR-35)</td></tr>
</table>
<h3>Segurança em altura (NR-35)</h3>
<ul>
<li>Obrigatório acima de <strong>2 metros</strong></li>
<li>EPIs: cinto paraquedista + talabarte duplo + capacete com jugular</li>
<li>Trabalhador deve ter treinamento NR-35</li>
<li>Andaime deve ter guarda-corpo, rodapé e base nivelada</li>
</ul>
<h3>Cuidados elétricos</h3>
<div class="attention-box"><strong>⚠️ SEMPRE desligar energia antes de qualquer trabalho. Usar ferramentas isoladas. Manter mãos secas. Nunca trabalhar em ambientes úmidos. Sinalizar/etiquetar o disjuntor desligado.</strong></div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
  {
    module: 'AC — Precificação',
    title: 'AC — Precificação',
    objective: 'Calcular preços com a fórmula básica e escolher estratégias de precificação',
    classification: 'CONCEITO_GERAL',
    content: `
<h2>AC — Precificação (Resumo)</h2>
<h3>Fórmula básica</h3>
<div class="concept-box"><strong>📘 PREÇO = (Materiais + Mão de obra + Despesas indiretas) × (1 + margem de lucro).</strong><p>Margem de lucro típica: 10% a 30%.</p></div>
<h3>Estratégias de precificação</h3>
<ul>
<li><strong>Baseado em custos</strong> — soma tudo + margem</li>
<li><strong>Baseado na concorrência</strong> — pesquisa preços da região</li>
<li><strong>Baseado no valor percebido</strong> — cliente paga pelo benefício</li>
<li><strong>Preço dinâmico</strong> — varia com demanda/sazonalidade</li>
<li><strong>Pacotes de serviços</strong> — preço fixo para combo</li>
</ul>
<h3>Conclusão do mini-curso</h3>
<p>Você percorreu os 9 módulos essenciais de instalação e manutenção de ar-condicionado: Fundamentos, Termodinâmica, Componentes, Tipos de Sistemas, Instalação, Manutenção, Eficiência Energética, Segurança e Precificação.</p>
<p><strong>Pontuação:</strong> 25–30 acertos: Excelente · 18–24: Bom (revise os módulos com mais erros) · 10–17: Regular (revisão recomendada) · &lt; 10: estude novamente os módulos 2, 5 e 6.</p>
<div class="attention-box"><strong>⚠️ Este material é educacional e não substitui:</strong> curso técnico profissionalizante presencial; certificações específicas (NR-35, NR-10); leitura dos manuais dos fabricantes; prática supervisionada com profissional experiente. Trabalhos com eletricidade e fluidos refrigerantes envolvem riscos graves — nunca execute instalações ou manutenções sem a devida capacitação técnica e certificações exigidas por lei.</div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong></p>`,
  },
];

// Checkpoints = SIMULADO DE FIXAÇÃO (10 questões), distribuídos nas lições,
// + 1 checkpoint extra por lição sem cobertura (M4, M6, M7, M9).
// Gabarito fixação: 1-B, 2-D, 3-B, 4-B, 5-C, 6-C, 7-C, 8-B, 9-C, 10-B.
const CHECKPOINTS = [
  {
    lesson: 'AC — Fundamentos e Conceitos-Chave',
    question: 'Qual a diferença entre ar-condicionado e climatização?',
    options: ['São sinônimos', 'Ar-condicionado é o equipamento; climatização é o sistema/resultado', 'Climatização é apenas para indústria', 'Ar-condicionado é mais moderno'],
    correct: 1,
  },
  {
    lesson: 'AC — Termodinâmica Aplicada',
    question: 'Qual unidade NÃO é usada para capacidade frigorífica?',
    options: ['BTU/h', 'TR', 'kcal/h', 'kWh'],
    correct: 3,
  },
  {
    lesson: 'AC — Termodinâmica Aplicada',
    question: 'Quantos BTU/h tem 1 TR?',
    options: ['3.024', '12.000', '3,52', '4,72'],
    correct: 1,
  },
  {
    lesson: 'AC — Termodinâmica Aplicada',
    question: 'Qual a sequência CORRETA do ciclo de refrigeração?',
    options: [
      'Compressão → Expansão → Condensação → Evaporação',
      'Compressão → Condensação → Expansão → Evaporação',
      'Evaporação → Expansão → Condensação → Compressão',
      'Condensação → Compressão → Evaporação → Expansão',
    ],
    correct: 1,
  },
  {
    lesson: 'AC — Componentes do Sistema',
    question: 'Qual componente ABSORVE calor no ciclo?',
    options: ['Compressor', 'Condensador', 'Evaporador', 'Válvula de expansão'],
    correct: 2,
  },
  {
    lesson: 'AC — Componentes do Sistema',
    question: 'Qual tipo de compressor é mais silencioso e eficiente?',
    options: ['Pistão', 'Rotativo', 'Scroll', 'Parafuso'],
    correct: 2,
  },
  {
    lesson: 'AC — Componentes do Sistema',
    question: 'Qual o melhor dispositivo de expansão para data centers?',
    options: ['Tubo capilar', 'Válvula TXV', 'Válvula EEV (eletrônica)', 'Piston'],
    correct: 2,
  },
  {
    lesson: 'AC — Tipos de Sistemas',
    question: 'O sistema VRF/VRV é classificado como:',
    options: ['Expansão indireta + centralizado', 'Expansão direta + unitário', 'Expansão indireta + unitário', 'Expansão direta + centralizado'],
    correct: 1,
  },
  {
    lesson: 'AC — Instalação Passo a Passo',
    question: 'Qual a distância recomendada entre unidade interna e externa?',
    options: ['1 a 3 metros', '3 a 15 metros', '15 a 30 metros', 'Sempre 10 metros'],
    correct: 1,
  },
  {
    lesson: 'AC — Instalação Passo a Passo',
    question: 'Quantos estágios tem o processo de vácuo?',
    options: ['1', '2', '3', '4'],
    correct: 2,
  },
  {
    lesson: 'AC — Manutenção',
    question: 'Antes de remover o capacitor, é obrigatório:',
    options: ['Apenas desligar a energia', 'Desligar a energia e DESCARREGAR o capacitor', 'Medir a tensão', 'Chamar um eletricista'],
    correct: 1,
  },
  {
    lesson: 'AC — Eficiência Energética',
    question: 'Qual a classificação energética mais eficiente?',
    options: ['A', 'B', 'D', 'G'],
    correct: 0,
  },
  {
    lesson: 'AC — Segurança no Trabalho',
    question: 'Acima de qual altura é obrigatório o cinto paraquedista?',
    options: ['1 metro', '2 metros', '3 metros', '5 metros'],
    correct: 1,
  },
  {
    lesson: 'AC — Precificação',
    question: 'Qual a fórmula básica de precificação de serviços de AC?',
    options: [
      'PREÇO = (Materiais + Mão de obra + Despesas indiretas) × (1 + margem)',
      'PREÇO = custo dos materiais × 2',
      'PREÇO = preço da concorrência − 10%',
      'PREÇO fixo tabelado por aparelho',
    ],
    correct: 0,
  },
];

// AVALIAÇÃO FINAL — 30 questões, order 201-230 (fora do simulado principal).
// explanation = justificativa do gabarito comentado. m = índice do módulo AC.
const QUESTIONS = [
  { m: 0, cat: 'AC - Fundamentos', q: 'A invenção do ar-condicionado moderno é atribuída a:', o: ['Jacob Perkins', 'Willis Haviland Carrier', 'Thomas Edison', 'Nikola Tesla'], c: 1, e: 'Willis Carrier inventou o AC moderno em 1902.' },
  { m: 0, cat: 'AC - Fundamentos', q: 'Qual a faixa de temperatura típica da climatização (conforto humano)?', o: ['-70 a 10 °C', '10 a 30 °C', '30 a 50 °C', '-10 a 0 °C'], c: 1, e: 'Climatização: 10 a 30 °C (conforto humano).' },
  { m: 0, cat: 'AC - Fundamentos', q: 'Qual NÃO é uma finalidade do ar-condicionado?', o: ['Conforto térmico', 'Processo industrial', 'Conservação de alimentos', 'Climatização de data centers'], c: 2, e: 'Conservação de alimentos é refrigeração, não climatização.' },
  { m: 1, cat: 'AC - Termodinâmica', q: 'Qual processo de transferência de calor ocorre em fluidos em movimento?', o: ['Condução', 'Convecção', 'Radiação', 'Evaporação'], c: 1, e: 'Convecção = fluido em movimento (ar ou água).' },
  { m: 2, cat: 'AC - Componentes', q: 'Em qual componente o refrigerante passa de vapor para líquido?', o: ['Evaporador', 'Compressor', 'Condensador', 'Válvula de expansão'], c: 2, e: 'Condensador: vapor → líquido (libera calor).' },
  { m: 1, cat: 'AC - Termodinâmica', q: '1 TR equivale a quantos kW?', o: ['1,5 kW', '2,5 kW', '3,52 kW', '5,0 kW'], c: 2, e: '1 TR = 3,52 kW.' },
  { m: 2, cat: 'AC - Componentes', q: 'Qual tipo de compressor é usado em sistemas de grande porte (edifícios comerciais)?', o: ['Pistão', 'Rotativo', 'Scroll', 'Parafuso'], c: 3, e: 'Parafuso: usado em grandes edifícios.' },
  { m: 2, cat: 'AC - Componentes', q: 'Qual dispositivo de expansão é mais simples e barato?', o: ['Válvula TXV', 'Válvula EEV', 'Tubo capilar', 'Válvula AEV'], c: 2, e: 'Tubo capilar: simples e barato, usado em split pequenos.' },
  { m: 3, cat: 'AC - Tipos', q: 'Qual tipo de sistema usa água gelada como intermediária?', o: ['Expansão direta', 'Expansão indireta', 'Sistema unitário', 'Sistema VRF'], c: 1, e: 'Expansão indireta = água gelada (fan coil + chiller).' },
  { m: 3, cat: 'AC - Tipos', q: 'Qual desses equipamentos é do tipo "monobloco"?', o: ['Split', 'Janela', 'VRF', 'Fan coil'], c: 1, e: 'Janela = monobloco (tudo em uma estrutura).' },
  { m: 3, cat: 'AC - Tipos', q: 'Qual a capacidade típica de um ar-condicionado de janela?', o: ['3.000 a 7.000 BTU/h', '7.000 a 30.000 BTU/h', '30.000 a 60.000 BTU/h', '60.000 a 100.000 BTU/h'], c: 1, e: '7.000 a 30.000 BTU/h.' },
  { m: 3, cat: 'AC - Tipos', q: 'O sistema VRF/VRV é classificado como:', o: ['Expansão indireta + centralizado', 'Expansão direta + unitário', 'Expansão indireta + unitário', 'Expansão direta + centralizado'], c: 1, e: 'VRF/VRV = expansão direta + unitário.' },
  { m: 4, cat: 'AC - Instalação', q: 'Qual ferramenta é essencial para medir pressão e vácuo do sistema?', o: ['Multímetro', 'Termômetro infravermelho', 'Manifold', 'Alicate de corte'], c: 2, e: 'Manifold mede pressão e vácuo.' },
  { m: 4, cat: 'AC - Instalação', q: 'Qual a distância recomendada entre o suporte interno e o teto?', o: ['5 a 10 cm', '10 a 15 cm', '15 a 30 cm', '30 a 50 cm'], c: 2, e: '15 a 30 cm do teto.' },
  { m: 4, cat: 'AC - Instalação', q: 'Onde NUNCA se deve jogar a drenagem do ar-condicionado?', o: ['Rede pluvial', 'Jardim', 'Rede de esgoto', 'Solo'], c: 2, e: 'Rede de esgoto — usar sempre rede pluvial.' },
  { m: 4, cat: 'AC - Instalação', q: 'Qual o primeiro passo antes de qualquer trabalho elétrico no AC?', o: ['Desconectar os fios', 'Desligar a energia na fonte principal', 'Medir a amperagem', 'Abrir o painel'], c: 1, e: 'Desligar energia na fonte principal é o 1º passo.' },
  { m: 4, cat: 'AC - Instalação', q: 'Quantos estágios tem o processo de vácuo?', o: ['1', '2', '3', '5'], c: 2, e: '3 estágios: evacuação, desgaseificação, estabilização.' },
  { m: 4, cat: 'AC - Instalação', q: 'Qual o objetivo do processo de vácuo?', o: ['Aumentar a pressão', 'Remover ar e umidade do sistema', 'Testar o compressor', 'Carregar o refrigerante'], c: 1, e: 'Remove ar e umidade (causam gelo, corrosão, danos).' },
  { m: 4, cat: 'AC - Instalação', q: 'Qual a faixa de pressão típica do vácuo inicial?', o: ['100-200 microns', '500-1000 microns', '2000-3000 microns', '5000 microns'], c: 1, e: '500-1000 microns.' },
  { m: 4, cat: 'AC - Instalação', q: 'Um motor com amperagem MUITO ALTA pode indicar:', o: ['Motor novo', 'Falha no motor ou sobrecarga', 'Sistema desligado', 'Vácuo insuficiente'], c: 1, e: 'Corrente alta = sobrecarga ou falha no motor.' },
  { m: 5, cat: 'AC - Manutenção', q: 'Qual componente armazena energia e fornece impulso inicial ao motor?', o: ['Compressor', 'Capacitor', 'Sensor', 'Placa eletrônica'], c: 1, e: 'Capacitor: armazena energia e dá impulso inicial.' },
  { m: 5, cat: 'AC - Manutenção', q: 'Qual o sinal visual de um capacitor defeituoso?', o: ['Cor diferente', 'Superfície inchada ou vazamento', 'Cheiro de queimado', 'Não tem sinal visual'], c: 1, e: 'Superfície inchada ou vazamento de óleo.' },
  { m: 5, cat: 'AC - Manutenção', q: 'Antes de remover o capacitor, é obrigatório:', o: ['Apenas desligar a energia', 'Desligar a energia e DESCARREGAR o capacitor', 'Medir a tensão', 'Chamar um eletricista'], c: 1, e: 'Desligar E descarregar (resíduo de carga = risco).' },
  { m: 5, cat: 'AC - Manutenção', q: 'Qual método de detecção de vazamento é o mais preciso?', o: ['Inspeção visual', 'Solução de bolhas', 'Detector eletrônico', 'Ultrassom'], c: 2, e: 'Detector eletrônico: mais preciso.' },
  { m: 5, cat: 'AC - Manutenção', q: 'Qual método de reparo de vazamento é apenas TEMPORÁRIO?', o: ['Brasagem', 'Selante', 'Solda a frio', 'Fita adesiva'], c: 3, e: 'Fita adesiva: solução apenas de emergência.' },
  { m: 6, cat: 'AC - Eficiência', q: 'Qual a tecnologia que permite ao compressor ajustar a velocidade continuamente?', o: ['Inverter', 'Convencional', 'Scroll', 'Rotativo'], c: 0, e: 'Tecnologia Inverter: velocidade variável.' },
  { m: 6, cat: 'AC - Eficiência', q: 'Qual a classificação energética mais eficiente?', o: ['A', 'B', 'D', 'G'], c: 0, e: 'Classe A: mais eficiente (verde).' },
  { m: 7, cat: 'AC - Segurança', q: 'Acima de qual altura é obrigatório o cinto paraquedista?', o: ['1,5 m', '2 m', '3 m', '5 m'], c: 1, e: '2 metros (NR-35).' },
  { m: 7, cat: 'AC - Segurança', q: 'Qual EPI é essencial para proteger contra ruído de ferramentas?', o: ['Óculos de proteção', 'Luvas isolantes', 'Protetor auricular', 'Máscara respiratória'], c: 2, e: 'Protetor auricular: protege contra ruído.' },
  { m: 8, cat: 'AC - Precificação', q: 'Qual a margem de lucro típica em serviços de AC?', o: ['1% a 5%', '5% a 10%', '10% a 30%', '50% a 100%'], c: 2, e: '10% a 30% é a margem típica.' },
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
      ).run(item.cat, item.q, 'MEDIUM', item.e, 1, mid, 201 + idx);
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
    acquestions: db.prepare("SELECT COUNT(*) c FROM questions WHERE category LIKE 'AC -%'").get().c,
  };
  console.log('OK ac: modulos_novos=' + modCreated + ' licoes_novas=' + lesCreated + ' checkpoints_novos=' + cpCreated + ' questoes_novas=' + qCreated);
  console.log('Totais: ' + JSON.stringify(totals));
  db.close();
}

main();
