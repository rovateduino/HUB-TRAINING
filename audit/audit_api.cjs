const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function main() {
  console.log('=== AUDITORIA: APIs ===\n');
  
  try {
    // 1. Health Check
    console.log('1. HEALTH CHECK...');
    const health = await makeRequest('/health');
    if (health.status === 200 && health.data.status === 'ok') {
      console.log('   ✅ Health check funcionando\n');
    } else {
      console.log('   ❌ Health check falhou\n');
    }
    
    // 2. GET /api/training/modules
    console.log('2. GET /api/training/modules...');
    const modules = await makeRequest('/api/training/modules');
    if (modules.status === 200 && modules.data.modules && modules.data.modules.length === 17) {
      console.log(`   ✅ 17 módulos retornados`);
      console.log(`   ✅ Status técnico: ${modules.data.modules[0].status}\n`);
    } else {
      console.log(`   ❌ Falha: ${modules.status}\n`);
    }
    
    // 3. GET /api/training/module/:id
    console.log('3. GET /api/training/module/1...');
    const moduleDetail = await makeRequest('/api/training/module/1');
    if (moduleDetail.status === 200 && moduleDetail.data.module && moduleDetail.data.lessons) {
      console.log(`   ✅ Detalhes do módulo retornados`);
      console.log(`   ✅ Lições no módulo: ${moduleDetail.data.lessons.length}\n`);
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 4. GET /api/training/lesson/:id
    console.log('4. GET /api/training/lesson/2...');
    const lesson = await makeRequest('/api/training/lesson/2');
    if (lesson.status === 200 && lesson.data.lesson) {
      console.log(`   ✅ Detalhes da lição retornados`);
      console.log(`   ✅ Classificação: ${lesson.data.lesson.classification}\n`);
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 5. GET /api/progress/user/:userId
    console.log('5. GET /api/progress/user/1...');
    const progress = await makeRequest('/api/progress/user/1');
    if (progress.status === 200 && progress.data.progress) {
      console.log(`   ✅ Progresso do usuário retornado`);
      console.log(`   ✅ Registros: ${progress.data.progress.length}\n`);
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 6. POST /api/progress
    console.log('6. POST /api/progress (criar progresso)...');
    const newProgress = await makeRequest('/api/progress', 'POST', {
      user_id: 1,
      lesson_id: 3,
      status: 'IN_PROGRESS',
      progress: 0
    });
    if (newProgress.status === 200) {
      console.log(`   ✅ Progresso criado/atualizado\n`);
    } else {
      console.log(`   ⚠️  Possível duplicação (constraint UNIQUE)\n`);
    }
    
    // 7. GET /api/checkpoints/lesson/:lessonId
    console.log('7. GET /api/checkpoints/lesson/1 (verificar segurança)...');
    const checkpoints = await makeRequest('/api/checkpoints/lesson/1');
    if (checkpoints.status === 200 && checkpoints.data.checkpoints) {
      console.log(`   ✅ Checkpoints retornados: ${checkpoints.data.checkpoints.length}`);
      
      // Verificar se is_correct não está exposto
      const checkpointStr = JSON.stringify(checkpoints.data);
      if (checkpointStr.includes('is_correct') || checkpointStr.includes('correctAnswer') || checkpointStr.includes('gabarito')) {
        console.log('   ❌ GABARITO EXPOSTO AO FRONTEND\n');
      } else {
        console.log('   ✅ Gabarito NÃO exposto ao frontend\n');
      }
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 8. GET /api/audit
    console.log('8. GET /api/audit...');
    const audit = await makeRequest('/api/audit');
    if (audit.status === 200 && audit.data.logs) {
      console.log(`   ✅ Logs de auditoria retornados`);
      console.log(`   ✅ Total: ${audit.data.total}\n`);
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 9. GET /api/equipment/topology
    console.log('9. GET /api/equipment/topology...');
    const topology = await makeRequest('/api/equipment/topology');
    if (topology.status === 200 && topology.data.topology) {
      const equipmentCount = Object.keys(topology.data.topology).length;
      console.log(`   ✅ Topologia retornada`);
      console.log(`   ✅ Equipamentos: ${equipmentCount}\n`);
    } else {
      console.log('   ❌ Falha\n');
    }
    
    // 10. Teste de 404
    console.log('10. Teste de rota inexistente (404)...');
    const notFound = await makeRequest('/api/rota-inexistente');
    if (notFound.status === 404) {
      console.log('   ✅ 404 retornado corretamente\n');
    } else {
      console.log('   ❌ 404 não retornado\n');
    }
    
    console.log('=== FIM DA AUDITORIA DE APIs ===\n');
    
  } catch (error) {
    console.error('❌ ERRO NA AUDITORIA DE APIs:', error);
    console.error('   O servidor está rodando? Execute: npm run dev');
    process.exit(1);
  }
}

main();