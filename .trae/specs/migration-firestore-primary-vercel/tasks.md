# Migração Firestore Primária + Deploy Vercel - Implementation Plan

## Task 1: Setup Deploy Vercel (build.js + vercel.json + package.json engines)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar `build.js` na raiz: valida arquivos essenciais existem (`server/index.cjs`, `static/`, `home.html`, `dashboard.html`, `validar.html`), loga sucessos, exit 0 em sucesso. NÃO executa operações de runtime, não abre conexões DB. Usado por `npm run build` em package.json linha 8 (atualmente referenciado mas arquivo não existia → build quebrava no zero).
  - Criar `vercel.json` versão 2:
    - `builds[0]`: `{ src: "server/index.cjs", use: "@vercel/node", config: { includeFiles: ["static/**", "home.html", "dashboard.html", "validar.html", "robots.txt"] } }` (unificação: static assets via `express.static` dentro do index.cjs que já servia `app.use('/static', express.static)`, não precisa de segundo build separado)
    - `functions.server/index.cjs.maxDuration`: 60 segundos (quiz e certificates podem ser lentos em cold-start)
    - `routes`: 13 rewrites mapeando "/", "/dashboard", "/simulado", "/login", "/register", "/reset", "/admin", "/validar/*", "/health", "/api/*", "/(.*)" para `server/index.cjs`; "/static/(.*)" mapeado para file handler estático incluído no includeFiles.
    - `installCommand`: `npm install --no-audit --no-fund`; `buildCommand`: `npm run build`.
  - Adicionar em `package.json` field `"engines": { "node": ">=18.17.0" }` (compatibilidade Vercel current).
- **Acceptance Criteria Addressed**: FR-C1, FR-C2, FR-C3, AC-1 (parte build)
- **Test Requirements**:
  - `rule` TR-1.1: `node build.js` executa no root e retorna exit 0 (sem DB ou rede).
  - `rule` TR-1.2: `node --check build.js && validação parse JSON vercel.json` = sem syntax errors.
  - `rule` TR-1.3: `cat package.json | grep engines` → existe e inclui `node >=18`.
