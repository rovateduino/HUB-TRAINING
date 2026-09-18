# Migração Firestore Primária + Deploy Vercel - Product Requirements Document

## Overview
- **Summary**: Refatoração COMPLETA da camada de dados do HUB Training para transformar o Firebase Firestore na FONTE PRIMÁRIA E EXCLUSIVA de persistência. Remoção total do SQLite (`better-sqlite3` + `training.db`) e de componentes stateful (fila de sync em memória, rate-limit em memória) para compatibilidade nativa com Vercel Functions (serverless stateless). Entrega dos arquivos `vercel.json` + `build.js` ausentes para deploy.
- **Purpose**: Permitir deploy de produção estável e funcionamento correto na plataforma Vercel (que não suporta SQLite persistente ou stateful backends). Eliminar dual-write (SQLite → Firestore) que gera inconsistência em ambiente distribuído. Garantir persistência multi-AZ via Firebase/Firestore GCP nativo.
- **Target Users**: (a) Desenvolvedor/Operador fazendo deploy em produção Vercel; (b) ADMINISTRADOR do treinamento — gestão conteúdo, usuários, resultados; (c) PROFISSIONAL/STUDENT — estudo cartilha digital e realização de simulado/certificação.

## Goals
1. **Eliminação SQLite**: `better-sqlite3` é completamente removido de `package.json` dependencies. 0 arquivos de rota usam `openDb()` ou `db.prepare(...)`. Arquivo `training.db` torna-se artefato legado (backup apenas).
2. **Firestore Fonte Primária**: Toda leitura e escrita de dados dos 13 módulos de rota (auth, training, progress, quiz, checkpoints, certificates, practical, equipment, audit, admin, dashboard, images, firebase status) usa Firebase Admin SDK Firestore (`admin.firestore()`) DIRETAMENTE. NÃO existe dual-write.
3. **Compatibilidade Vercel**: Projeto deploya com sucesso em Vercel Functions usando `@vercel/node`. Nenhum componente stateful (fila em memória, rate limit MemoryStore) permanece. `build.js` e `vercel.json` presentes e válidos.
4. **Contrato API Preservado 100%**: Todos os endpoints `/api/*` retornam mesmo status code, mesmos keys, mesma estrutura JSON que versão SQLite. Nenhuma quebra de contrato com o SPA Dashboard (`dashboard.html`) existente.
5. **Regras de Negócio Intactas**: `PASS_SCORE=23` inalterado. RBAC ADMIN/STUDENT 1:1 preservado. Requisito `PENDING_TECHNICAL_VALIDATION` preservado. Gabarito `is_correct` de simulado/checkpoints NUNCA retornado para role STUDENT. Middleware `requireSelfOrAdmin` bloqueia IDOR.
6. **Migração 1-shot Idempotente**: Script standalone Node exporta `training.db` (Legado) e importa TUDO para Firestore, com backup JSON ZIP prévio, batches de 500, idempotência por docId (SKIP se existir, exceto `--force`), validação counts 1:1 final.
7. **Configuração Variáveis `.env` Consistente**: `FIREBASE_PRIVATE_KEY` contém APENAS a chave privada string (linhas `-----BEGIN...`). Credenciais NÃO hardcodadas. JWT_SECRET com valor padrão gera WARNING startup mas NÃO quebra.

## Non-Goals (Fora do Escopo — NÃO implementar)
- **Firebase Auth para contas**: Autenticação continua usando **JWT emitido pelo servidor** com senha bcrypt (campo `password_hash` salvo direto no doc Firestore `users`). Migrar para Firebase Auth nativo é FASE FUTURA separada.
- **Firebase Storage**: Imagens/fluxogramas continuam servidos via `/static/*` e rota `/api/images` (se usar base64/blob direto no Firestore, manter. Mas Storage é fase posterior).
- **Firebase Functions / Extensões**: Regras de negócio permanecem em Node/Express (Vercel Functions). Cloud Functions é futuro.
- **Firebase Hosting**: Frontend HTML (home, dashboard, login, register, admin) continua servido pelo Node/Express na Vercel. Hosting do Firebase é fase posterior.
- **OAuth / Social Login**: Google, Apple etc. — futuras fases separadas.
- **Alterações UX/CSS**: Nenhuma mudança de UI, classes CSS, telas, layouts. Apenas camada de acesso a dados + deploy config.
- **Realtime Database**: Escolhido Firestore; RTDB não usado.
- **Rate limit distribuído (Redis)**: Por simplicidade, rate limit pode ser MANTIDO MemoryStore mesmo que não compartilhado entre Functions (aceitável trade-off inicial) ou implementado Upstash Redis em fase futura. NÃO é bloqueante.

