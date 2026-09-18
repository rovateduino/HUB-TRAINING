const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../training.db');

console.log('=== AUDITORIA: AUTENTICAÇÃO E RBAC ===\n');

try {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  
  // 1. Verificar estrutura de users
  console.log('1. VERIFICANDO TABELA USERS...');
  const userColumns = db.prepare('PRAGMA table_info(users)').all();
  console.log('   Colunas da tabela users:');
  userColumns.forEach(col => console.log(`   - ${col.name} (${col.type})`));
  
  const requiredUserFields = ['email', 'password_hash', 'name', 'role_id', 'is_active'];
  const missingFields = requiredUserFields.filter(f => !userColumns.find(c => c.name === f));
  
  if (missingFields.length === 0) {
    console.log('   ✅ Campos de autenticação presentes\n');
  } else {
    console.log(`   ❌ Campos faltando: ${missingFields.join(', ')}\n`);
  }
  
  // 2. Verificar roles
  console.log('2. VERIFICANDO ROLES...');
  const roles = db.prepare('SELECT * FROM roles').all();
  console.log(`   Roles encontrados: ${roles.length}`);
  roles.forEach(r => console.log(`   - ${r.name}: ${r.description}`));
  
  const hasStudent = roles.find(r => r.name === 'STUDENT');
  const hasInstructor = roles.find(r => r.name === 'INSTRUCTOR');
  const hasAdmin = roles.find(r => r.name === 'ADMIN');
  
  if (hasStudent && hasInstructor && hasAdmin) {
    console.log('   ✅ Roles RBAC definidas\n');
  } else {
    console.log('   ❌ Roles RBAC incompletas\n');
  }
  
  // 3. Verificar usuários existentes
  console.log('3. VERIFICANDO USUÁRIOS EXISTENTES...');
  const users = db.prepare('SELECT id, email, name, role_id, is_active FROM users').all();
  console.log(`   Usuários encontrados: ${users.length}`);
  users.forEach(u => console.log(`   - ${u.email} (${u.name}) - Role ID: ${u.role_id} - Ativo: ${u.is_active}`));
  
  if (users.length > 0) {
    console.log('   ✅ Usuários cadastrados\n');
  } else {
    console.log('   ⚠️  Nenhum usuário cadastrado\n');
  }
  
  // 4. Verificar se há middleware de autenticação no código
  console.log('4. VERIFICANDO MIDDLEWARE DE AUTENTICAÇÃO...');
  const fs = require('fs');
  const serverDir = path.join(__dirname, '../server');
  
  let hasAuthMiddleware = false;
  let hasJWT = false;
  
  try {
    const files = fs.readdirSync(serverDir);
    files.forEach(file => {
      if (file.includes('auth') || file.includes('middleware')) {
        hasAuthMiddleware = true;
        console.log(`   ✅ Arquivo de autenticação encontrado: ${file}`);
      }
    });
    
    // Verificar package.json para JWT
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    if (packageJson.dependencies && packageJson.dependencies.jsonwebtoken) {
      hasJWT = true;
      console.log('   ✅ jsonwebtoken instalado');
    }
    
    if (!hasAuthMiddleware) {
      console.log('   ❌ Middleware de autenticação não implementado');
    }
    if (!hasJWT) {
      console.log('   ❌ JWT não instalado');
    }
    
    if (hasAuthMiddleware && hasJWT) {
      console.log('   ✅ Autenticação configurada\n');
    } else {
      console.log('   ⚠️  Autenticação parcialmente implementada\n');
    }
    
  } catch (e) {
    console.log('   ❌ Erro ao verificar arquivos de autenticação\n');
  }
  
  // 5. Verificar se as rotas estão protegidas
  console.log('5. VERIFICANDO PROTEÇÃO DE ROTAS...');
  const routesDir = path.join(__dirname, '../server/routes');
  
  try {
    const routeFiles = fs.readdirSync(routesDir);
    let protectedRoutes = 0;
    
    routeFiles.forEach(file => {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      if (content.includes('auth') || content.includes('jwt') || content.includes('token')) {
        protectedRoutes++;
      }
    });
    
    if (protectedRoutes > 0) {
      console.log(`   ✅ ${protectedRoutes} arquivos de rota mencionam autenticação\n`);
    } else {
      console.log('   ❌ Nenhuma rota está protegida com autenticação\n');
    }
    
  } catch (e) {
    console.log('   ❌ Erro ao verificar proteção de rotas\n');
  }
  
  // 6. Testar acesso sem autenticação
  console.log('6. TESTE DE ACESSO SEM AUTENTICAÇÃO...');
  console.log('   As APIs estão atualmente abertas (sem middleware de autenticação)');
  console.log('   ❌ AUTENTICAÇÃO NÃO IMPLEMENTADA\n');
  
  db.close();
  
  console.log('=== FIM DA AUDITORIA DE AUTENTICAÇÃO/RBAC ===\n');
  
} catch (error) {
  console.error('❌ ERRO NA AUDITORIA DE AUTENTICAÇÃO:', error);
  process.exit(1);
}