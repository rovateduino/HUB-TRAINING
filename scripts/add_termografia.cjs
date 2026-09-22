require('dotenv').config();
const { initFirebase, getFirestore } = require('../server/services/firebase.cjs');
const { appendLessonContent, getLessonById } = require('../server/repositories/trainingRepo.cjs');

const MARKER = '<!-- TERMOGRAFIA_v1 -->';

const BLOCO_13 = `
<h3>🌡️ Termografia — verificação de temperatura nos circuitos</h3>
<div class="concept-box"><strong>📘 Conceito:</strong> termografia é a verificação da <strong>temperatura</strong> dos componentes elétricos (conexões, disjuntores, barramentos, cabos, terminais e quadros) durante a preventiva, com instrumento adequado de medição de temperatura sem contato, quando previsto no procedimento do local. O objetivo é identificar <strong>aquecimentos anormais</strong> que a medição de tensão/corrente sozinha pode não revelar no momento.</div>
<div class="procedure-box"><strong>🛠️ Por que incluir na preventiva:</strong>
<ul>
  <li><strong>Antecipação:</strong> um ponto com aquecimento progressivo costuma indicar resistência de contato, mau aperto, oxidação, sobrecarga ou degradação — antes de virar falha.</li>
  <li><strong>Comparação:</strong> registrar a condição térmica encontrada (ponto, circuito, condição, evidência) permite comparar com o histórico das preventivas anteriores e perceber tendências.</li>
  <li><strong>Complemento:</strong> corrente elevada + aquecimento no mesmo ponto reforçam a necessidade de investigação; ausência de aquecimento não dispensa a medição elétrica — as duas verificações se completam.</li>
  <li><strong>Onde verificar:</strong> quadros e circuitos previstos no procedimento (ex.: QDGE, QDNB, QDT, QFAC, QDF e derivações), com atenção a conexões, disjuntores e barramentos.</li>
</ul></div>
<div class="attention-box"><strong>⚠️ Sem verificação de temperatura, o risco passa despercebido:</strong> um mau contato ou uma sobrecarga inicial pode operar por meses sem sintomas visíveis — até provocar danos. Possíveis danos e prejuízos quando a verificação não é feita:
<ul>
  <li><strong>Danos aos circuitos e equipamentos:</strong> degradação de isolação, derretimento de cabos/terminais, dano a disjuntores, barramentos e quadros.</li>
  <li><strong>Interrupção e perda de continuidade:</strong> desarme, desligamento de cargas críticas, indisponibilidade de serviços do HUB/Site/Data Center.</li>
  <li><strong>Risco de incêndio e segurança:</strong> aquecimento severo em quadro é fonte potencial de princípio de incêndio, com risco a pessoas e à instalação.</li>
  <li><strong>Prejuízos operacionais e financeiros:</strong> corretiva emergencial (normalmente mais cara que a preventiva), substituição de componentes, deslocamentos extras, multas/penalidades por indisponibilidade e perda de histórico confiável para análise.</li>
  <li><strong>Efeito cascata:</strong> uma falha térmica em um quadro central (ex.: QDGE) pode afetar UPS, FCC e climatização ao mesmo tempo.</li>
</ul></div>
<div class="procedure-box"><strong>🛠️ Como registrar:</strong> equipamento e circuito afetado · condição térmica encontrada · medição/valor lido quando houver · horário · evidência (foto/anotação) · observação objetiva · ação realizada ou recomendada. Toda anormalidade térmica segue o mesmo fluxo: <strong>registrar → comparar com histórico → comunicar → encaminhar tratamento</strong> conforme procedimento e autorização. Nenhum limite universal é definido neste treinamento — a avaliação segue procedimento/projeto aplicável.</div>
<p><strong>⚠ PENDENTE DE VALIDAÇÃO TÉCNICA</strong> — instrumento, pontos obrigatórios e critérios de aceitação seguem o procedimento do local/fabricante.</p>
`;

const BLOCO_10_REF = `
<div class="procedure-box"><strong>🛠️ Verificação de temperatura (termografia):</strong> durante a inspeção e as medições, incluir também a verificação da <strong>temperatura dos circuitos</strong> (termografia) nos pontos previstos no procedimento. Registrar ponto, circuito, condição encontrada e evidência. Detalhes, danos e prejuízos da falta dessa verificação estão na aula <strong>Inspeção e Anormalidades</strong>.</div>
`;

(async () => {
  await initFirebase();
  const r13 = await appendLessonContent('13', BLOCO_13, MARKER);
  console.log('lesson 13 append:', JSON.stringify(r13));
  const r10 = await appendLessonContent('10', BLOCO_10_REF, MARKER);
  console.log('lesson 10 append:', JSON.stringify(r10));
  for (const id of ['13', '10']) {
    const l = await getLessonById(id);
    console.log(`lesson ${id} new_len=${String(l.content||'').length} hasMarker=${String(l.content||'').includes(MARKER)}`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