## Background & Context
- **Arquitetura Atual**: Node + Express com `server/index.cjs` como entrypoint. Banco **SQLite (better-sqlite3)** como FONTE DA VERDADE em `training.db`. Firestore é **camada secundária** via dual-write assíncrona em fila `SYNC_QUEUE` em memória (arquivo `server/services/firestoreSync.cjs`). 13 arquivos de rota em `server/routes/*.cjs`. Frontend HTML estático + CSS em `static/` e arquivos root (home, dashboard, validar).
- **Incompatibilidades Bloqueantes Identificadas no Relatório 2026-09-18**:
  1. `better-sqlite3` é módulo nativo que escreve em disco; Vercel `/tmp` é ephemeral (apagado após request).
  2. `SYNC_QUEUE` stateful em memória é perdido a cada cold-start; dual-write é não confiável.
  3. `build.js` referenciado em `package.json` NÃO EXISTE → build Vercel quebra no zero.
  4. `vercel.json` NÃO EXISTE.
  5. `FIREBASE_PRIVATE_KEY` no `.env` contém JSON INTEIRO do service account, não apenas chave privada.
- **Decisão do Usuário 2026-09-18**: Opção 2 = "Cenário C: Migrar para Firestore como FONTE PRIMÁRIA".
- **Firebase / Regras já existentes**: `firebase/firestore.rules` e `firebase/firestore.indexes.json` já implementados e de qualidade (default deny, RBAC, 7 índices compostos). `server/services/firebase.cjs` init Admin SDK já funcional.
- **Seeds Legados**: `database/seed_*.cjs` existem para popular conteúdo cartilha; precisam ser refatorados para Firestore.

## Functional Requirements (FRs)

### Configuração Deploy Vercel
- **FR-C1**: Arquivo `build.js` no root do projeto existe, exporta exit 0, é invocado por `npm run build` (package.json linha 8). NÃO precisa transpilar, apenas validação mínima de integridade.
- **FR-C2**: Arquivo `vercel.json` versão 2 existe com `builds: [{src:"server/index.cjs", use:"@vercel/node", includeFiles: static/** + *.html root}]`, `routes` mapeando `/`, `/dashboard`, `/validar/*`, `/api/*`, `/static/*` para `server/index.cjs` ou arquivos estáticos, `functions.maxDuration = 60` (rotas quiz/certificates podem custar latência).
- **FR-C3**: Package.json `engines` field definido com Node >= 18 (compatibilidade Vercel current).

### Camada Abstração (Repository Pattern)
- **FR-R1**: Criar pasta `server/repositories/` com módulos CommonJS exportando funções nomeadas de alto nível. Nenhum arquivo em `server/routes/` chama `db.collection()` INLINE. Toda leitura/escrita passa por funções do repo.
- **FR-R2**: Repositórios mínimos:
  - `AuthRepo`: `findUserByEmail(email)`, `findUserById(id)`, `createUser(userData)`, `updateUser(id, patch)`, `listUsers(filters, pagination)`
  - `TrainingRepo`: `listModules()`, `getModuleById(id)`, `listLessonsByModule(moduleId)`, `getLessonById(id)`, `appendLessonContent(id, htmlAppend, marker)`, `updateModuleDescription(id, desc)`
  - `ProgressRepo`: `saveLessonProgress(userId, lessonId, data)`, `getProgress(userId)`, `getLessonProgress(userId, lessonId)`
  - `CheckpointRepo`: `getCheckpointsByLesson(lessonId)`, `getCheckpointOptions(checkpointId)`, `saveCheckpointAnswer(userId, checkpointId, answer, isCorrect)`, `getMyAnswers(userId, lessonId)`
  - `QuizRepo`: `listQuestions(count, shuffleSeed?)`, `saveQuizAttempt(userId, payload)`, `saveQuizAnswer(attemptId, questionId, answer, isCorrect)`, `getQuizAttempt(attemptId)`, `getQuizAttemptsByUser(userId)`
  - `CertificateRepo`: `generateCertificateNumber()`, `createCertificate(userId, data)`, `getMyCertificates(userId)`, `getCertificateByNumber(number)`, `markDownloaded(certId)`
  - `AuditRepo`: `saveAuditLog(entry)`, `listAuditLogs(filters, pagination)`
  - `AdminRepo`: todas as operações de administração de conteúdo (CRUD modules, lessons, checkpoints, questions, users, practical)
  - `EquipmentRepo`: operações de equipamentos, relações, topologia
  - `PracticalRepo`: CRUD de aulas práticas, avaliação, validação

