const Database = require('better-sqlite3');
const db = new Database('./training.db');

const updMod = db.prepare(`
  UPDATE training_modules
  SET description = ?,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = ?
`);

const m01desc = `Cartilha didática de treinamento interno para HUBs, Sites e Data Centers. Objetivo: apresentar, de forma organizada, como funciona a infraestrutura elétrica e como é executada a rotina de manutenção preventiva. O profissional deve compreender: de onde vem a energia; como ela é transferida e distribuída; função dos principais quadros e equipamentos; funcionamento de gerador, UPS e FCC; arquitetura AC e DC; bancos de baterias; climatização; medições AC e DC; medição de corrente dos circuitos; identificação de anormalidades; testes de baterias; procedimento de descarga dos retificadores; utilização do HIOKI BT3554-01; registro das atividades no Infratel; requisitos de segurança; documentação e encerramento da atividade.

Importante: esta cartilha é material de treinamento interno. Ela não substitui NR-10, procedimentos corporativos, autorização formal para intervenção, documentação do local, projetos, manuais dos fabricantes ou demais procedimentos aplicáveis. Conteúdo PENDENTE DE VALIDAÇÃO TÉCNICA.`;

const r = updMod.run(m01desc, 1);
console.log('M01 description UPDATE changes=' + r.changes);

/* =====================================================
   🧠 TESTES DE FIXAÇÃO por módulo (baseados na cartilha)
   Inseridos NO FINAL do conteúdo (via append ao marker)
===================================================== */
const quizByLesson = {
  2: [
    { q: 'Qual é a grande finalidade da manutenção preventiva, além de "medir tensão"?', a: 'Verificar as condições gerais da infraestrutura que mantém a carga crítica funcionando.' },
    { q: 'Quais são os dois grandes sistemas elétricos presentes na instalação?', a: 'Sistema AC (UPS → QDNB → QDT → carga AC) e Sistema DC (FCC → QDF → carga DC).' },
    { q: 'Que pergunta fundamental o profissional deve fazer antes de qualquer medição?', a: '"Onde estou medindo, de onde vem essa energia e qual carga depende desse circuito?"' }
  ],
  8: [
    { q: 'É correto presumir que todo HUB tem exatamente a mesma configuração de baterias?', a: 'Não. Existem configurações diferentes: 12 V, 2 V seladas / 1000 Ah, 12 bancos com 48 baterias etc. — sempre consultar a documentação do local.' },
    { q: 'Quando se pode realizar reposição de água em baterias que exigem manutenção?', a: 'Apenas se previsto pelo fabricante e pelo procedimento aplicável; nunca "porque parece baixa".' }
  ],
  10: [
    { q: 'Qual é a janela de trabalho normalmente utilizada para a preventiva?', a: '01:00 às 05:00.' },
    { q: 'A atividade pode começar antes da autorização do Site Management Center?', a: 'Não. A atividade não deve começar antes da autorização necessária.' },
    { q: 'Por que a rotina normalmente utiliza dois profissionais?', a: 'Um mede, o outro registra/acompanha/confere — reduz erros de registro e aumenta a rastreabilidade.' }
  ],
  11: [
    { q: 'Uma medição isolada pode ser classificada diretamente como "boa" ou "ruim"?', a: 'Não. É preciso considerar equipamento, ponto, configuração, histórico, procedimento, fabricante e condições da instalação.' }
  ],
  12: [
    { q: 'Foi encontrada corrente elevada em um disjuntor. Qual é a primeira ação?', a: 'Investigar: identificar circuito/rack/carga, verificar redundância, avaliar balanceamento, só então definir ação com procedimento/autorização.' },
    { q: 'Corrente elevada autoriza trocar o disjuntor imediatamente?', a: 'Não. Corrente elevada é um sinal para investigar — não uma ordem automática de troca.' }
  ],
  13: [
    { q: 'Que informações NÃO podem faltar no registro de uma anormalidade?', a: 'equipamento/circuito, condição, medição, horário, evidência, observação, ação realizada ou recomendada.' },
    { q: 'Por que o histórico é tão importante?', a: 'Permite comparar medição anterior vs atual e identificar tendências — inclusive alterações graduais, que podem ser tão relevantes quanto anomalias imediatas.' }
  ],
  14: [
    { q: 'Uma única leitura de resistência interna serve para aprovar/reprovar uma bateria?', a: 'Não. Analisar sempre com tensão, comportamento em descarga, temperatura, histórico, condição física e especificação do fabricante.' },
    { q: 'Por que as baterias são medidas elemento a elemento?', a: 'Porque o banco pode parecer normal, mas um elemento individual pode estar desviante.' }
  ],
  15: [
    { q: 'O procedimento de descarga FCC é um roteiro universal?', a: 'Não. É específico do ambiente informado; não aplicar em outros FCCs sem o procedimento do local.' },
    { q: 'O sistema não retornou ao comportamento esperado. Posso improvisar ajustes?', a: 'Não. Conferir os ajustes pelo procedimento; nunca alterar parâmetros por conta própria.' }
  ],
  16: [
    { q: 'Como é realizado o 0-ADJ no HIOKI?', a: 'Encostar o pino central de uma ponta na parte externa da outra e executar 0-ADJ, conferindo indicação próxima de zero.' },
    { q: 'O equipamento não aparece no GENNECT One. Quais as primeiras verificações?', a: 'Cabo USB, outra porta USB, instalação do driver (DPInst64/32 com privilégios administrativos).' },
    { q: 'Os dados não aparecem após aquisição. O que verificar no HIOKI?', a: 'Contador de memória do equipamento — não pode estar em 000 antes da aquisição.' }
  ],
  17: [
    { q: 'Registro genérico "Preventiva realizada." é adequado?', a: 'Não. Um bom registro permite que outra pessoa entenda o que realmente aconteceu (equipamento, ponto, medição, condição, observação, evidência, ação).' },
    { q: 'Liste pelo menos 4 campos da estrutura sugerida de registro.', a: 'Ex.: Equipamento, Ponto, Medição, Condição, Observação, Evidência, Ação.' }
  ],
  18: [
    { q: 'O que vem antes: a medição ou a segurança?', a: 'A segurança. Nenhuma medição justifica ignorar uma condição de risco.' },
    { q: 'Liste pelo menos 3 itens da lista "não improvisar".', a: 'não alterar parâmetros sem autorização · não modificar circuitos sem entender a arquitetura · não desligar cargas críticas sem procedimento · não ignorar alarmes · não substituir componentes por suspeita · não usar referências como limites universais.' },
    { q: 'O que prevalece sempre sobre "regras decoradas"?', a: 'O procedimento do local, o fabricante, a documentação técnica e a autorização formal.' }
  ]
};