- **Completion Evidence**:
  - **TR-1.1 PASS**: `node build.js` stdout → "6/6 verificações OK", exit code 0. 6 itens validados: server/index.cjs, static/, home.html, dashboard.html, validar.html, package.json.
  - **TR-1.2 PASS**: `node --check build.js` sem erros; `JSON.parse(require('./vercel.json'))` = keys `$schema, version, builds, functions, routes, env, installCommand, buildCommand`; builds count = 1; routes count = 13.
  - **TR-1.3 PASS**: package.json engines field = `{"node": ">=18.17.0"}` validado via `require('./package.json').engines`.
  - Arquivos criados/editados:
    - [build.js](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/build.js)
    - [vercel.json](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/vercel.json)
    - [package.json](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/package.json#L5-L7)

---

## Task 2: Refatorar `services/firebase.cjs` — singleton robusto + parse `FIREBASE_PRIVATE_KEY` (JSON vs string)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Aprimorar `initFirebase()` em `[server/services/firebase.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/services/firebase.cjs)`.
  - **Resolver bug atual do env**: `FIREBASE_PRIVATE_KEY` pode ser JSON completo OU só a chave privada string. Implementar detecção: se `FIREBASE_PRIVATE_KEY` começar com `{` → JSON.parse, extrair campos `private_key`, `client_email`, `project_id`; senão usar como chave pura (comportamento esperado).
  - Exportar helpers adicionais: `getFirestore()` (retorna `admin.firestore()` já inicializado, lança erro se não inicializado), `getAuth()` (retorna `admin.auth()`), `getTimestampNow()` = `admin.firestore.FieldValue.serverTimestamp()`.
  - Suporte a `let db = null; let auth = null;` cache de instâncias após primeiro init.
  - Exportar também `increment(n)` helper para contadores sequenciais (usado em número de certificado), além de `arrayUnion()`, `arrayRemove()`, e `getResolvedProjectId()`.
  - NÃO remover os exports já existentes (`isFirebaseEnabled`, `isInitialized`, `getInitError`, `admin`, `getTimestamp`) para não quebrar referências usadas hoje no `index.cjs` e rotas.
  - Aplicar `ignoreUndefinedProperties: true` no Firestore settings (evitar erros de campos undefined em writes).
- **Acceptance Criteria Addressed**: FR-V1, NFR-1, NFR-7
- **Test Requirements**:
  - `rule` TR-2.1: `node --check server/services/firebase.cjs` = exit 0.
  - `rule` TR-2.2: initFirebase() com credenciais configuradas (separadas ou JSON) → exit 0, ok=true, sem throw.
  - `rule` TR-2.3: Mesmo teste mas com FIREBASE_PRIVATE_KEY sendo JSON completo do service account (como no .env atual) → parser interno extrai campos corretamente, init OK, exit 0.
- **Completion Evidence**:
  - **TR-2.1 PASS**: `node --check server/services/firebase.cjs` exit 0. Sintaxe OK.
  - **TR-2.2 + TR-2.3 PASS (válidas em teste único real com .env atual JSON completo)**:
    - `initFirebase()` = `{ok: true, error: null}`
    - `isInitialized()` = `true`
    - `getResolvedProjectId()` = `"hub-training-2200d"` (extraído corretamente do JSON da variável FIREBASE_PRIVATE_KEY)
    - `typeof getFirestore()` = `object` (instância Firestore válida)
    - Warning de retrocompatibilidade impresso no stdout durante init para formato JSON: `[FIREBASE] Detectado FIREBASE_PRIVATE_KEY como JSON completo...` (confirma detecção ativa)
  - Expõe 13 exports: admin, initFirebase, getFirestore, getAuth, getTimestamp, getTimestampNow, increment, arrayUnion, arrayRemove, getResolvedProjectId, isFirebaseEnabled, isInitialized, getInitError. Todos validados.
  - Arquivo editado: [server/services/firebase.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/services/firebase.cjs#L1-L182)

---

## Task 3: Criar Camada Repository Pattern — Módulo AuthRepo e base
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Criar pasta nova `server/repositories/`.
  - Criar `server/repositories/_base.cjs`: importa `{getFirestore, getTimestampNow, increment}` do `firebase.cjs`. Exporta `collection(name)`, `docRef(c, id)`, `parseDoc(doc)` (converte Firestore doc → plain JS com id field, converte Timestamp → ISO string para facilitar payload), `batch()`.
  - Criar `server/repositories/authRepo.cjs` (CommonJS, export funções nomeadas):
    - `findUserByEmail(email)` → where("email","==",email).limit(1).get() → parseDoc(single)
    - `findUserById(id)` → doc(id).get()
    - `createUser(userData)` → id = (userData.id ?? crypto random). doc(id).set(timestamps inseridos)
    - `updateUser(id, patch)` → doc(id).update(patch) + updatedAt
    - `listUsers(filters = {}, {page=1, pageSize=50} = {})` → where por role/is_active, orderBy created_at desc, limit + offset ou cursor pagination.
    - `incrementUserField(id, field, delta=1)` → FieldValue.increment
  - Observação: Repositories NÃO retornam instâncias DocumentSnapshot. Tudo é plain object parseado com id e Timestamps como ISO.
- **Acceptance Criteria Addressed**: FR-R1, FR-R2 (AuthRepo), AC-11
- **Test Requirements**:
  - `rule` TR-3.1: `node --check server/repositories/_base.cjs server/repositories/authRepo.cjs` = exit 0.
  - `rule` TR-3.2: `node -e "const r = require('./server/repositories/authRepo.cjs'); console.log(typeof r.findUserByEmail, typeof r.createUser)"` → functions existem, não undefined.
- **Completion Evidence**:
  - **TR-3.1 PASS**: `node --check server/repositories/_base.cjs` exit 0; `node --check server/repositories/authRepo.cjs` exit 0.
  - **TR-3.2 PASS**: Inspeção dos exports do authRepo: 10 funções exportadas `findUserByEmail, findUserById, createUser, updateUser, setUserActive, promoteUserRole, listUsers, incrementUserField, _stripSensitiveFields`. Todas `typeof === 'function'`.
  - **Runtime validation parciais (Firestore real)**:
    - `initFirebase()` ok=true, projeto `hub-training-2200d`.
    - `await findUserByEmail('naoexiste@teste.com')` → retorna `null` (sem throw, sem exception). ParseDoc funciona.
    - `await findUserById('id_inexistente_9999')` → retorna `null`.
  - **Obs [UNRESOLVED]**: `listUsers({role:'ADMIN'})` retorna `FAILED_PRECONDITION: índice requerido`. **Causa identificada e não bloqueia código**: arquivo `firebase/firestore.indexes.json` contém o índice composto `users.role ASC + created_at DESC` (linhas 60-67) porém NÃO foi publicado no ambiente remoto Firebase via `firebase deploy --only firestore:indexes`. Passo operacional documentado no Issue Log; código do repo está correto.
  - Design patterns aplicados:
    - `_stripSensitiveFields()` remove `password_hash`, `reset_token_hash`, `reset_token_expires_at` por padrão em todas queries. Incluí-los requer flag explícita `includeSensitive=true`.
    - `email` sempre normalizado `trim().toLowerCase()` em writes/reads (unicidade garantida por consistência).
    - Timestamps automáticos `created_at/updated_at` usando `serverTimestamp()` (FieldValue) em vez de cliente-new-Date.
  - Arquivos criados:
    - [_base.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/_base.cjs)
    - [authRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/authRepo.cjs)

---

## Task 4: Criar Demais Repositórios (Training, Progress, Checkpoint, Quiz, Admin, Certificate, Audit, Equipment, Practical)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - `trainingRepo.cjs`:
    - `listModules()`: orderBy order_num → array
    - `getModuleById(id)`: single doc
    - `listLessonsByModule(moduleId)`: where module_id == id, orderBy order_num
    - `getLessonById(id)`: single.
    - `appendLessonContent(id, htmlAppend, markerComment)`: idempotente — se já contém marker no content → retorna {skipped:true}. Senão transaction lê, concat, write.
    - `updateModuleDescription(id, newDesc)`
    - `getAllLessons()` (para seeds)
  - `progressRepo.cjs`:
    - `saveLessonProgress(userId, lessonId, data)`: docId = `${userId}_${lessonId}` → set merge (upsert). Unicidade garantida.
    - `getProgress(userId)`: where user_id == userId.
    - `getLessonProgress(userId, lessonId)`: doc direto.
  - `checkpointRepo.cjs`:
    - `getCheckpointsByLesson(lessonId)`: where lesson_id.
    - `getCheckpointOptions(checkpointId)`: where checkpoint_id. Opcionalmente NÃO trazer campo `is_correct` por padrão (método `getCheckpointOptionsWithCorrect` para ADMIN).
    - `saveCheckpointAnswer(userId, checkpointId, answer, isCorrect=null, lessonId=null)`.
    - `getMyAnswers(userId, lessonId)`: where user_id AND lesson_id.
  - `quizRepo.cjs`:
    - `listQuestions(count, shuffleSeed)`: limit count. Se shuffleSeed provido → sort cliente (Firestore não suporta order random) ou usar campo shuffle.
    - `getQuestionOptionsWithCorrect(questionId)`: traz is_correct (server-side).
    - `saveQuizAttempt(userId, payload)`: doc em `quiz_attempts`. Retorna attempt.
    - `saveQuizAnswer(attemptId, questionId, answer, isCorrect)`: subcollection `quiz_attempts/{id}/answers/{qid}` ou coleção flat. (Usar flat para manter mapeamento SQLite fácil.)
    - `getQuizAttempt(attemptId)`: single doc sem respostas corretas por padrão; método `getQuizAttemptFull` traz subcollection respostas + is_correct.
    - `getQuizAttemptsByUser(userId)`: where user_id orderBy created_at desc limit 20.
  - `adminRepo.cjs`:
    - Operações CRUD para `training_modules` (insert/update/delete), `training_lessons`, `lesson_checkpoints`, `checkpoint_options`, `questions`, `question_options`.
    - `promoteUserRole(userId, newRole)`: atualiza doc users role.
    - `setUserActive(userId, isActive)`.
    - `bulkImportContent(modules, lessons)` (para seeds).
    - `getAllUsersCsvFields()`: export users + roles + last login (para CSV).
    - Operações `practical_records` (CRUD aulas práticas).
    - Operações `equipment` + `equipment_relationships`.
  - `certificateRepo.cjs`:
    - `_getSequenceDoc()` → doc `sequences/certificates` com campo `next_num` inicializado por transaction se não existir.
    - `generateCertificateNumber(prefix = "CERT")`: transaction pega increment, garante unicidade.
    - `createCertificate(userId, data)`: doc certificates com number, created_at, dados do usuário, curso.
    - `getMyCertificates(userId)`: where user_id.
    - `getCertificateByNumber(number)`: where number == ??? limit 1 (campo number UNIQUE por transaction).
    - `markDownloaded(certId)`: update downloaded_at = now.
  - `auditRepo.cjs`:
    - `saveAuditLog(entry)`: cria doc com serverTimestamp, user_id, action, entity_type, entity_id, ip, metadata.
    - `listAuditLogs({user_id, entity_type, start_date, end_date, page, pageSize})`: filtros, orderBy.
  - `equipmentRepo.cjs` + `practicalRepo.cjs`: mapear funções usadas em `routes/equipment.cjs` e `routes/practical.cjs` (ler rotas para identificar operações necessárias).
- **Acceptance Criteria Addressed**: FR-R1, FR-R2, AC-11
- **Test Requirements**:
  - `rule` TR-4.1: `node --check server/repositories/*.cjs` = exit 0.
  - `rubric` TR-4.2: Qualidade isolamento; dimension AC-11 scale 1-5 threshold >=4. Evidence: grep routes ainda não refatorados — mas nessa task é só criar os arquivos, então evidence é inspeção visual de que arquivos `.cjs` de rota NÃO são modificados nesta task (modificam-se só repositories folder).
- **Completion Evidence**:
  - **TR-4.1 PASS**: `node --check` executado para os 9 arquivos NOVOS em paralelo = exit 0 (stdout final "ALL CHECKS DONE" sem SyntaxError):
    - trainingRepo.cjs, progressRepo.cjs, checkpointRepo.cjs, quizRepo.cjs, auditRepo.cjs, certificateRepo.cjs, adminRepo.cjs, equipmentRepo.cjs, practicalRepo.cjs.
  - **TR-4.2 PASS (threshold AC-11 = 4/5)**: Inspeção de diff = NENHUM arquivo dentro de `server/routes/*.cjs` foi criado/editado/removido nesta task; apenas `server/repositories/` sofreu alterações. Repositories NÃO importam `express`, NÃO tocam handlers HTTP, NÃO referenciam `better-sqlite3` ou `openDb`. Isolamento limpo.
  - **Smoke exports (9/9 repos carregados sem throw)**: Script temporário `scripts/_tmp_smoke_repos.cjs` executou `require()` para todos os 9 + firebase singleton e NÃO lançou exceção. Contagens de funções nomeadas validadas por typeof === 'function':
    - trainingRepo = 13 funções (listModules, getModuleById, listLessonsByModule, getLessonById, getAllLessons, updateModuleDescription, appendLessonContent, createModule, updateModule, deleteModule, createLesson, updateLesson, deleteLesson).
    - progressRepo = 6 funções (saveLessonProgress, getProgress, getLessonProgress, patchProgressById, deleteProgressById, countCompletedLessons).
    - checkpointRepo = 16 funções (getCheckpointsByLesson, getCheckpointById, getCheckpointOptions, getCheckpointOptionsWithCorrect, getCheckpointsWithOptionsByLesson, getOptionById, saveCheckpointAnswer, hasAnswered, getMyAnswers, countAnsweredCheckpoints, createCheckpoint, updateCheckpoint, deleteCheckpoint, createOption, updateOption, deleteOption).
    - quizRepo = 21 funções (+ CONST implicit). Inclui listQuestionsFull, listAttemptsAdmin, deleteAttemptAndAnswers, createQuestion, deleteQuestionOption etc.
    - auditRepo = 4 funções (saveAuditLog, listByUserId, listByEntity, listAll).
    - certificateRepo = 10 funções (generateCertificateNumber com transaction fallback, createCertificate, getCertificateById, getMyCertificates, getCertificateByNumber, getValidCertificateByUser, markDownloaded, revokeCertificate, countByUser, hasIssuedFor).
    - adminRepo = 21 funções (promoteUserRole, setUserActive, getAllUsersCsvFields, bulkImportContent, invite_tokens 6 ops, reset_tokens 2 ops, practical_evaluations 3 ops, getDashboardCounts, 4 deleteXxxById, hardDeleteUser, listAllEquipmentAdmin). Re-usa authRepo/trainingRepo/quizRepo helpers para evitar duplicidade e manter consistência.
    - equipmentRepo = 14 funções (listAllEquipment withTypes JOIN implícito, getEquipmentById, listEquipmentTypes, listRelationships JOIN nomes, getTopologyGraph, CRUD types/equipment/relationships = 9 CRUDs).
    - practicalRepo = 10 funções + 2 CONSTs (CRITERIA, RESULTS) + isTheoryApproved/getTheorySnapshot helpers integrados com quizRepo.
  - Design patterns replicados do authRepo (Task3) EM TODOS repos:
    - `_coerceInt()`: compatibilidade Integer SQLite original → docId String Firestore (queries where preservam igualdade tipo numérico e string).
    - Timestamp `created_at / updated_at` sempre via `now()` = FieldValue.serverTimestamp() (client-time NÃO em writes principais).
    - Todos parseDoc/parseDocs através do `_base.cjs`: Timestamps → ISO 8601 recursivo (profundidade 8, arrays, objetos aninhados).
    - Funções nomeadas exports. Nenhuma classe. Nenhum `new Repository()`.
    - Fallback try/catch para queries onde índice composto pode não estar publicado ainda: fallback para full-collection scan + filter cliente-side (warning implícito, mas não quebra as rotas na primeira execução).
  - **Aprimoramentos não previstos mas sem risco (KISS/YAGNI)**:
    - Checkpoint answer `docId = ${userId}_${checkpointId}` garante unicidade uma-resposta-sem-alterar (regra checkpoints submeter travado em 409) sem precisar de transaction.
    - Progress `docId = ${userId}_${lessonId}`: upserts idempotentes, sem necessidade query prévia para detectar existente — menos 1 roundtrip.
    - Quiz answers `${attemptId}_${questionId}`: mapeamento flat, fácil join no getQuizAttemptFull.
  - Arquivos criados:
    - [trainingRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/trainingRepo.cjs)
    - [progressRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/progressRepo.cjs)
    - [checkpointRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/checkpointRepo.cjs)
    - [quizRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/quizRepo.cjs)
    - [auditRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/auditRepo.cjs)
    - [certificateRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/certificateRepo.cjs)
    - [adminRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/adminRepo.cjs)
    - [equipmentRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/equipmentRepo.cjs)
    - [practicalRepo.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/repositories/practicalRepo.cjs)

---

## Task 5: Refatorar Middleware `server/middleware/auth.cjs` → usa AuthRepo
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Remover `require('better-sqlite3')`, remover `openDb` import, remover `const u = db.prepare(SELECT * FROM users WHERE id = ?).get(sub)`.
  - Substituir por `const { findUserById } = require('../repositories/authRepo.cjs');`. Promise-based → middleware vira `async (req, res, next) => {` + try/catch.
  - `is_active` check intacto (se user.is_active === false → 401 INACTIVE_ACCOUNT).
  - `req.user` shape: `{id: doc.id, email, name, role, is_active}` — MESMO shape de antes para não quebrar rotas.
  - `requireRole(...roles)`: mantém comportamento, síncrono (não precisa DB).
  - `requireSelfOrAdmin(getUserIdFromReqParam)`: mantém lógica, síncrono.
  - `PASSWORD_RESET_TOKENS` (se existir reset): hoje pode ser Map em memória. Aceitável MVP (com WARNING). Para permanência, usar Firestore coleção `password_reset_tokens`, mas por simplicidade manter Map (trade-off: tokens de reset são perdidos em cold-start; comunicar no startup warning).
- **Acceptance Criteria Addressed**: FR-M1, FR-M2, AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-5.1: `node --check server/middleware/auth.cjs` = exit 0.
  - `rule` TR-5.2: Mock firebase offline? Senão: `grep "better-sqlite3\|openDb\|db.prepare" server/middleware/auth.cjs` = 0 matches.
  - `rule` TR-5.3: Token ausente → 401; token malformado → 401; user não encontrado → 401; user inativo → 401; user válido → next(). (Usar mock em testes se possível, ou smoke test manual.)
- **Completion Evidence**:
  - **TR-5.1 PASS**: `node --check server/middleware/auth.cjs` exit 0.
  - **TR-5.2 PASS**: grep `better-sqlite3|openDb|db.prepare` em `server/middleware/auth.cjs` = 0 matches. `openDb`/`getRoleName` removidos (nenhum consumidor ativo restante exceto `firestoreSync.cjs` deprecated, escopo Task 12).
  - **TR-5.3 PASS (11/11, Firestore real `hub-training-2200d`)**: token ausente → 401, malformado → 401 `TOKEN_INVALID`, inexistente → 401, inativo → 401 `INACTIVE_ACCOUNT`, válido → `next()` com shape exato `{id,email,name,role,is_active}` sem `password_hash`; `requireRole`/`requireSelfOrAdmin` síncronos OK. Docs temporários removidos.
  - Decisão: `role_id` removido do `req.user` (grep provou que nenhuma rota lia `req.user.role_id`, só queries SQLite das Tasks 6+). Arquivo: `server/middleware/auth.cjs` (68 → 51 linhas).

---

## Task 6: Refatorar `routes/auth.cjs` — Registro/Login/Me/Reset usando AuthRepo + AuditRepo
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Remover `openDb` / better-sqlite3 / SELECT / INSERT SQLite. Trocar por AuthRepo.
  - `POST /api/auth/register`:
    - Validações mesmo contrato (400 se sem email/password/name, password >= 6).
    - Check email duplicado: `await findUserByEmail(email)`, se existir → 409 já cadastrado.
    - `bcrypt.hash(password, 10)` → password_hash.
    - `createUser({email, name, password_hash, role: 'STUDENT', is_active: true})`.
    - `saveAuditLog({action:'REGISTER', entity_type:'USER', entity_id: userId, user_id: userId, metadata})`.
    - Resposta 201: `{id, email, name}`.
  - `POST /api/auth/login`:
    - `findUserByEmail`. 401 se não encontrado ou is_active=false.
    - `bcrypt.compare(senhaDigitada, user.password_hash)`.
    - `jwt.sign({sub:user.id, email:user.email, role:user.role, name:user.name}, JWT_SECRET, {expiresIn})`.
    - Auditoria LOGIN_SUCESSO / LOGIN_FALHA.
    - Resposta idêntica: `{token, expiresIn, user:{id,email,name,role}}`.
  - `GET /api/auth/me`: retorna `{...req.user}` (pode omitir password_hash — garantir que AuthRepo não traz password_hash no parseDoc).
  - `POST /api/auth/logout`: auditoria LOGOUT. 204.
  - `POST /api/auth/reset`: mockar ou gerar token. Salvar token no user doc `reset_token_hash`. Retornar link com token no payload (mesmo comportamento mock atual sem SMTP).
  - `POST /api/auth/reset/confirm`: se token válido, bcrypt nova senha + updateUser com novo hash. Limpar reset_token.
- **Acceptance Criteria Addressed**: FR-A1, AC-2, AC-1 (rotas auth), AC-9 (audit)
- **Test Requirements**:
  - `rule` TR-6.1: `node --check server/routes/auth.cjs` = exit 0.
  - `rule` TR-6.2: `grep "openDb\|better-sqlite3" server/routes/auth.cjs` = 0 matches.
  - `rule` TR-6.3: Smoke test com curl: register → 201, duplicate → 409, login → 200 + token, me → user payload (0 password_hash).
- **Completion Evidence**:
  - **TR-6.1 PASS**: `node --check` em `routes/auth.cjs` e `repositories/adminRepo.cjs`.
  - **TR-6.2 PASS**: grep `openDb|better-sqlite3|db.prepare|firestoreSync|syncUserUpsert|syncAuditLog` em `routes/auth.cjs` = 0 matches.
  - **TR-6.3 PASS (13/13 E2E, servidor real :5001 + Firestore)**: register 201 → duplicado 409 → sem-invite 400 → login 200 + JWT → senha errada 401 → me 200 sem `password_hash` → reset/request 200 + token → email inexistente 200 genérico → reset/confirm 200 → reuso 400 → login nova senha 200 → logout 204. Cleanup total, temporários removidos.
  - Extensão `adminRepo`: `countActiveResetTokens` + `consumeResetToken` (schema Firestore `{token,user_id,expires_at,used,consumed_at}`).
  - Desvios conscientes (contrato auditado prevalece sobre texto da task): `invite_token` segue obrigatório (README/spec FR-2/`register.html`); auditoria mantém `USER_REGISTER/LOGIN/LOGOUT/PASSWORD_RESET_*` (+`LOGIN_FALHA` aditivo pedido na task); `GET /me` mantém `{user}` (`admin.html:362` lê `r.user.role`); reset mantém paths reais `/reset/request|/confirm`.

---

## Task 7: Refatorar `routes/dashboard.cjs` + `routes/progress.cjs` + `routes/training.cjs` + `routes/checkpoints.cjs`
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 6
- **Description**:
  - **dashboard.cjs**: Leitura agregadas de progresso (% lições concluídas por usuário), últimas tentativas quiz, total de certificados, total de usuários (para ADMIN). Usar ProgressRepo.list/query + QuizRepo + CertificateRepo.
  - **progress.cjs**:
    - `GET /api/progress` → `ProgressRepo.getProgress(req.user.id)`.
    - `GET /api/progress/:lessonId` → single progresso por lição.
    - `POST /api/progress/:lessonId` → upsert `saveLessonProgress` com status COMPLETED, IN_PROGRESS, completed_at opcional, porcentagem.
    - `PATCH /api/progress/:lessonId` → parcial updates.
    - Auditoria: LESSON_COMPLETED quando status==="COMPLETED".
  - **training.cjs**:
    - `GET /api/training/modules` → `TrainingRepo.listModules()`.
    - `GET /api/training/modules/:id` → getModuleById + listLessonsByModule agregado opcional.
    - `GET /api/training/lessons/:id` → getLessonById. Manter checkpoints dentro da resposta? Ou separado (rota /checkpoints/by-lesson?).
    - `POST /api/training/lessons/:id/complete` → audit LESSON_VIEWED / COMPLETO.
    - `PENDING_TECHNICAL_VALIDATION` preservado no campo status quando módulo/lição novo.
  - **checkpoints.cjs**:
    - `GET /lessons/:id/checkpoints` → getCheckpoints + Options (STUDENT: sem is_correct; ADMIN: com is_correct via ADMIN repo).
    - `GET /my-answers/:lessonId` → `CheckpointRepo.getMyAnswers(userId, lessonId)`.
    - `POST /:checkpointId/submit` → calcular is_correct (lê options com repo ADMIN internamente, valida). Salvar resposta. Retornar acerto para o aluno? (comportamento original mantido). Gabarito global NÃO é retornado, apenas acerto daquela resposta individual (feedback).
- **Acceptance Criteria Addressed**: FR-A3, FR-A4, FR-A5, AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-7.1: `node --check server/routes/dashboard.cjs server/routes/progress.cjs server/routes/training.cjs server/routes/checkpoints.cjs` = exit 0.
  - `rule` TR-7.2: `grep "openDb\|better-sqlite3" 4 arquivos` = 0 matches.
  - `rule` TR-7.3: `GET /api/training/modules` retorna array length > 0 (se migrados os dados) ou 0 (se vazio), mas HTTP 200 sem erro 500.
- **Completion Evidence**:
  - **TR-7.1 PASS**: `node --check` nos 4 arquivos + `progressRepo` (novo `getProgressById`).
  - **TR-7.2 PASS**: grep SQL/Sync nos 4 arquivos = 0 matches.
  - **TR-7.3 PASS (25/25 E2E com fixtures `t7*`)**: modules 200 → module detail (lessons **sem `content`**) → lesson 200/404 → checkpoints 2 endpoints **sem `is_correct`** → my-answers [] → submit errada `correct:false` → certa `correct:true` → resubmit 409 locked → sem-option 400 → option-alheia 404 → my-answers shape `{checkpoint_id,selected_option_id}` → progress criado/atualizado/COMPLETED (+`completed_at`) → titles joined → PATCH ok/404 → complete (`lesson_id` string preservado) → dashboard 401 sem token → indicadores + módulo COMPLETED 100 + `next_step`. Cleanup total.
  - Incidente trial-and-error documentado: primeiro smoke atingiu servidor stale (código SQLite, 17 módulos) — a partir da Task 7 todo smoke valida PID listener via `netstat` antes de rodar.
  - Achado estrutural: queries `where+orderBy` sem índice composto publicado lançam `FAILED_PRECONDITION` → fallbacks client-side adicionados a `listLessonsByModule`, `getCheckpointsByLesson`, `getCheckpointOptions(/WithCorrect)` (padrão já usado nos demais repos). GETs de checkpoint seguem públicos, sem variante ADMIN (exigir auth quebraria as páginas; gabarito admin via CRUD Task 9).

---

## Task 8: Refatorar `routes/quiz.cjs` — PASS_SCORE=23 inalterado, filtro role-based gabarito
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 7
- **Description**:
  - **Linha `const PASS_SCORE = 23;` PRESERVADA literalmente (const number não parametrizar, não mover)**.
  - `GET /api/quiz/questions`:
    - `QuizRepo.listQuestions(30)` (se count default = 30).
    - STUDENT → options sem `is_correct` (strip no server antes de enviar).
    - ADMIN → options com `is_correct` (rota mesmo, mas req.user.role == ADMIN traz completo).
  - `POST /api/quiz/submit`:
    - Para cada pergunta respondida → carregar gabarito via `getQuestionOptionsWithCorrect` interno.
    - Calcular score = contagem de acertos.
    - `passed = score >= PASS_SCORE`.
    - `saveQuizAttempt` doc com user_id, score, total=30, passed, duration, created_at.
    - Salvar cada answer individual via `saveQuizAnswer`.
    - Auditoria QUIZ_SUBMIT (entity_type QUIZ_ATTEMPT).
    - Resposta POST submit: STUDENT → `{attempt_id, score: <OMITIDO?>, result: passed ? "APROVADO" : "NÃO APROVADO"}` — (manter comportamento original exato).
  - `GET /api/quiz/attempt/:id`:
    - Carregar `getQuizAttempt(attemptId)` básico.
    - Se STUDENT → checar se attempt.user_id === req.user.id ou req.user.role ADMIN para bloquear IDOR.
    - Se STUDENT → retornar APENAS `{attempt_id, result: passed?APROVADO:NAO_APROVADO}`. NÃO enviar score, NÃO enviar answers array, NÃO enviar is_correct de nenhuma forma.
    - Se ADMIN → `getQuizAttemptFull` com payload completo, answers + gabarito + score.
  - `GET /api/quiz/attempts`: minhas últimas tentativas (STUDENT) ou todas (ADMIN paginado).
- **Acceptance Criteria Addressed**: FR-A6, AC-3
- **Test Requirements**:
  - `rule` TR-8.1: `node --check server/routes/quiz.cjs` = exit 0.
  - `rule` TR-8.2: `grep "PASS_SCORE\s*=\s*23" server/routes/quiz.cjs` = 1 match literal (linha não removida, não mudou número).
  - `rule` TR-8.3: Smoke com mock: role STUDENT GET attempt/:id → JSON keys = `['attempt_id','result']` somente. `typeof json.score === 'undefined'`.
  - `rule` TR-8.4: submit com 22 → `result = NÃO APROVADO`; 23+ → `APROVADO`.
- **Completion Evidence**:
  - **TR-8.1 PASS**: `node --check` em `routes/quiz.cjs` + `quizRepo`.
  - **TR-8.2 PASS**: grep `PASS_SCORE\s*=\s*23` = 1 match literal (`const PASS_SCORE = 23;`, linha 17).
  - **TR-8.3 PASS**: STUDENT `my-attempt/:id` → keys exatas `[attempt_id,result]`, sem `score`.
  - **TR-8.4 PASS (14/14 E2E, 30 questões × 4 opções rotativas)**: questions STUDENT 30 itens sem `is_correct` / ADMIN com / sem-token 401 → submit 29/30 → 400 → 22 → NÃO APROVADO (sem score, `attempt_number:1, remaining:2`) → IDOR 403 → 25 → APROVADO → pós-aprovação 403 → my-attempts/attempts shapes → ADMIN attempts paginado + full (score 22, 30 answers) → 404.
  - **Bug real corrigido no `quizRepo`**: `deleteAttemptAndAnswers` chamava `batch()` não importado (quebraria deletes, incluindo admin Task 9) — import adicionado; fallback `listQuestions`/`_getQuestionOptions` idem Task 7.
  - Novo `GET /api/quiz/attempts` (STUDENT = próprio resumo; ADMIN = `listAttemptsAdmin` paginado). Contratos `dashboard.js` (submit/my-attempts/questions) preservados byte a byte.

---

## Task 9: Refatorar `routes/admin.cjs` (25+ endpoints, maior arquivo) — 100% com AdminRepo
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 8
- **Description**:
  - Ler cada rota individualmente no admin.cjs original. Identificar se operação é CRUD sobre: `users, training_modules, training_lessons, lesson_checkpoints, checkpoint_options, questions, question_options, practical_records, equipment, audit`.
  - Mapear 1:1 com funções do `adminRepo.cjs` (criar funções faltantes no AdminRepo se Task 4 não cobriu, estender AdminRepo nesta task).
  - **Promover ADMIN**: `POST /api/admin/users/:id/promote` → `AdminRepo.promoteUserRole(id, 'ADMIN')` + auditoria PROMOTE_ADMIN + warning startup se viração não tem proteção.
  - **Bloquear usuário**: `PATCH /api/admin/users/:id/active?is_active=false` → `setUserActive(id, false)`.
  - **Delete lição / módulo / pergunta**: delete docs Firestore (com soft-delete opcional campo deleted_at. Default = hard-delete igual SQLite original).
  - **CSV exports de usuários, tentativas, práticas**: gerar CSV UTF-8 BOM, ponto-e-vírgula (mesmo formato original, preservar compatibilidade Excel).
  - **Dashboard ADMIN counts**: queries agregadas.
  - **Atualizar descrição do módulo**: usar função TrainingRepo.updateModuleDescription ou AdminRepo equivalente.
  - **Observação**: Se qualquer operação do admin.cjs original não couber em AdminRepo definido no Task 4, ESTENDER AdminRepo nesta task (não inline no routes). Manter regra: routes não chamam `db.collection` inline.
- **Acceptance Criteria Addressed**: FR-A2, AC-3 (promote), AC-11
- **Test Requirements**:
  - `rule` TR-9.1: `node --check server/routes/admin.cjs server/repositories/adminRepo.cjs` = exit 0.
  - `rule` TR-9.2: `grep "openDb\|better-sqlite3\|db.prepare" server/routes/admin.cjs` = 0 matches.
  - `rule` TR-9.3: Smoke: ADMIN token válido GET `/api/admin/users` → HTTP 200 + array. STUDENT token → 403.
- **Completion Evidence**:
  - **TR-9.1 PASS**: `node --check` em `routes/admin.cjs` + `adminRepo` (+ `certificateRepo`, `quizRepo`, `checkpointRepo` estendidos).
  - **TR-9.2 PASS**: grep SQL/Sync em `routes/admin.cjs` = 0 matches.
  - **TR-9.3 PASS (33/33 E2E)**: users 403/401/200, dashboard counts, promote/demote/inválido (STUDENT 403), deactivate→login 401→reactivate, auto-desativação 400, invites ciclo completo (201→revoke→re-revoke→delete→404), reset-token 201, reset-attempts, workload/settings get+put, certificates, pipeline (roda `getTrainingStatus`, shape de keys **idêntico ao original**), issue 403/400, deletes 404/400/ok. LEFTOVERS ZERO.
  - Extensões: `deleteInviteToken(s)`, `certificate_settings`/`module_workload`, `getTrainingStatus` (port fiel incl. state machine + `approved` exige 30 answers), `hardDeleteUser` com cascata completa, `deleteAttemptsByUser` (quiz), `extra` em `saveCheckpointAnswer` (by_admin), `generateYearlyCertificateNumber` (`HUB-AAAA-000001` transacional), `listAllCertificates`.
  - Novos endpoints da task: `POST /users/:id/promote` (allowlist, audit `PROMOTE_ADMIN`), `PATCH /users/:id/active` (trava auto-desativação). Sem CSV: nenhum endpoint CSV existia (não inventado). IDs: validação numérica → `cleanId()` (ids Firestore são strings).

---

## Task 10: Refatorar Rotas `certificates.cjs`, `practical.cjs`, `audit.cjs`, `equipment.cjs`, `images.cjs`
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 9
- **Description**:
  - **certificates.cjs**:
    - `POST /api/certificates/issue` (ou similar original): valida aprovação simulado e curso concluído. `generateCertificateNumber()` com transaction Firestore increment. `createCertificate`. 201 com dados certificado.
    - `GET /api/certificates/mine` → `getMyCertificates(userId)`.
    - `GET /api/certificates/validate/:number` → pública sem login → `getCertificateByNumber`. 200 com dados, 404 se não existir.
    - `PATCH /api/certificates/:id/downloaded` → `markDownloaded`.
    - Duplicata proibida: mesmo usuário já emitiu certificado para mesmo curso → 409.
  - **practical.cjs**: mapear para PracticalRepo criado Task 4. Se faltarem funções no repo → estender.
  - **audit.cjs**:
    - `GET /api/audit` (ADMIN) → filtros.
    - `GET /api/audit/user/:uid` (ADMIN ou self) → logs de user específico.
    - `GET /api/audit/entity/:type/:id` → logs por entidade específica.
  - **equipment.cjs**:
    - `GET /api/equipment` → lista equipamentos + tipos.
    - `GET /api/equipment/relationships` → relações.
    - `GET /api/equipment/topology` → grafo topologia (gerado ou pré-computado).
  - **images.cjs**: se hoje rota é puramente upload para /static ou base64 em algum campo no SQLite, refatorar para salvar base64 em Firestore (campo string) ou mover assets para /static. Se independente de BD (já só serve arquivos do static), manter 0 alterações.
- **Acceptance Criteria Addressed**: FR-A7, FR-A9, FR-A10, FR-A11, FR-A12, AC-8, AC-9
- **Test Requirements**:
  - `rule` TR-10.1: `node --check server/routes/certificates.cjs practical.cjs audit.cjs equipment.cjs images.cjs` = exit 0.
  - `rule` TR-10.2: grep "openDb/better-sqlite3" nos 5 arquivos → 0 matches.
  - `rule` TR-10.3: Certificado emitido com número CERT-NNNN; tentativa duplamente emitida → 409. Validação número funciona sem login.
- **Completion Evidence**:
  - **TR-10.1 PASS**: `node --check` nos 5 arquivos + novo `imagesRepo.cjs`.
  - **TR-10.2 PASS**: grep SQL/Sync nos 5 arquivos = 0 matches.
  - **TR-10.3 PASS (26/26 E2E, pipeline completo real)**: practical 403/422/400 → quiz 25 APROVADO → practical APTO 201 → overview/pending/mine/user → `cert/my` READY → issue 201 `HUB-2026-000002` (sequência transacional monotônica) → duplicado **409** → validate público 200 VALID (+404) → `cert/my` com QR → `my/downloaded` + `PATCH downloaded` → admin preview com QR → audit self/admin-403/entity → equipment ×3 + images 200. LEFTOVERS ZERO, porta livre.
  - Correção TR: duplicado retornava 403 (ordem original checava status antes do existente) → checagem de certificado existente movida para antes do gate (409 em todos os casos).
  - `technical_images` = só metadados de arquivos static (1 row: `fluxograma.jpg`) → novo `imagesRepo` (com `data_base64` opcional p/ legado). **Não consta nas 20 tabelas da Task 13 — incluir na migração.**
  - `GET /my` usa `adminRepo.getTrainingStatus` com `stripStatus` (remove `_best` interno do contrato).

---

## Task 11: Ajustes `index.cjs` — Remover firestoreSync stateful, ajustar rotas Firebase stub, melhorar logs startup
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 10
- **Description**:
  - **Remover import `{ runFullBulkSync, flushQueue }` de firestoreSync.cjs** no topo do index.cjs. Remover referência em shutdown graceful (agora não há mais fila para flush).
  - **Rota `POST /api/firebase/bulk-sync`** → tornar stub NO-OP: responde `{ok:true, deprecated:true, message:"Firestore é fonte primária. Nada a sincronizar. Operação removida."}` com HTTP 200. Não chamar runFullBulkSync mais.
  - **Rota `GET /api/firebase/status`** → agora retorna `{initialized, project_id, queue_size:0, deprecated_dual_write:true, primary_store:"firestore"}`. Acesso ao SYNC_QUEUE removido.
  - **Startup logs**: Melhorar. Exibir (em ordem):
    - Banner ambiente, porta, health url.
    - Firebase project_id + status "FONTE PRIMÁRIA ATIVA" (não mais dual-write).
    - WARNING se JWT_SECRET default (igual hoje, mas destaque colorido).
    - WARNING novo: "Rate limit = MemoryStore (NÃO compartilhado entre Vercel Functions). Aceitável MVP. Para produção distribuída, implementar Upstash Redis em fase posterior."
    - WARNING se rate limit, ou informativo.
  - **Firebase init**: setTimeout removido? Não, manter assíncrono não bloqueante. Mas mensagem mudar de "escrita dual-write" para "inicializado como fonte primária".
  - **Graceful Shutdown**: Simplificar: não flushQueue mais. Apenas encerrar após log.
- **Acceptance Criteria Addressed**: FR-S1, FR-S2, FR-A13, AC-13
- **Test Requirements**:
  - `rule` TR-11.1: `node --check server/index.cjs server/services/firestoreSync.cjs` = exit 0.
  - `rule` TR-11.2: `grep "flushQueue\|runFullBulkSync\|SYNC_QUEUE" server/index.cjs` = 0 matches.
  - `rubric` TR-11.3: Startup logs clarity; dimension AC-13, scale 1-5, threshold >= 4. Evidence: `npm start` stdout mostrar avisos claros para default JWT e MemoryStore rate limit, banner Firebase como primária.
- **Completion Evidence**:
  - **TR-11.1 PASS**: `node --check server/index.cjs` exit 0; `node --check server/services/firestoreSync.cjs` exit 0.
  - **TR-11.2 PASS**: grep `flushQueue|runFullBulkSync|SYNC_QUEUE` em `server/index.cjs` = 0 matches (rg retornou vazio). Import do firestoreSync.cjs removido completamente das linhas 1-10.
  - **TR-11.3 PASS (score 5/5, threshold >= 4)**: `npm start` stdout (PORT=5101) mostra, em ordem:
    1. Banner colorido ciano: `🚀 HUB TRAINING — SERVIDOR INICIADO` com moldura.
    2. Porta 5101, Ambiente development, Health URL, API, Home, Dashboard.
    3. Firebase project_id `hub-training-2200d`, Primary = Firestore (SQLite removido do runtime).
    4. `[FIREBASE] FONTE PRIMÁRIA ATIVA — Firestore` verde.
    5. STDERR WARNING amarelo: JWT_SECRET DEFAULT (crítico).
    6. STDERR WARNING amarelo: Rate limit MemoryStore (MVP, Upstash Redis posterior).
    Shutdown também simplificado: sem flushQueue, apenas timeout 300ms + log.
  - Arquivos editados:
    - [server/index.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/index.cjs)

---

## Task 12: Transformar `firestoreSync.cjs` em stubs NO-OP (deprecated) e remover `SYNC_QUEUE` stateful
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 11 (conceitualmente paralelo, mas menor risco depois)
- **Description**:
  - `server/services/firestoreSync.cjs`:
    - Substituir SYNC_QUEUE array = `[]` mas comentar "deprecated".
    - `enqueueFirestoreOp()` → stub: log warning deprecation uma vez e return `Promise.resolve()`. NÃO enfileira nada.
    - `processQueue()` → stub: return Promise.resolve().
    - `flushQueue()` → stub: return Promise.resolve().
    - `runFullBulkSync()` → stub: `return Promise.resolve({ok:true, deprecated:true, skipped_all:true})`.
    - Manter exports por compatibilidade com código que porventura ainda importa. Mas logs warning na 1a chamada.
  - NÃO deletar arquivo ainda (mantido para não quebrar requires acidentais). Em limpeza final Task 16 opcionalmente remover.
- **Acceptance Criteria Addressed**: FR-S1
- **Test Requirements**:
  - `rule` TR-12.1: `node --check server/services/firestoreSync.cjs` = exit 0.
  - `rule` TR-12.2: Chamar funções exportadas em node -e → NÃO lança exceções. Todas retornam Promise ou undefined.
- **Completion Evidence**:
  - **TR-12.1 PASS**: `node --check server/services/firestoreSync.cjs` exit 0. Sintaxe OK.
  - **TR-12.2 PASS (18/18 exports validados, 0 throws)**:
    - `require()` carrega sem throw. 18 funções/const exports validadas `typeof !== 'undefined'`: SYNC_QUEUE, enqueue, enqueueFirestoreOp, processQueue, flushQueue, canSync, safeDocId, syncUserUpsert, syncUserSoftDelete, syncUserHardDelete, syncLessonProgressUpsert, syncQuizAttemptUpsert, syncQuizAttemptDelete, syncCheckpointAnswerUpsert, syncAuditLog, syncTrainingModuleUpsert, syncTrainingLessonUpsert, runFullBulkSync.
    - Chamadas: `flushQueue()` → Promise.resolve; `processQueue()` → Promise.resolve; `runFullBulkSync()` → `{ok:true,deprecated:true,skipped_all:true,message:"Firestore é fonte primária..."}`; `canSync()` → `false`; `SYNC_QUEUE.length` → 0; `syncUserUpsert({id:1})` → undefined (sem throw).
    - Primeira chamada emite WARNING amarelo `[FIRESTORE_SYNC] ⚠  DEPRECATED: ...` único (warnOnce).
  - Arquivo editado:
    - [server/services/firestoreSync.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/server/services/firestoreSync.cjs)

---

## Task 13: Criar Script Migração 1-shot SQLite → Firestore (ZIP backup + batches + idempotente + validação counts)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 4 (repositories existem; opcionalmente pode usar melhor o SDK direto para velocidade)
- **Description**:
  - Criar `scripts/migrate_sqlite_to_firestore.cjs`.
  - **Dependência permitida**: `require('better-sqlite3')` apenas neste script (não no runtime). Se package desinstalado, instalar temporariamente ou criar fallback.
  - **Passo 0 — Flags**: usar `process.argv` para `--dry-run`, `--force`, `--tables t1,t2`, `--skip-backup`.
  - **Passo 1 — Backup ZIP**:
    - Dep: `npm install archiver --no-save` (temporário para gerar zip) ou usar pacote existente. NÃO adicionar ao package.json a menos que já exista. Se archiver não disponível, fallback para JSON simples em `backup-pre-migracao-XXX.json` sem compressão.
    - Ler TODAS tabelas → objeto `{users:[...], roles:[...], audit_logs:[...]}` → gravar ZIP ou JSON na raiz.
  - **Passo 2 — Ordem gravação respeitando FK**:
    1. `roles` → 2. `users` → 3. `permissions` → 4. `equipment_types` → 5. `technical_equipment` → 6. `equipment_relationships` → 7. `training_modules` → 8. `training_lessons` → 9. `lesson_checkpoints` → 10. `checkpoint_options` → 11. `questions` → 12. `question_options` → 13. `lesson_progress` → 14. `checkpoint_answers` → 15. `quiz_attempts` → 16. `quiz_answers` → 17. `audit_logs` → 18. `practical_records` → 19. `certificates` → 20. `content_versions`.
  - **Passo 3 — Batch 500**:
    - Para cada tabela > 500 rows → chunk em batches.
    - DocId = `String(row.id)` (integer → string).
    - Para cada row: conversão Timestamp SQLite → Firestore Date/ISO. Converter tipos (INT → number, TEXT → string, BOOLEAN 0/1 → boolean).
  - **Passo 4 — Idempotência**:
    - Para cada docId: `const ref = col.doc(id); const snap = await ref.get();`
    - Se `snap.exists && !flags.force` → log `[SKIP] ${table}/${id}` (não sobrescreve).
    - Senão → `batch.set(ref, row, {merge: flags.force ? false : true})`. Commit a cada 500.
  - **Passo 5 — Validação FINAL counts**:
    - Após gravação completa, loop tabelas:
    ```
    count_sql = db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();
    count_fs = (await col.count().get()).data().count;
    diff = count_sql - count_fs;
    console.log(`${table}: sqlite=${count_sql} firestore=${count_fs} diff=${diff} ${diff==0?'✅':'❌'}`);
    ```
    - Se QUALQUER tabela diff != 0 → `process.exit(1)`.
    - Senão → log verde "MIGRAÇÃO OK: counts 1:1" → exit 0.
- **Acceptance Criteria Addressed**: FR-MG1..FR-MG6, AC-6
- **Test Requirements**:
  - `rule` TR-13.1: `node --check scripts/migrate_sqlite_to_firestore.cjs` = exit 0.
  - `rule` TR-13.2: `--dry-run` não escreve, não cria backup se skip? Não: default backup criado. Dry run = só log counts.
  - `rule` TR-13.3: Rodar com `--force` em training.db existente → exit code 0 com "MIGRAÇÃO OK". Rodar SEM force novamente → 100% SKIPs, exit 0.
- **Completion Evidence**:
  - **TR-13.1 PASS**: `node --check scripts/migrate_sqlite_to_firestore.cjs` exit 0.
  - **TR-13.2 PASS**: `node scripts/migrate_sqlite_to_firestore.cjs --dry-run --tables roles,equipment_types` → exit 0. stdout "[DRY-RUN] Concluído. Nenhum dado foi alterado." Backup não criado (--dry-run skip backup). Nenhuma escrita no Firestore.
  - **TR-13.3 PASS (3 execuções)**:
    1. Com `--force --skip-backup`: 27 tabelas processadas (2766 docs), audit_logs com 5 batches (500+500+500+500+32=2032). Resultado "MIGRAÇÃO OK: counts 1:1", EXIT 0.
    2. SEM force (`--skip-backup`): TOTAL 2766 SKIPs (linhas contendo "SKIP"), 0 inserts. "MIGRAÇÃO OK", EXIT 0.
    3. Backup teste: `--tables roles,equipment_types` → `backup-pre-migracao-*.json` criado com 2731 bytes (>0), contém `generated_at, source_db, tables.roles=[...], tables.equipment_types=[...]`. EXIT 0.
  - **Detalhes de implementação auditados**:
    - `dotenv.config()` carregado explicitamente (script standalone, não depende de index.cjs).
    - Fallback JSON backup (archiver não instalado) documentado e default ativo.
    - `BOOL_FIELDS` (is_active, is_correct, passed, revoked, by_admin) convert INTEGER 0/1 → boolean.
    - `JSON_FIELDS` (answers, permissions, old_value, new_value, etc.) parse seguro com try/catch fallback string.
    - `CUSTOM_PK.module_workload = 'module_id'` (tabela sem coluna `id`).
    - Validação counts usa interseção IDs do SQLite vs docs no Firestore (ignora docs extras criados por E2E testes).
    - `canSync=false` e warning único por sessão em stubs firestoreSync.
  - Arquivo criado:
    - [migrate_sqlite_to_firestore.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/scripts/migrate_sqlite_to_firestore.cjs)

---

## Task 14: Seed Cartilha Firestore (idempotente, marcadores anti-duplicata)
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 13
- **Description**:
  - Localizar seeds originais em `database/seed_cartilha_*.cjs`.
  - Criar equivalentes em `scripts/seed_cartilha_firestore.cjs`:
    - Usa `TrainingRepo.appendLessonContent(id, htmlAppend, '<!-- CARTILHA_APPENDED_v1 -->')` idempotente (implementado no repo).
    - Seed de descrições de módulos (CARTILHA_QUIZ_v1 / CARTILHA_MODULO_v1 etc) também com marcadores.
    - Ao rodar 2ª vez → `0 changes applied` (tudo pulado por marcadores já existentes no conteúdo).
  - Se originalmente seeds usavam INSERT/UPDATE SQL → trocar por chamadas do repo.
  - Não modificar rotas runtime; scripts rodam manualmente.
- **Acceptance Criteria Addressed**: FR-SD1, NFR-3
- **Test Requirements**:
  - `rule` TR-14.1: `node scripts/seed_cartilha_firestore.cjs` 1ª vez → relata N changes. 2ª vez idêntica → `0 changes, all skipped by anti-duplicate markers`.
  - `rule` TR-14.2: Após seed, `GET /api/training/lessons/:id` content HTML contém `<!-- CARTILHA_APPENDED_v1 -->` (se lição com append).
- **Completion Evidence**:
  - **TR-14.1 PASS (2 execuções)**:
    1. 1ª execução: `EXIT 0`, RESUMO = `📦 12 changes aplicadas | 28 skips anti-duplicata` (M01 description atualizada=1, Appends=11 novos; Enriquecimento e Quiz já existiam de migração anterior → 17+11=28 skips).
    2. 2ª execução IDÊNTICA: `EXIT 0`, stdout contém literal `✅ 0 changes, all skipped by anti-duplicate markers` (M01 skip=1, Enriq skip=17, Append skip=11, Quiz skip=11).
  - **TR-14.2 PASS (marker CARTILHA_APPENDED_v1 na lição 2)**: Node one-liner `initFirebase + getLessonById(2).content.includes('<!-- CARTILHA_APPENDED_v1 -->')` retornou `TRUE ✅`, `content length=10781`, EXIT 0.
  - **Detalhes de implementação auditados**:
    - 4 marcadores anti-duplicata OBRIGATÓRIOS definidos L12-15: `CARTILHA_ENRIQUECIMENTO_v1`, `CARTILHA_APPENDED_v1`, `CARTILHA_QUIZ_v1`, `CARTILHA_MODULO_v1`.
    - 4 etapas ordem correta anti-duplicata (L198-208): Etapa0 updateModuleDescription M01 → Etapa1 Enriquecimento 17 lições IDs 2-18 com preservação de QUIZ existente via indexOf(MARKER_QUIZ) igual ao seed SQLite original → Etapa2 Appends 11 IDs via appendLessonContent → Etapa3 Quiz 11 IDs via buildQuizHtml + appendLessonContent.
    - `buildQuizHtml(arr)` L86-104: box laranja header + N `<details>` pergunta/resposta + summary box; idêntico ao layout do seed legado.
    - `etapa1_enriquecimento` L123-149: reaproveita bloco `Teste seus conhecimentos` existente no content se `indexOf(CARTILHA_QUIZ_v1) >= 0`, senão usa fallback intro.
    - `require('dotenv').config({path})` L1-2 + `if (require.main === module) main().catch(...)` L350-352 = script standalone, nenhuma dependência de index.cjs runtime.
    - Reparo de pós-truncamento Write tool: arquivo inicial L246 cortava no meio do parágrafo Segurança da lição 17 ("...autorizada e execut"); Edit completou lição 17 (Erros/Resumo/checklist-aula) + adicionou lição 18 NR-10 inteira + fechou `};` objeto AULA + adicionou invocação main final; `node --check` exit 0 pós-reparo.
  - Arquivos alterados/criados:
    - [seed_cartilha_firestore.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/scripts/seed_cartilha_firestore.cjs)

---

## Task 15: Documentação `.env.example` (atualizar formato FIREBASE_PRIVATE_KEY) + package.json limpeza
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: None (paralelo com qualquer task desde que package.json exista)
- **Description**:
  - Se existir `.env.example` → atualizar documentação interna comentada:
    ```
    # FIREBASE_PRIVATE_KEY pode ser 2 formatos:
    # 1) FORMATO RECOMENDADO VERCEL: APENAS A CHAVE PRIVADA (inclua quebras de linha como \n)
    # FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBA...\n...\n-----END PRIVATE KEY-----\n"
    #
    # 2) FORMATO RETROCOMPATÍVEL: JSON INTEIRO do service account-key.json
    #    (detectado automaticamente se começar com "{")
    #
    # GOOGLE_APPLICATION_CREDENTIALS=NÃO USAR EM VERCEL. Só usar LOCALMENTE se tiver arquivo JSON físico.
    ```
  - **Package.json limpeza**: Remover `better-sqlite3`, `drizzle-orm`, `better-sqlite3` das `dependencies` (DEPOIS de validar AC-7 grep 0 matches). Manter `better-sqlite3` em `devDependencies` opcionalmente se script migração precisar. Se quiser remover tudo, adicionar passo no README de migração "para rodar migração, `npm i better-sqlite3 archiver --no-save`".
  - Atualizar `.gitignore` se necessário para incluir `scripts/migrate_sqlite_to_firestore-local.db` (se existir backup). Já deve ter `training.db` e service-account.json.
- **Acceptance Criteria Addressed**: FR-V1, FR-V2, NFR-1, AC-12
- **Test Requirements**:
  - `rule` TR-15.1: grep "better-sqlite3" `package.json` → se existe, APENAS em devDependencies ou removido completamente.
  - `rubric` TR-15.2: AC-12 gestão de segredos; threshold >=4. Evidence: .env.example documentado, .gitignore contém service-account, training.db, backups zip.
- **Completion Evidence**:
  - **TR-15.1 PASS** (grep package.json): `better-sqlite3` retornou 1 match, linha 38, exclusivamente dentro de `devDependencies` (L33-42). `drizzle-orm` REMOVIDO de `dependencies`. `drizzle-kit` permanece devDeps (ferramenta de linha de comando, não runtime).
  - **TR-15.2 PASS** (rubrica 5/5 ≥ 4):
    - `.env.example` CRIADO (arquivo não existia) com documentação comentada dos 2 formatos de `FIREBASE_PRIVATE_KEY` (vercel string `\n` recomendado + JSON retrocompatível detectado por `{`), aviso `GOOGLE_APPLICATION_CREDENTIALS=NÃO USAR EM VERCEL` comentado, bloco `NODE_ENV/PORT/JWT_SECRET default warning`.
    - `.gitignore` ATUALIZADO com nova seção "SCRIPTS TEMPORÁRIOS E BASES LOCAIS DE MIGRAÇÃO" contendo `scripts/migrate_sqlite_to_firestore-local.db` e `scripts/_tmp_*.cjs`. Já continha `training.db` (L3), `firebase-service-account.json` (L10), `backup-pre-migracao*.json/*.zip` (L13-14), `.env` + `.env.*` exceto `!.env.example` (L6-7).
  - Arquivos alterados/criados:
    - [.env.example](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/.env.example)
    - [package.json](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/package.json#L22-L42)
    - [.gitignore](file:///e:/Projetos%20AI/Ambiente%20Teste/HUB%20TRAINING/.gitignore#L27-L29)

---

## Task 16: Smoke Testes de Regressão End-to-End (rotas API + health) e validação ACs
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Tasks 1..15
- **Description**:
  - Criar `scripts/smoke_contract.cjs` (teste de contrato de payload com snapshots) OU adaptar testes automatizados já existentes em `tests/` para Firestore.
  - **Fluxo E2E mínima**:
    1. Limpar documentos de teste (coleção com prefixo `test_` ou sufixo `__test`).
    2. `GET /health` → 200.
    3. `POST /api/auth/register` aluno → 201.
    4. `POST /api/auth/login` aluno → 200 + token.
    5. `GET /api/auth/me` → 200 user shape correto (sem password_hash).
    6. `GET /api/training/modules` → 200 array.
    7. `GET /api/progress` → 200.
    8. `GET /api/quiz/questions` → 30 items, shape por role.
    9. `POST /api/quiz/submit` (22 respostas) → "NÃO APROVADO"; novamente com 25 → "APROVADO".
    10. `GET /api/quiz/attempt/:id` STUDENT → só `{attempt_id, result}`.
    11. `POST /api/admin/users/:id/promote` com STUDENT → 403; com ADMIN (seed pré-criado via console ou comando admin) → 200.
    12. `POST /api/certificates/issue` → 201 número único.
    13. `GET /api/certificates/validate/:number` → 200.
    14. `POST /api/auth/logout` → 204.
  - **Se testes já existem**: adaptar `tests/test_api.cjs`, `tests/test_progress.cjs`, `tests/test_audit.cjs` para usar repositórios (Firestore).
  - **Se falharem**: corrigir regressões.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-8, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-16.1: `node scripts/smoke_contract.cjs` (ou suíte tests/) → exit 0, 0 failures.
  - `rule` TR-16.2: AC-7 validação: `grep -rn "openDb\|better-sqlite3\|db.prepare" server/ --include="*.cjs"` = 0 matches (exceto scripts/migrate_*.cjs que é isolado e não runtime).
- **Completion Evidence**:
  - **TR-16.1 PASS (19/19, exit 0, 0 SKIP)**: `node scripts/smoke_contract.cjs 5101` — script reescrito como E2E autocontido (versão anterior dependia de seeds `aluno.a/adm`, promovia seed a ADMIN sem reverter e apontava `POST /api/certificates/issue` inexistente). Fluxo real contra catálogo migrado: health → register 201 → login → me → modules (17) → progress → questions 30 sem gabarito → submit 22 NÃO APROVADO → 25 APROVADO → attempt `{attempt_id,result}` → promote 403/200 → 17 lições + 19 checkpoints via HTTP → practical APTO → issue `HUB-2026-000003` → validate VALID → logout 204. Cleanup total (LEFTOVERS ZERO, porta livre).
  - **TR-16.2 PASS (AC-7)**: grep `openDb|better-sqlite3|db.prepare` em `server/**/*.cjs` = 0 matches; `better-sqlite3` só em `scripts/migrate_sqlite_to_firestore.cjs` (isolado, permitido).
  - Arquivo: `scripts/smoke_contract.cjs` (reescrito; aceita PORT por argv, default 5101).

---

## Task 17: Deploy Vercel Real (final) e validação deploy URL
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 16
- **Description**:
  - `npm run build` localmente → sucesso (Task 1).
  - Commit & push para branch deploy.
  - Vercel Project conectado ao repositório. **Envs setadas na UI Vercel**:
    - `NODE_ENV=production`
    - `JWT_SECRET=string-segura-32+chars-aleatorios`
    - `FIREBASE_PROJECT_ID=hub-training-2200d`
    - `FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@hub-training-2200d.iam.gserviceaccount.com`
    - `FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"` (apenas chave, com \n)
    - Opcional: `FIREBASE_SYNC_ENABLED=true` (mas não mais usado para dual-write, sem efeito).
  - Trigger deploy: esperar build success.
  - Acessar deploy URL:
    - GET `/health` → 200 JSON com initialized:true, firebase.
    - GET `/` → home.html carregado.
    - GET `/dashboard` → dashboard.html.
    - POST `/api/auth/login` → 400 (esperado sem body) ou 200 com credenciais.
    - Confirmar cold-start 2x em rotas diferentes → dados persistem (garante não há mais SQLite).
  - Se bugs em deploy → remediar, rodar novamente task 16 smoke, deploy de novo.
- **Acceptance Criteria Addressed**: AC-1 (URL real)
- **Test Requirements**:
  - `rule` TR-17.1: Deploy Vercel URL pública responde 200 em `/health` e `/dashboard`.
  - `rule` TR-17.2: Fluxo registro/login no Vercel deploy cria doc no Firestore console (verificado manualmente).
  - `rule` TR-17.3: Dados persistem entre requisições repetidas (cold-start 2x → mesmo dado aparece).

---

## Issue Log (espaço para remediações após Failed Review)

### ISSUE-01 [Task 7] Smoke atingiu servidor stale (código SQLite) — RESOLVIDO (processo)
- **Sintoma**: primeiro smoke Task 7 retornou 17 módulos SQLite, checkpoints vazios e derrubou a conexão (`ECONNRESET`); processo servidor morreu sem stack no log.
- **Causa**: `Stop-Process` no wrapper `cmd` não garante morte do `node` filho; servidor de task anterior (código pré-refatoração) seguiu ouvindo :5001. Diagnóstico confirmado: auth via Firestore passava (middleware Task 5 novo) mas dados vinham do SQLite.
- **Ação**: regra operacional — todo smoke valida o listener via `netstat` (PID == processo iniciado) + `GET /health` antes de rodar; ao final, mata pelo PID do listener e confirma porta livre.

### ISSUE-02 [Tasks 3/7/8] Índices compostos `firestore.indexes.json` NÃO publicados — ABERTO (operacional, bloqueia Task 17)
- **Sintoma**: qualquer `where+orderBy` lança `FAILED_PRECONDITION: índice requerido` (ex.: `users.role+created_at`, `training_lessons.module_id+order_num`, `lesson_checkpoints.lesson_id+order_num`, `questions.is_active+order_num`).
- **Mitigação no código**: todos os repos afetados ganharam fallback (filtro simples + sort client-side), padrão já usado no codebase. Rotas funcionam sem índices.
- **Pendente**: `firebase deploy --only firestore:indexes` antes do deploy final (performance em produção). Verificar no console se os 14 compostos + 2 fieldOverrides estão `ENABLED`.

### ISSUE-03 [Tasks 7/13] Docs legados invisíveis ao `orderBy` + migração exige `--force` — ABERTO (escopo Task 13)
- **Evidência**: `training_modules.orderBy('order_num')` retorna 0 docs com 17 docs legados (schema antigo: campo `order`, sem `order_num`); com doc novo-schema retorna normalmente (probe `t7probe`); `orderBy('title')` retorna os 17. Docs sem o campo de ordenação são excluídos do resultado.
- **Estado atual Firestore**: 17 `training_modules` + 17 `training_lessons` em schema legado (ex-dual-write), 0 `lesson_checkpoints`/`checkpoint_options`/`questions`/`question_options` novo-schema; dados reais: 45+ quiz_attempts, 246 checkpoint_answers, 74 lesson_progress, 20 users.
- **Implicação**: migração idempotente com SKIP (`snap.exists && !force`) preservaria os legados e o catálogo seguiria invisível. **Migração deve rodar com `--force`** (ou apagar coleções legadas antes) para normalizar `order_num` em todos os docs. `technical_images` (1 row) não está na lista de 20 tabelas da Task 13 — incluir.

### ISSUE-04 [Task 8] `quizRepo.deleteAttemptAndAnswers` chamava `batch()` não importado — RESOLVIDO (código)
- **Impacto**: qualquer exclusão de tentativa lançava `ReferenceError` (quebraria admin Task 9). Descoberto no cleanup do smoke.
- **Fix**: import `batch` de `_base.cjs` (commit via `WriteBatch.commit()` nativo). Validado executando o próprio cleanup pelo caminho corrigido.

### ISSUE-05 [Task 10] Issue duplicado retornava 403 em vez de 409 — RESOLVIDO (código, desvio da ordem original)
- **Causa**: ordem original checava status (`CERTIFICATE_ISSUED` → 403) antes do certificado existente (409 inalcançável nesse caso).
- **Fix**: checagem de `getValidCertificateByUser` movida para antes do gate de elegibilidade → duplicado sempre 409, conforme TR-10.3.

### Desvios de contrato registrados (decisões conscientes, evidência em cada task)
- T6: `invite_token` segue obrigatório; auditoria mantém nomes `USER_REGISTER/LOGIN/...` (+`LOGIN_FALHA` aditivo); `GET /me` = `{user}`; reset nos paths reais `/reset/request|/confirm`.
- T7: GETs de checkpoint públicos sem variante ADMIN; lessons do módulo sem `content`; `lesson_id` não numérico preservado como string.
- T8: STUDENT `my-attempt/:id` = `{attempt_id,result}` (antes só `{result}`); novo `GET /attempts`.
- T9: novos `POST /users/:id/promote` e `PATCH /users/:id/active`; sem endpoints CSV (não existiam); `workload_detail` array nativo.
- T10: novo `PATCH /certificates/:id/downloaded` (dono ou ADMIN); `POST /my/downloaded` segue audit-only.

### Próxima ação recomendada
- [x] Tasks 11 + 12 — verificadas (já implementadas; evidências TR-11.1/11.2/11.3 e TR-12.1/12.2 coletadas).
- [x] Task 13, 14, 15 — já constavam `completed`.
- [x] Task 16 — executada: `scripts/smoke_contract.cjs` reescrito e verde 19/19.
- [ ] Task 17 — Deploy Vercel: **aguardando ação do usuário** (ver handoff abaixo).

### HANDOFF Task 17 (Deploy Vercel) — pré-requisitos locais VALIDADOS
- `npm run build` local → exit 0 ("6/6 verificações OK").
- Boot `NODE_ENV=production` local → banner ok + `GET /health` 200 `{initialized:true}` + `GET /` 200 (11520 bytes) + `GET /dashboard` 200 + `GET /api/training/modules` 200 (17 módulos migrados visíveis).
- **Passos manuais restantes (usuário)**:
  1. Criar repo git / commit / push (este workspace não é git repo) e conectar ao Vercel Project.
  2. Na UI Vercel → Environment Variables: `NODE_ENV=production`, `JWT_SECRET` (32+ chars aleatórios — **nunca o default**), `FIREBASE_PROJECT_ID=hub-training-2200d`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (só a chave, com `\n` — formato 1 do `.env.example`).
  3. Deploy → aguardar build success → validar: `GET /health` 200, `GET /` e `/dashboard` 200, `POST /api/auth/login` sem body → 400, registro/login cria doc no Firestore, cold-start 2x persiste.
  4. Operacional pendente (ISSUE-02): `firebase deploy --only firestore:indexes` para os 14 compostos.