### Refatoração Middleware Autenticação
- **FR-M1**: `server/middleware/auth.cjs` `authenticateToken` — após validar JWT `sub` (userId), consulta `AuthRepo.findUserById(sub)` no FIRESTORE, não mais no SQLite. Se usuário não encontrado ou `is_active = false`, retorna 401. Injeta `req.user` com mesmo shape: `{id, email, name, role, is_active}`.
- **FR-M2**: `requireRole(...roles)` e `requireSelfOrAdmin(getIdParam)` — lógica PRESERVADA inalterada. Nenhuma mudança comportamento.

### Refatoração Rotas API (13 módulos)
- **FR-A1** `/api/auth` (`server/routes/auth.cjs`): `POST /register` → cria usuário com bcrypt hash password → `AuthRepo.createUser({email, name, password_hash, role:'STUDENT', is_active:true, created_at})` → auditoria. `POST /login` → `AuthRepo.findUserByEmail` → bcrypt compare → emitir JWT mesmo shape. `POST /logout` → auditoria. `GET /me` → retorna `req.user` idêntico contrato atual. `POST /reset` → gera token reset, salva no user doc, envia link (email continua mock se não tiver SMTP real; comportamento preservado).
- **FR-A2** `/api/admin` (`server/routes/admin.cjs`, 25+ endpoints): TODOS endpoints refatorados para AdminRepo. Operações CRUD usuários, módulos, lições, checkpoints, questões, avaliações, export CSV. Contrato de resposta JSON PRESERVADO 1:1. Promoção ADMIN: `patch {role:'ADMIN'}` no doc users. Promoção é auditada.
- **FR-A3** `/api/training`: `listModules`, `getModuleById`, `listLessonsByModule`, `getLessonById`, `completeLesson` (registra audit). Conteúdo de lições (campo `content` HTML longo) lido do Firestore. Ordenação `order_num` preservada.
- **FR-A4** `/api/progress` (`server/routes/progress.cjs`): Upsert `lesson_progress` (NÃO duplicar em user+lesson). Integridade de unicidade garantida por Firestore docId = `${userId}_${lessonId}`.
- **FR-A5** `/api/checkpoints` (`server/routes/checkpoints.cjs`): Busca lição, checkpoints, options. Submete resposta, valida `is_correct`, salva `checkpoint_answers`. Meu progresso por lição. Gabarito retornado APENAS para ADMIN.
- **FR-A6** `/api/quiz` (`server/routes/quiz.cjs`): **PASS_SCORE=23 inalterado como const literal**. Buscar 30 questões, submit (calcular score, aprovar/reprovar), salvar `quiz_attempts` + `quiz_answers` subcollection. GET attempt/:id com filtro por role: STUDENT = `{attempt_id, result: APROVADO|NÃO APROVADO}` SOMENTE (0 keys de score/gabarito). ADMIN = payload completo.
- **FR-A7** `/api/certificates` (`server/routes/certificates.cjs`): Gerar certificado com número sequencial (transaction Firestore ou semaphore doc `certificates_seq`). Listar meus certificados. Validar número (página pública). Marcar baixado. Campo `certificate_number` UNIQUE garantido app-layer + regras Firestore.
- **FR-A8** `/api/dashboard` (`server/routes/dashboard.cjs`): Resumo STUDENT (progresso %, certificados, últimas tentativas) e ADMIN (totais). Query Firestore agregadas.
- **FR-A9** `/api/practical` (`server/routes/practical.cjs`): CRUD aulas práticas, validações, atribuições.
- **FR-A10** `/api/equipment` (`server/routes/equipment.cjs`): Listar equipamentos, relações entre tipos, topologia.
- **FR-A11** `/api/audit` (`server/routes/audit.cjs`): Listar auditoria por filtros (user_id, entity_type, range datas), paginação.
- **FR-A12** `/api/images` (`server/routes/images.cjs`): Se rota já é independente de BD (serviço local / static / base64), manter inalterada. Se depender SQLite, refatorar para salvar blobs/refs no Firestore ou static.
- **FR-A13** `/api/firebase/status` e `/api/firebase/bulk-sync`: Rotas `bulk-sync` tornam-se NO-OP (retornam `{deprecated:true, message:"Firestore é fonte primária. Nada a sincronizar."}`) pois dual-write acabou. Rota `status` retorna versão do SDK, projectId, initialized, queue_size=0.