const APPEND_QUIZ_MARKER = '<!-- CARTILHA_QUIZ_v1 -->';
const get = db.prepare('SELECT id, content FROM training_lessons WHERE id = ?');
const upd = db.prepare('UPDATE training_lessons SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');

let qCount = 0;
Object.entries(quizByLesson).forEach(([lid, arr]) => {
  const row = get.get(Number(lid));
  if (!row) return;
  if (String(row.content || '').includes(APPEND_QUIZ_MARKER)) { console.log('SKIP quiz lessonId=' + lid); return; }
  const html = `
${APPEND_QUIZ_MARKER}
<div class="concept-box" style="background:#fff7ed;border-left-color:#f59e0b;">
  <strong>🧠 Teste seus conhecimentos — ${arr.length} perguntas rápidas</strong>
  <p style="margin:8px 0 0;color:#78350f;font-size:13px;">Responda mentalmente. Se tiver dúvida, reveja o conteúdo desta lição antes de prosseguir. Isso prepara você para o Simulado Final.</p>
</div>
${arr.map((item, i) => `
  <div class="procedure-box" style="background:#fff;border:1px solid var(--border-color);border-left:4px solid var(--warning-yellow);padding:12px 16px;">
    <p style="margin:0 0 8px;font-weight:700;">${i + 1}. ${item.q}</p>
    <details style="margin-top:6px;">
      <summary style="cursor:pointer;color:var(--primary-blue);font-weight:600;font-size:13px;">Ver resposta comentada</summary>
      <p style="margin:8px 0 0;color:var(--text-dark);font-size:14px;line-height:1.6;">${item.a}</p>
    </details>
  </div>
`).join('')}
<div class="reference-box"><strong>📝 Resumo da lição:</strong> se você compreendeu bem este módulo, deve ser capaz de responder corretamente a maioria das perguntas acima sem consulta. Volte para o <a href="#study" onclick="navigateTo('study');return false;">Índice da Cartilha</a> para avançar.</div>
`;
  const newContent = (row.content || '').trimEnd() + '\n\n' + html + '\n';
  const info = upd.run(newContent, Number(lid));
  console.log('QUIZ lessonId=' + lid + ' changes=' + info.changes + ' (' + arr.length + ' q)');
  qCount += info.changes;
});

db.close();
console.log('DONE mod_desc + quiz updates=' + qCount);
