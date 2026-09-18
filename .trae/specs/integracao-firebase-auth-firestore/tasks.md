# Integração Firebase Auth + Firestore - Implementation Plan

## Task 0: Botão Dashboard na Home WSGI (entregue antecipadamente, PRÉ-SPEC)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Requisito claro sem ambiguidade: usuário pediu "coloque na tela principal do app.py um link ou botão que leve ao dashboard".
  - Implementação antes do Spec Mode para não bloquear valor imediato.
  - 3 pontos de alteração:
    1. `home.html:L2` nav topbar adicionado `<a href="/dashboard">Dashboard</a>` (entre Início e Simulado)
    2. `home.html:L4` hero section adicionado botão CTA primary `Abrir Dashboard HUB` como primeira ação
    3. `app.py:L83` builder `page()` nav adicionado mesmo link `/dashboard` para consistência nas páginas /simulado, /admin/login, /admin, /admin/attempt/*
- **Acceptance Criteria Addressed**: AC-6 (home/app.py exibem link Dashboard + CTA)
- **Test Requirements**:
  - `rule` TR-0.1: Grep `href="/dashboard"` retorna >= 2 matches em home.html e >= 1 match em string f-string de `page()` builder app.py
- **Completion Evidence**:
  - TR-0.1 PASS: Grep manual: `home.html` tem matches nas linhas 2 (nav) e 4 (hero CTA); `app.py` linha 83 builder tem `<a href="/dashboard">Dashboard</a>` no nav. N = 3 matches.
  - Visualização: servidor Node rodando porta 5000, GET http://localhost:5000/ retorna home.html com botão CTA "Abrir Dashboard HUB" corretamente estilizado pela classe .btn.primary já existente em static/style.css.

---

## Task 1: Credenciais Firebase, Setup deps, Variáveis de Ambiente, .gitignore
- **Status**: `pending`
- **Priority**: high (bloqueia TASKS 2..11)
- **Depends On**: None
- **Depends On (Human)**: Usuário ENTREGA: (a) Client SDK config completo `FIREBASE_*`; (b) Service Account JSON `firebase-service-account.json` salvo na raiz do projeto
- **Description**:
  - Instalar novas dependências Node: `npm install firebase-admin` (Admin SDK c/ Firestore incluso)
  - Instalar Client SDK opcional no HTML se necessário para redefinição de senha: `firebase` npm package ou CDN script
  - Instalar dependência Python SDK Admin: `pip install firebase-admin` (ou criar `requirements.txt` mínimo)
  - Atualizar `.gitignore` com entradas:
    - `firebase-service-account.json`
    - `backup-pre-migracao*.json*`
    - Quaisquer outros arquivos de segredo Firebase
  - Atualizar `.env` com CHAVES VAZIAS iniciais para documentar formato esperado:
    - FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID=hub-training-2200d, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID
    - FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (alternativa se SA JSON via env vars; padrão é SA JSON em arquivo)
    - GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
  - Criar wrapper módulo `server/lib/firebase_init.cjs` inicializa Admin SDK 1 única vez (singleton).
  - Criar wrapper `server/lib/firestore_db.cjs` exporta `getFirestore()` retornando instância já inicializada.
- **Acceptance Criteria Addressed**: NFR-1, NFR-2, NFR-7, AC-10, AC-11
- **Test Requirements**:
  - `rule` TR-1.1: `node --check server/lib/firebase_init.cjs && node --check server/lib/firestore_db.cjs` = exit 0
  - `rule` TR-1.2: `npm ls firebase-admin` = dependency installed; `pip show firebase-admin` = package installed (ou requirements.txt presente)
  - `rule` TR-1.3: `cat .gitignore | grep -E "firebase-service-account|backup-pre-migracao"` = pelo menos 2 matches
  - `rubric` TR-1.4: Segredos não hardcodados; dimension AC-11, scale 1-5, threshold >= 4. Inspeciona grep repo por "AIza", "-----BEGIN PRIVATE KEY-----", "client_email" em arquivos rastreados. 5 = 0 matches exceto gitignored; 3 = 1 match mas comentado; 1 = segredos vazados.

---

## Task 2: Repository Pattern (Camada Abstração Firestore Node)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Criar `server/lib/repositories/training_repo.cjs` com funções nomeadas (handlers NÃO conhecem detalhes Firestore):
    - `listModules()`, `getModuleById(id)`, `updateModuleDescription(id, newDesc)`
    - `listLessonsByModule(moduleId)`, `getLessonById(id)`, `appendLessonContent(id, htmlAppend, markerUnique)` (idempotente)
    - `saveLessonProgress(userId, lessonId, data)`, `getProgress(userId)`
    - `saveCheckpointAnswer(userId, checkpointId, answer)`, `getCheckpointsByLesson(lessonId)`
    - `saveQuizAttempt(userId, score, total, passed, ...)`, `getQuizAttempt(attemptId)`, `getQuizAttemptsByUser(userId)`
    - `saveAuditLog(entry)`, `listAuditLogs(filters)`
  - Criar `server/lib/repositories/auth_repo.cjs`:
    - `createFirebaseUser({email, password, name})`, `updateCustomClaims(uid, {role})`
    - `findUserByEmail(email)`, `findUserById(id)`, `setUserActiveStatus(id, isActive)`
  - Todo acesso a coleções passa pelos repositórios; NÃO existe `db.collection('training_modules')` inline nos arquivos de rota.
- **Acceptance Criteria Addressed**: AC-10 (repository pattern), facilita troca futura de fonte de dados
- **Test Requirements**:
  - `rule` TR-2.1: `node --check server/lib/repositories/*.cjs` = exit 0
  - `rubric` TR-2.2: Isolamento handlers; dimension AC-10, scale 1-5, threshold >= 4; evidência: grep "db.collection" em server/routes/ deve retornar 0 matches após refatoração. Todas as leituras/escritas passam por funções do repo.

---

## Task 3: Refatorar Middleware `authenticateToken` → Firebase
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Refatorar `server/middleware/auth.cjs`:
    - Opção A (mínima alteração contrato): mantém JWT próprio ASSINADO por servidor com segredo JWT_SECRET. Login usa Firebase Auth para validar credenciais, depois servidor emite JWT próprio com payload `{sub: uid, email, role}` em 8h. NÃO muda nada em cliente.
    - Opção B (nativo Firebase): Middleware verifica Firebase idToken via `admin.auth().verifyIdToken(idToken)`. Cliente envia Authorization: Bearer <firebase-idToken>.
    - Recomendado: **Opção A**. Mantém contrato SPA inalterado (dashboard.js já envia Bearer token server-emitted). Menor risco de regressão.
  - `requireRole(...roles)` e `requireSelfOrAdmin(getId)`: código preservado inalterado (lógica de comparação req.user.role continua).
  - Validação usuário inativo: consulta doc Firestore users ao invés de `db.prepare('SELECT ... FROM users')`.
- **Acceptance Criteria Addressed**: AC-1, AC-2, FR-EN2
- **Test Requirements**:
  - `rule` TR-3.1: Token ausente → 401 `{error:'Token ausente'}`; token expirado → 401 TOKEN_EXPIRED; token inválido → 401 TOKEN_INVALID
  - `rule` TR-3.2: Token user STUDENT → requireRole('ADMIN') → 403; Token ADMIN → passa.
  - `rule` TR-3.3: requireSelfOrAdmin → STUDENT acessa próprio id=X passa, acessa id=Y → 403; ADMIN acessa qualquer id passa.

---

## Task 4: Refatorar Rotas `/api/auth` e `/api/admin`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - `POST /api/auth/register`: `auth_repo.createFirebaseUser` + doc Firestore users/ criado com role=STUDENT, is_active=true, created_at. Auditoria criada.
  - `POST /api/auth/login`: (Opção A) valida email/senha via `admin.auth().getUserByEmail` + `admin.auth().signInWithEmailAndPassword` simulado (melhor usar `signInWithPassword` REST API client-side). Alternativa: server-side valida senha custom via claims; se usar Opção A é só login via Firebase SDK client e servidor emite JWT próprio após checar doc users Firestore para role.
  - `POST /api/auth/logout`: auditoria + revoga refreshToken Firebase se disponível.
  - `GET /api/auth/me`: mesmos dados.
  - `POST /api/admin/users/:id/promote`: ADMIN-only; atualiza claims customizadas Firebase (`admin.auth().setCustomUserClaims(uid, {role:'ADMIN'})`) + doc users/ role_id atualizado + auditoria.
  - `GET /api/admin/users`: lista paginada usuários com roles, filtros.
- **Acceptance Criteria Addressed**: AC-1, AC-2, FR-A1..A7
- **Test Requirements**:
  - `rule` TR-4.1: POST register {email, passwd>=6, name} → 201; tentar registrar mesmo email → 409.
  - `rule` TR-4.2: POST login com credenciais recém-criadas → 200 com token. Post login senha errada → 401.
  - `rule` TR-4.3: POST promote (STUDENT chama) → 403; (ADMIN chama) → 200; próximo login novo role aparece.

---

## Task 5: Refatorar Rotas de Conteúdo e Progresso `/api/training | /dashboard | /progress | /checkpoints | /equipment | /images`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Todas as rotas usam `training_repo.*` funções; 0 chamadas `openDb()` better-sqlite3; código de paginação, ordenação `order_num`, UNIQUE(user_id,lesson_id) check constraints mantidos em app-layer.
  - `/api/progress`: `saveLessonProgress` usa setDoc merge ou upsert para não duplicar.
  - `/api/checkpoints`: respostas checkpoint gravadas em `checkpoint_answers` coleção.
  - `/api/training` módulos e lições: `order_num` preservado, `status=PENDING_TECHNICAL_VALIDATION` por padrão nos novos docs.
  - `/api/images`: rotas intactas (serviço local), não precisa Firestore.
- **Acceptance Criteria Addressed**: AC-4, FR-D1, FR-EN1
- **Test Requirements**:
  - `rule` TR-5.1: `GET /api/training/modules` → array length = 17, ordem correta M01..M17.
  - `rule` TR-5.2: `POST /api/progress/:lessonId` status COMPLETED; `GET /api/progress` retorna status.
  - `rule` TR-5.3: `test_progress.cjs` equivalente adaptado = 8/8 PASS.

---

## Task 6: Refatorar Rotas Simulado `/api/quiz` — PRESERVAR PASS_SCORE=23 + Gabarito Oculto STUDENT
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - `PASS_SCORE = 23` **linha constante HARD preservada** (não parametrizar).
  - Questões e options: coleções `questions`, `question_options` Firestore. Banco de questões 30 com shuffle? Manter comportamento atual.
  - POST submit tentativa: `saveQuizAttempt` + `quiz_answers` docs.
  - GET attempt/:id **condicional por role**:
    - STUDENT → retorna APENAS `{attempt_id, result: APROVADO|NÃO APROVADO}`. NÃO existe score, NÃO existe gabarito, NÃO existe answers.
    - ADMIN → payload completo (score, total, passed, answers, is_correct por questão, tempo etc).
  - Checkpoints e simulado permanecem SEPARADOS (checkpoint = lição individual, simulado = final 30).
- **Acceptance Criteria Addressed**: AC-3, FR-EN3
- **Test Requirements**:
  - `rule` TR-6.1: submit 30 respostas 22 → result = NÃO APROVADO; 23 → APROVADO; 30 → APROVADO.
  - `rule` TR-6.2: GET attempt/:id com role STUDENT → JSON.parse() keys contém só attempt_id e result. Nenhuma key "score", "answers", "is_correct". typeof === 'undefined'.
  - `rule` TR-6.3: GET attempt/:id com role ADMIN → keys completas presentes.

---

## Task 7: Refatorar `/api/audit` + Seeds Cartilha Append
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - `/api/audit` routes: lê coleção `audit_logs` Firestore, filtros por entity_type, user_id, timestamp range. Mesmo contrato payload atual.
  - Seeds já existentes `database/seed_cartilha_append.cjs` e `database/seed_cartilha_mod_desc_and_quiz.cjs`:
    - Refatorar para usar Firestore repo (função `appendLessonContent`) no lugar de `UPDATE training_lessons SET content=CONCAT(...)`.
    - Mantêm marcadores anti-duplicata idempotentes (`<!-- CARTILHA_APPENDED_v1 -->`, `CARTILHA_QUIZ_v1`).
    - Não executam em runtime; só na mão do operador ou CI.
- **Acceptance Criteria Addressed**: AC-9 (parcial), NFR-3
- **Test Requirements**:
  - `rule` TR-7.1: Rodar seed cartilha 2 vezes sem force → 2ª vez 0 changes (SKIP todos por marcador anti-duplicata).
  - `rule` TR-7.2: `/api/audit?entity_type=USER` → array com pelo menos 1 registro de LOGIN após primeiro login.

---

## Task 8: Refatorar Python WSGI `app.py` → Firebase Admin SDK Python
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 6 (Node) + Task 1 (Python SDK instalado)
- **Description**:
  - Login `/admin/login` (WSGI): compara hash senha com doc Firestore users ADMIN OU sessão `adm_session` continua in-memory. Recomendado: **manter sessão cookie in-memory** para admin WSGI (igual hoje), MAS a checagem de senha usa credenciais no doc Firestore users ADMIN. Alternativa: usar claims.
  - `init_db()`, `save_attempt()`, `rows()` → coleção `attempts_legacy` Firestore.
  - `/simulado` POST submit: grava doc `attempts_legacy/{id}` Firestore ao invés de `sqlite3.connect(DB_PATH)`.
  - `/admin` page, `/admin/attempt/:aid`, `/admin/export` CSV: lê `attempts_legacy` Firestore.
  - **Manter builder `page()` e HTML retornado 100% igual.**
  - NÃO alterar nada do HTML/CSS das páginas WSGI nesta fase.
  - Task 0 (Botão Dashboard) já implementado e preservado.
- **Acceptance Criteria Addressed**: AC-6, AC-8, FR-EP1..EP4
- **Test Requirements**:
  - `rule` TR-8.1: POST /simulado 30 respostas válidas → doc novo em `attempts_legacy` com candidate, score, passed, created_at. Tamanho do arquivo `training.db-wal` inalterado = 0 bytes ou constante (nenhuma escrita SQLite).
  - `rule` TR-8.2: GET `/admin` logado → tabela com N tentativas. Link "Dashboard" aparece no topo nav (validação por grep HTML retornado string "href=\"/dashboard\"").
  - `rule` TR-8.3: GET /admin/export → CSV UTF-8 BOM, separador ponto-e-vírgula, mesmas colunas atuais. Pelo menos 1 linha.

---

## Task 9: Script Migração 1-shot SQLite → Firestore (backup + batches + idempotente)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Criar `database/migrate_sqlite_to_firestore.cjs` (Node standalone):
    - Flags: `--dry-run` (só log counts); `--force` (sobrescreve docs existentes); `--tables roles,users,training_modules` (filtrar tabelas).
    - Passo 0: Backup ZIP JSON. Exporta TODAS tabelas SQLite → JSON → `backup-pre-migracao-YYYYMMDD-HHMMSS.json.zip` salvo em raiz.
    - Passo 1: Ordem de gravação respeitando FKs: roles → users → permissions → equipment_types → technical_equipment → equipment_relationships → training_modules → training_lessons → lesson_checkpoints → checkpoint_options → questions → question_options → (dados operacionais) lesson_progress, checkpoint_answers, quiz_attempts, quiz_answers, audit_logs, content_versions → (tabela legada) attempts.
    - Passo 2: Batches de 500 docs (limite do batch Firestore).
    - Passo 3: Idempotência: se docId já existe e NÃO --force → SKIP logado em stdout linha-a-linha.
    - Passo 4: Validação FINAL counts para CADA tabela: `SQLite_count === Firestore_count`; print diff tabela por tabela. Se qualquer diff, exit code 1 (não passa validação). Se todos =, exit code 0 + mensagem "MIGRAÇÃO OK".
  - Usuários (password_hash): campo `password_hash_bcrypt_legacy` é salvo como campo no doc users FIRESTORE (somente para referência histórica; NÃO usado em auth). Senhas redefinidas via Firebase Reset.
- **Acceptance Criteria Addressed**: AC-5, FR-M1..FR-M3
- **Test Requirements**:
  - `rule` TR-9.1: `node database/migrate_sqlite_to_firestore.cjs --dry-run` = exit 0 + log counts para todas 17+ tabelas.
  - `rule` TR-9.2: Rodar com `--force` = validação counts 100% =, exit 0.
  - `rule` TR-9.3: Rodar NOVA vez SEM --force = 0 inserts, 100% SKIP por existência docId, exit 0.
  - `rule` TR-9.4: Arquivo backup `backup-pre-migracao-*.json.zip` criado e com tamanho > 0 bytes.

---

## Task 10: Regras de Segurança Firestore Server-Side (bloqueio writes STUDENT)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 9
- **Description**:
  - Criar `firestore.rules` na raiz:
    - Leitura: ADMIN pode ler tudo; STUDENT pode ler apenas docs de training_modules, training_lessons, lesson_checkpoints, checkpoint_options (conteúdo público do curso); PROPRIO user pode ler seu progresso/tentativas próprias; NINGUÉM lê gabaritos `is_correct` e `checkpoint_options.is_correct` client-side exceto ADMIN (gabiarito SEMPRE só server-side).
    - Escrita: STUDENT NÃO PODE escrever em training_modules/training_lessons/QUALQUER tabela de conteúdo. STUDENT pode escrever APENAS: lesson_progress próprio, checkpoint_answers próprios, quiz_attempts próprio. Audit logs NÃO podem ser escritos por ninguém exceto Admin SDK (server-only).
    - Regras de campos obrigatórios (created_at, etc.).
  - Arquivo `firestore.indexes.json` mínimo (criar com compound indexes para queries comuns: progress por user_id + lesson_id, etc.).
  - Publicar regras: documentar comando `firebase deploy --only firestore:rules,firestore:indexes`; ou via console se não houver Firebase CLI instalado.
- **Acceptance Criteria Addressed**: AC-7, NFR-1
- **Test Requirements**:
  - `rule` TR-10.1: Tentativa STUDENT escrever em `training_modules` via SDK client → 403 Permission-denied.
  - `rule` TR-10.2: Tentativa STUDENT ler `checkpoint_options.is_correct` via client → campo negado ou retorno sem o campo.
  - `rule` TR-10.3: Tentativa ADMIN SDK (server) escrever em qualquer coleção → 200 OK.

---

## Task 11: Validação Final Regressão + Smoke Tests
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 4, 5, 6, 7, 8, 9, 10
- **Description**:
  - Atualizar suítes de teste `tests/test_api.cjs`, `tests/test_progress.cjs`, `tests/test_audit.cjs` APENAS para conectar em Firestore ao invés de SQLite (usar repos).
  - Execução sequencial: 9/9 + 8/8 + 8/8 = 25/25 PASS (ou ajustado se houver novas condições).
  - Smoke test navegador (opcional humano): logar STUDENT, estudar lição, marcar checkpoint, fazer simulado, logout; logar ADMIN, ver resultados, exportar CSV WSGI, promover usuário.
  - Desligar SQLite em runtime (se opção): `DISABLE_LOCAL_SQLITE=1` flag; tentativa abrir SQLite retorna erro com mensagem "migração completa".
- **Acceptance Criteria Addressed**: AC-9, NFR-6 (compatibilidade API)
- **Test Requirements**:
  - `rule` TR-11.1: test_api PASS
  - `rule` TR-11.2: test_progress PASS
  - `rule` TR-11.3: test_audit PASS
  - `rubric` TR-11.4: Smoke humano (se executado): scale 1-5; threshold 4; 5 = sem erros console, navegação fluida, layouts quebrados, simulado aprova/reprova corretamente; 3 = pequenos avisos console sem impacto.
- **Notes**: É um smoke test opcional; validação automatizada é critério de aceite obrigatório.