### Migração 1-shot SQLite → Firestore
- **FR-MG1**: Script `scripts/migrate_sqlite_to_firestore.cjs` (Node standalone). Ordem FK: roles → users → permissions → equipment_types → technical_equipment → equipment_relationships → training_modules → training_lessons → lesson_checkpoints → checkpoint_options → questions → question_options → lesson_progress → checkpoint_answers → quiz_attempts → quiz_answers → audit_logs → practical_records → certificates → content_versions.
- **FR-MG2**: Flags: `--dry-run` (log counts); `--force` (sobrescreve doc existente); `--tables X,Y` (filtrar); `--skip-backup` (pular ZIP backup).
- **FR-MG3**: Backup. Antes de escrever 1 doc, serializa TUDO do SQLite para JSON → gera `backup-pre-migracao-YYYYMMDD-HHMMSS.json.zip` salvo raiz. Zip tem tamanho > 0.
- **FR-MG4**: Batches de 500 (limite Firestore). DocId = String do INTEGER id SQLite original (ex: id 123 → docId `"123"`). Preserva integridade relacional FK.
- **FR-MG5**: Idempotência. Se docId já existe e NÃO `--force` → SKIP (log linha a linha). Se `--force` → `setDoc()` overwrite total.
- **FR-MG6**: Validação Final. Para cada tabela T: `count_SQLite(T) === count_Firestore(T)`. Imprime diff tabela por tabela. Se QUALQUER tabela diff > 0 → exit code = 1 + mensagem "MIGRAÇÃO FALHOU: counts divergem". TODAS counts 1:1 → exit code 0.

### Stateful Components Removidos / Ajustados
- **FR-S1**: `server/services/firestoreSync.cjs` — DESCONTINUADO. `SYNC_QUEUE`, `enqueueFirestoreOp()`, `processQueue()`, `runFullBulkSync()`, `flushQueue()` — TODAS funções se tornam NO-OP stubs com warning deprecation log. NÃO importar em routes; index.cjs removido o uso em startup shutdown.
- **FR-S2**: `server/middleware/rateLimit.cjs` — Mantido MemoryStore por simplicidade (trade-off: rate limit NÃO compartilhado entre Functions, aceitável). WARNING logado em startup "Rate limit é MemoryStore: não funciona distribuído em Vercel Functions (aceitável para MVP)". Para versão futura implementar Upstash Redis.
- **FR-S3**: `database/db.ts`, `database/schema/*`, `database/seed_*.cjs` SQLite — Seeds migrados para Firestore (usar TrainingRepo). Database pasta SQLite pode ser movida para `database-legacy/` ou mantida como referência, mas NÃO referenciada em importações de routes.

### Seeds Cartilha para Firestore
- **FR-SD1**: `database-legacy/seed_cartilha_append.cjs` equivalente reescrito como `scripts/seed_cartilha_firestore.cjs`. Usa `TrainingRepo.appendLessonContent` e marcadores `<!-- CARTILHA_APPENDED_v1 -->` / `CARTILHA_QUIZ_v1` para idempotência (segunda execução = 0 changes).

### Variáveis de Ambiente & Segurança
- **FR-V1**: `.env.example` atualizado (ou `.env` com comentários) documenta `FIREBASE_PRIVATE_KEY` = APENAS a chave privada string (começa com `-----BEGIN PRIVATE KEY-----` e termina com `-----END PRIVATE KEY-----\n`).
- **FR-V2**: `GOOGLE_APPLICATION_CREDENTIALS` opcional e documentado como "NÃO usar em Vercel (disco não persistente). Em vez disso, setar 3 variáveis: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY".
- **FR-V3**: `JWT_SECRET` valor default gera WARNING forte em startup (colorido), mas execução continua. Recomendação para produção = 32+ chars aleatórios.

