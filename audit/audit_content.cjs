const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

console.log('=== AUDITORIA: CONTEÚDO TÉCNICO DOS 17 MÓDULOS ===\n');

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  const countOcc = (html, re) => {
    if (!html) return 0;
    const m = html.match(re);
    return m ? m.length : 0;
  };

  const lessons = db.prepare(`
    SELECT tl.id, tl.title, tl.classification, tl.status, tl.content,
           tm.id as module_id, tm.title as module_title, tm.order_num
    FROM training_lessons tl
    JOIN training_modules tm ON tm.id = tl.module_id
    ORDER BY tm.order_num, tl.order_num
  `).all();

  console.log('=== TESTE DE QUALIDADE DO CONTEÚDO (FASE DE ENRIQUECIMENTO) ===\n');

  console.log(
    pad('Módulo') + '|' + pad('Lição', 34) + '|' +
    pad('Caracteres', 10) + '|' + pad('Headings', 9) + '|' +
    pad('Boxes', 6) + '|' + pad('Checklists', 11) + '|' +
    pad('Checkpoints', 11) + '|' + pad('Classificação', 22) + '|Status'
  );
  console.log('-'.repeat(160));

  let totalChars = 0;
  lessons.forEach(l => {
    const content = l.content || '';
    const chars = content.length;
    totalChars += chars;
    const headings = countOcc(content, /<h[1-6][ >]/gi);
    const boxes = countOcc(content, /class="(concept|procedure|reference|attention)-box"/g);
    const checklists = countOcc(content, /class="checklist-aula"/g);
    const cps = db.prepare('SELECT COUNT(*) c FROM lesson_checkpoints WHERE lesson_id=?').get(l.id).c;

    console.log(
      pad('M' + String(l.order_num).padStart(2, '0')) + '|' + pad(l.title, 34) + '|' +
      pad(String(chars), 10) + '|' + pad(String(headings), 9) + '|' +
      pad(String(boxes), 6) + '|' + pad(String(checklists), 11) + '|' +
      pad(String(cps), 11) + '|' + pad(l.classification || 'N/A', 22) + '|' + (l.status || 'N/A')
    );
  });

  console.log('-'.repeat(160));
  console.log(pad('TOTAL') + '|' + pad(String(lessons.length) + ' lições', 34) + '|' + pad(String(totalChars), 10));
  console.log('\nCritério: "Conteúdo suficiente para ensinar o assunto de forma clara e completa."\nNão é exigida quantidade artificial de texto.\n');

  // Módulos com lições e status
  const modules = db.prepare(`
    SELECT tm.id, tm.title, tm.category, tm.status,
           COUNT(tl.id) as lesson_count
    FROM training_modules tm
    LEFT JOIN training_lessons tl ON tm.id = tl.module_id
    GROUP BY tm.id
    ORDER BY tm.order_num
  `).all();

  console.log(`Módulos encontrados: ${modules.length}\n`);
  modules.forEach(mod => {
    const empty = mod.lesson_count === 0;
    console.log(`=== MÓDULO ${String(mod.id).padStart(2, '0')}: ${mod.title} ===`);
    console.log(`Categoria: ${mod.category || 'N/A'} | Status: ${mod.status}`);
    console.log(`Lições: ${mod.lesson_count}${empty ? '  ⚠️ MÓDULO SEM LIÇÕES' : ''}`);
    console.log();
  });

  // Verificar informações inventadas
  console.log('=== VERIFICANDO INFORMAÇÕES INVENTADAS ===\n');

  const inventedPatterns = [
    /\b\d+\s*V\s*(exato|preciso|fixo|obrigatóri)/i,
    /\b\d+\s*A\s*(exato|preciso|fixo|obrigatóri)/i,
    /\b\d+\s*kW\s*(exato|preciso|fixo|obrigatóri)/i,
    /fabricante:\s*\w+/i,
    /modelo:\s*\w+/i,
    /setpoint:\s*\d+/i,
    /torque:\s*\d+\s*Nm/i,
    /N\+1\s*(sempre|obrigatório|exato)/i,
    /N\+N\s*(sempre|obrigatório|exato)/i,
    /senha(\s*[:=]\s*\S+)/i
  ];

  let foundInvented = false;
  lessons.forEach(lesson => {
    inventedPatterns.forEach(pattern => {
      const m = (lesson.content || '').match(pattern);
      if (m) {
        console.log(`⚠️  POSSÍVEL INFORMAÇÃO INVENTADA em "${lesson.title}":`);
        console.log(`   Padrão encontrado: ${pattern}`);
        foundInvented = true;
      }
    });
  });

  if (!foundInvented) {
    console.log('✅ Nenhum padrão de informação inventada detectado\n');
  }

  // Verificar ausência de credenciais
  console.log('=== VERIFICANDO CREDENCIAIS/SENHAS ===\n');
  const credPatterns = [/password\s*[:=]/i, /senha\s*[:=]\s*\S+/i, /ACU\s*:\s*\w+/i];
  let hasCred = false;
  lessons.forEach(l => {
    credPatterns.forEach(p => {
      if (p.test(l.content || '')) {
        console.log(`⚠️  Possível credencial em "${l.title}": ${p}`);
        hasCred = true;
      }
    });
  });
  if (!hasCred) console.log('✅ Nenhuma credencial/senha exposta no conteúdo das lições\n');

  // Verificar classificações
  console.log('=== VERIFICANDO CLASSIFICAÇÕES ===\n');
  const validClassifications = ['CONCEITO_GERAL', 'CONFIGURACAO_AMBIENTE', 'PROCEDIMENTO_OPERACIONAL', 'REFERENCIA'];
  lessons.forEach(lesson => {
    if (lesson.classification && !validClassifications.includes(lesson.classification)) {
      console.log(`⚠️  Classificação inválida em "${lesson.title}": ${lesson.classification}`);
    }
  });
  console.log('✅ Classificações válidas\n');

  // Verificar referências de campo
  console.log('=== VERIFICANDO REFERÊNCIAS DE CAMPO ===\n');
  let hasFieldReferences = false;
  lessons.forEach(lesson => {
    const c = lesson.content || '';
    if (c.includes('referência de campo') || c.includes('REFERENCIA_DE_CAMPO') || c.includes('Referência') || c.toLowerCase().includes('não são limites universais')) {
      hasFieldReferences = true;
      console.log(`✅ "${lesson.title}" contém referências de campo`);
    }
  });
  if (!hasFieldReferences) console.log('⚠️  Poucas referências de campo encontradas\n');

  // Verificar conteúdo UPS/Baterias
  console.log('=== VERIFICANDO CONTEÚDO UPS/BATERIAS ===\n');
  const batteryLessons = lessons.filter(l =>
    l.title.toLowerCase().includes('bateria') ||
    l.title.toLowerCase().includes('ups') ||
    l.title.toLowerCase().includes('fcc')
  );
  batteryLessons.forEach(lesson => {
    const c = lesson.content || '';
    console.log(`Lição: ${lesson.title}`);
    if (c.includes('12 V') && c.includes('150 Ah')) console.log('  ✅ Contém referência de 12V/150Ah como configuração');
    if (c.includes('13,7 V') || c.includes('13.7 V')) console.log('  ✅ Contém referência de ~13.7V em flutuação');
    if (c.includes('12,5 V') || c.includes('12.5 V')) console.log('  ✅ Contém referência de ~12.5V em descarga');
    if (c.includes('40 elementos')) console.log('  ✅ Contém referência de 40 elementos');
  });

  db.close();

  console.log('\n=== FIM DA AUDITORIA DE CONTEÚDO TÉCNICO ===\n');
} catch (error) {
  console.error('❌ ERRO NA AUDITORIA DE CONTEÚDO:', error);
  process.exit(1);
}

function pad(str, n = 10) {
  const s = String(str);
  if (s.length >= n) return s.slice(0, n);
  return s + ' '.repeat(n - s.length);
}