## Non-Functional Requirements (NFRs)
- **NFR-1 — Segurança Segredos**: NENHUM segredo hardcodado nos arquivos rastreados pelo git. Grep `AIza`, `-----BEGIN PRIVATE KEY-----`, `client_email` retornam 0 matches exceto em arquivos listados no `.gitignore`.
- **NFR-2 — Compatibilidade API Zero Quebra**: SPA dashboard existente (JavaScript em static/ e root HTML) FUNCIONA SEM NENHUMA MODIFICAÇÃO. Todos os endpoints retornam mesma estrutura JSON, mesmos keys, mesmos status codes.
- **NFR-3 — Performance p95**: Requisições CRUD treinamento/simulado < 700ms Firestore região `southamerica-east1` (São Paulo) em cold-start e < 400ms warm.
- **NFR-4 — Durabilidade / Disponibilidade**: Fonte de dados = Firestore GCP multi-AZ nativo. Persistência sobrevive a restarts Vercel Functions, cold-starts e scale-up horizontal.
- **NFR-5 — Graceful Degradação**: Se Firebase indisponível, requests retornam 500 genéricos, sem stacktrace para cliente. Erros logados com `console.error` detalhados server-side.
- **NFR-6 — Build Idempotente**: Vercel Build (`npm run build`) com mesmo source code produz mesmo resultado. Nenhuma operação de runtime ocorre no build.
- **NFR-7 — Clean Code / Arquitetura**: Isolamento Repository Pattern. `server/routes/*.cjs` NÃO importam `firebase-admin` nem `@google-cloud/firestore` diretamente. Apenas arquivos em `server/repositories/` e `server/services/firebase.cjs` importam o SDK.
- **NFR-8 — Documentação de Operação**: README (exceto regra "não criar doc MD" — se já existir, atualizar senão não criar) ou comentários nos scripts migração explicam flags e passos de deploy.

## Constraints
### Técnicas
1. **Dependências novas permitidas**: (nenhuma estritamente necessária). Opcionalmente `archiver` para ZIP backup e `firebase-admin` já está instalado ou será mantido. NÃO instalar `better-sqlite3` nova versão. NÃO adicionar Redis/Upstash nesta fase.
2. **Dependências removidas**: `better-sqlite3`, `drizzle-orm`, todas referências a `sqlite/` são removidas de `package.json` dependencies e NÃO importadas no runtime.
3. **Linguagem / Module system**: Continuar CommonJS `.cjs` em `server/` para manter consistência. MISTURAR ES modules em server-side é proibido nesta fase (evitar refatoração desnecessária).
4. **Plataforma Deploy**: Vercel com `@vercel/node` builder; `Node 18 LTS` (ou 20, current).
5. **Firestore Região**: Recomendado `southamerica-east1` (São Paulo) — código não é afetado por região, apenas latência.

### Negócio
1. **PASS_SCORE = 23 é imutável** nesta fase (const literal não parametrizável).
2. **Roles**: apenas ADMIN e STUDENT. Nenhum papel novo.
3. **Gabarito Confidencial para STUDENT**: `is_correct` de `checkpoint_options` e `question_options` NUNCA aparece em payload role=STUDENT. Regra é validada server-side nas rotas quiz/checkpoints GET details.
4. **`PENDING_TECHNICAL_VALIDATION`**: Estado default de conteúdo novo visível em views obrigatórias, preservado em Firestore campo `status`.

### Dependências Externas
1. **Projeto Firebase `hub-training-2200d`** já existe e usuário já forneceu credenciais no `.env` atual (mesmo que `FIREBASE_PRIVATE_KEY` formato precise ser corrigido — operação manual do usuário ou automação no script).
2. **Service Account permissões**: Firebase Admin SDK + Cloud Datastore User (Firestore) + índices editor.
3. **Plano Blaze/Spark**: Plano de pagamento precisa aceitar gravações da migração (~quota 20k writes grátis, normalmente ok para conteúdo do treinamento).

## Assumptions
1. **Usuário aceita formato JWT próprio (bcrypt no doc Firestore)**, não migrando para Firebase Auth nesta fase (Non-Goal 1). Comunicação prévia com estudantes não é necessária para essa decisão (é transparente).
2. **Vercel Functions cold-start ~200ms + Firestore ~150ms = latência aceitável** para aplicação de treinamento (não é trading de alta frequência).
3. **Rate limit MemoryStore é suficiente** para proteger básica contra abusos; mitigação de abuso avançado fica para fase posterior.
4. **Número de certificado sequencial** pode ter gaps sob concorrência extrema (acupência). Transaction Firestore garante mas não é necessário ACID estrito; gap de 1 a 2 é aceitável (ex: certificado 1,2,4 porque 3 rollback).
5. **Conteúdo HTML longo de lições** (campo `content`) é aceito em docs Firestore (tamanho máximo 1MB por doc — lições típicas são ~20-100KB).
6. **build.js não precisa de transpilação/bundler** (frontend é static HTML vanilla sem bundler hoje). Se no futuro usar Vite/webpack, nova fase.

## Open Questions
- **[ ] Q1** (Não bloqueante, default = "SIM"): Após conclusão da migração e validação, mover `database/*` + `training.db` (arquivo) para `database-legacy/` pasta (mantém referência, mas não importada) OU excluir do repo? (Default: mover para `database-legacy/`, não excluir).
- **[ ] Q2** (Não bloqueante, default = "MEMORY STORE"): Rate limit em Vercel Functions distribuído não funciona com MemoryStore. Instalar Upstash Redis + `rate-limit-redis` já agora ou postergar para fase posterior? (Default: postergar; WARNING logado, não implementar agora).
- **[ ] Q3** (Bloqueia Deploy Vercel REAL, não bloqueia Implementação do código): Usuário confirma que irá na UI do Vercel setar Environment Variables PRODUÇÃO: `JWT_SECRET`, `NODE_ENV=production`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (apenas chave privada, extraída). Usuário NÃO vai commitar `firebase-service-account.json` nem fazer upload dele? (Default: SIM).

---

## Acceptance Criteria

### AC-1: Deploy em Vercel sem erros — build e rotas básicas funcionais
- **Type**: `rule`
- **Given**: Repositório com spec implementado; `build.js` existe; `vercel.json` existe; `better-sqlite3` removido de dependencies
- **When**: Rodar `vercel deploy` (ou push para Git main + integração Vercel) com Node 18/20
- **Then**: Build stage = SUCCESS (exit 0). Deploy URL responde GET `/health` = HTTP 200 JSON `{status:"ok"}`. GET `/` retorna home.html. GET `/dashboard` retorna dashboard.html.
- **Pass Condition**: Build log Vercel sem erros + curl 3 rotas públicas = HTTP 200
- **Evidence**: Screenshot build log Vercel + saída curl `/health` `/dashboard` `/api/auth/login` (400 esperado login sem body, mas rota existe)

### AC-2: Fluxo completo Auth — register → login → me (STUDENT) com dados persistindo em Firestore, não SQLite
- **Type**: `rule`
- **Given**: Deploy Vercel ok. Firestore vazio (apenas migração ou coleções inicializadas). `JWT_SECRET` válido.
- **When**: Executar em sequência:
  1. `POST /api/auth/register` body `{email:"aluno-teste@example.com", password:"Senha123!", name:"Aluno Teste"}`
  2. `POST /api/auth/login` body `{email:"aluno-teste@example.com", password:"Senha123!"}`
  3. `GET /api/auth/me` header `Authorization: Bearer <token do passo 2>`
- **Then**: Step 1 → 201 Created. Step 2 → 200 com `{token, user:{role:"STUDENT"}}`. Step 3 → 200 `req.user.email === "aluno-teste@example.com"`. No console Firebase `users/` collection aparece 1 doc com campos email, name, password_hash (bcrypt), role=STUDENT.
- **Pass Condition**: 3 requests HTTP success, Firestore console users collection tem doc criado, payloads contrato idêntico versão SQLite.
- **Evidence**: Postman/curl HTTP status codes + screenshot Firestore console doc.

### AC-3: Login ADMIN + promoção de role bloqueada corretamente (RBAC)
- **Type**: `rule`
- **Given**: 2 usuários: User A = STUDENT recém criado, User B = ADMIN (criado via seed ou Firestore console)
- **When**: (a) Usuário STUDENT (A) chama `POST /api/admin/users/:idA/promote` → status? (b) Usuário ADMIN (B) chama mesmo endpoint promote no idA
- **Then**: A → 403 Forbidden; B → 200 OK. Próximo login A retorna role "ADMIN". Rota ADMIN-only `GET /api/admin/users` bloqueada para STUDENT 403 e liberada para A agora que é ADMIN (200).
- **Pass Condition**: HTTP codes esperados e role persistido no Firestore.
- **Evidence**: curl requests + log Firestore role atualizado.

### AC-4: Simulado com PASS_SCORE=23; gabarito OCULTO para STUDENT, VISÍVEL para ADMIN
- **Type**: `rule`
- **Given**: Questões do banco carregadas via migração ou seed no Firestore (30+ questões válidas). Usuário STUDENT logado.
- **When**: (1) `GET /api/quiz/questions` → 30 itens. (2) `POST /api/quiz/submit` com respostas = (22 corretas + 8 erradas) → result? (3) Mesmo submit mas 23+ → result? (4) GET attempt/:id com STUDENT token → keys JSON? (5) GET attempt/:id com ADMIN token → keys?
- **Then**: Step 2 → score 22 → `result: "NÃO APROVADO"`. Step 3 → score 23/30 → `"APROVADO"`. Step 4 → JSON só tem keys `attempt_id, result`. Keys `score`, `answers`, `is_correct` = `undefined`. Step 5 → ADMIN keys todas presentes incluindo respostas e is_correct.
- **Pass Condition**: PASS_SCORE threshold correto, role-based filter ativo.
- **Evidence**: curl submit/attempt 22 vs 23, typeof STUDENT payload score = undefined.

### AC-5: Progresso de lição é persistente mesmo após cold-start múltiplos Functions
- **Type**: `rule`
- **Given**: Usuário STUDENT logado. Módulo/lição carregada no Firestore.
- **When**: (1) Function A invoca `POST /api/progress/:lessonId` body `{status:"COMPLETED", score:0.9}` → 200 OK. (2) Esperar 5min ou forçar novo cold-start (deploy trigger). (3) Function B invoca `GET /api/progress` → lista.
- **Then**: Step 3 retorna lessonId marcado COMPLETED, completed_at timestamp > step1 horário. NÃO volta para não-iniciado após cold-start (garante que não é SQLite /tmp).
- **Pass Condition**: Dado persiste entre Functions invocações separadas.
- **Evidence**: 2 curl requests com horários separados, retorno GET progress contém a lição.

### AC-6: Migração 1-shot idempotente, backup criado, counts 1:1
- **Type**: `rule`
- **Given**: `training.db` SQLite legado preenchido existe. Variaveis Firebase config válidas.
- **When**: Executar 4 passos:
  1. `node scripts/migrate_sqlite_to_firestore.cjs --dry-run` → stdout counts tabelas.
  2. `node scripts/migrate_sqlite_to_firestore.cjs --force` → migração real.
  3. Rodar NOVA execução SEM flag `--force`.
  4. Contar `SELECT COUNT(*) FROM users` SQLite vs `collection('users').count()` Firestore.
- **Then**: (1) exit 0 + counts impressos. (2) backup .zip criado e > 0 bytes. exit 0 + "MIGRAÇÃO OK" counts 1:1 TODAS tabelas. (3) 100% logs SKIP. 0 inserts. (4) counts users SQLite = Firestore (dif = 0) para pelo menos 8 tabelas principais.
- **Pass Condition**: Idempotência e integridade validada.
- **Evidence**: stdout script 3 execuções + `ls -la backup-*.zip` + screenshot counts.

### AC-7: NENHUMA referência a better-sqlite3, openDb(), db.prepare() no runtime de rotas
- **Type**: `rule`
- **Given**: Código implementado.
- **When**: Rodar `grep -n "openDb\|better-sqlite3\|db.prepare" server/ -r` (ignorar database-legacy se existir)
- **Then**: 0 matches em arquivos `.cjs` de `server/routes/`, `server/middleware/`, `server/index.cjs`, `server/repositories/` (repositórios não usam SQLite).
- **Pass Condition**: Grep exit 1 (zero matches). Apenas `scripts/migrate_sqlite_to_firestore.cjs` PODE usar `require('better-sqlite3')` (script legado de migração, não runtime).
- **Evidence**: Saída do grep.

### AC-8: Certificado com número sequencial e validação pública funcionando
- **Type**: `rule`
- **Given**: Usuário com simulado APROVADO (score >=23).
- **When**: (1) Gerar certificado `POST /api/certificates` → 201. (2) Validar número via rota PÚBLICA (sem token) `GET /validar/:number` ou `GET /api/certificates/validate/:number`.
- **Then**: (1) certificado criado com número CERT-XXXX sequencial, doc Firestore `certificates/{id}`. (2) Página pública retorna validação sucesso com nome, curso, data. Tentar gerar duplicado do mesmo certificado (mesmo usuário + mesma approval) = 409.
- **Pass Condition**: Número sequencial, duplicata bloqueada, validação pública funciona sem autenticação.
- **Evidence**: curl POST certificado + GET validação.

### AC-9: Audit logs criados para todas as operações sensíveis (login, register, promote, promote ADMIN, submit simulado)
- **Type**: `rule`
- **Given**: Sistema funcionando.
- **When**: Realizar login, register, promoção ADMIN, submit simulado.
- **Then**: Coleção `audit_logs` no Firestore tem pelo menos 1 doc `entity_type=USER action=LOGIN`, 1 `REGISTER`, 1 `PROMOTE_ADMIN`, 1 `QUIZ_SUBMIT` correspondentes. Auditoria filtra por `GET /api/audit?entity_type=USER` e retorna array com docs.
- **Pass Condition**: Count audit_logs > 0 após operações sensíveis; rota /api/audit retorna array > 0 items ADMIN.
- **Evidence**: Firestore console audit_logs collection + curl /api/audit ADMIN.

### AC-10: Zero quebra de contrato API (repetibilidade)
- **Type**: `rule`
- **Given**: Suíte de testes atual `tests/test_api.cjs`, `tests/test_progress.cjs`, `tests/test_audit.cjs` (se existentes) adaptados para Firestore.
- **When**: Rodar `node tests/test_api.cjs && node tests/test_progress.cjs && node tests/test_audit.cjs`
- **Then**: 0 failures. Todos os asserts passam (adaptados para Firestore). Caso NÃO existam testes automatizados, substituir por: script curl equivalente `scripts/smoke_contract.cjs` que exercita 20 endpoints e compara shape JSON com snapshots pré-salvos.
- **Pass Condition**: Todos os testes PASS. 0 failures, 0 exceptions não tratadas.
- **Evidence**: Stdout scripts de teste.

### AC-11: Qualidade Arquitetura — Repository Pattern (acoplamento)
- **Type**: `rubric`
- **Dimension**: Isolamento camada Firestore (handlers HTTP NÃO sabem detalhes do SDK Firestore)
- **Scale**: 1-5
- **Anchors**:
  - `1` = rotas `server/routes/*.cjs` chamam `admin.firestore().collection('xxx')` inline em toda parte
  - `3` = arquivo central `firestore_db.cjs` exporta getDb, mas rotas ainda usam refs `db.collection()` inline
  - `5` = Toda leitura/escrita é `AuthRepo.findUserByEmail(...)` / `TrainingRepo.listModules()` / `QuizRepo.saveAttempt(...)`. Rotas NÃO importam firebase-admin. 0 acoplamento. Trocar Firestore por Postgres amanhã = só reimplementar repositórios, handlers NÃO mudam 1 linha.
- **Pass Threshold**: >= 4
- **Evidence**: Grep "from 'firebase-admin'" or "require('firebase-admin')" em server/routes/ = 0 matches. Grep em server/repositories = matches existem.

### AC-12: Segurança Gestão de Segredos
- **Type**: `rubric`
- **Dimension**: Nenhum segredo hardcodado e commitado no Git
- **Scale**: 1-5
- **Anchors**:
  - `1` = Service account JSON inteiro hardcodado no .env ou arquivos .cjs e commitado no git
  - `3` = Segredos em .env mas service-account não gitignorado OU comentado código contendo secrets
  - `5` = .gitignore contém `firebase-service-account.json`, `training.db`, `backup-pre-migracao*.zip*`. Grep repo (exceto gitignored) 0 matches de `-----BEGIN PRIVATE KEY`, `client_email`, `AIzaSy` em source files. `.env.example` documenta todas keys com placeholders.
- **Pass Threshold**: >= 4
- **Evidence**: `.gitignore` content + grep repo por secrets pattern.

### AC-13: Observabilidade Startup
- **Type**: `rubric`
- **Dimension**: Logs de startup são claros, indicam ambiente, Firebase status, warnings de JWT default, rate limit MemoryStore.
- **Scale**: 1-5
- **Anchors**:
  - `1` = Nenhum log, só erro genérico.
  - `3` = Logs mas warnings faltando, Firebase status ambíguo.
  - `5` = `npm start` ou `vercel dev` startup exibe, em ordem: Ambiente, Porta, Health URL, Firebase project_id e status (inicializado/sim/não). WARNING colorido para JWT_SECRET default e rate limit MemoryStore.
- **Pass Threshold**: >= 4
- **Evidence**: Stdout npm start ou vercel dev.

---

Fim do spec.md.
