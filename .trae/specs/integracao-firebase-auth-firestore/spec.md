# Integração Firebase Auth + Firestore - Product Requirements Document

## Overview
- **Summary**: Migração FULL do sistema HUB Training (autenticação de contas + armazenamento de dados) para a plataforma Firebase Google substituindo 100% as camadas locais atuais: (1) bcrypt + JWT do Node são substituídos por Firebase Authentication; (2) banco SQLite `training.db` acessado via `better-sqlite3` no Node e `sqlite3` nativo no Python são substituídos por Firebase Firestore. O gerenciamento das contas e dos dados é feito via console do projeto `hub-training-2200d`.
- **Purpose**: Centralizar a gestão de contas de usuário (cadastro, login, redefinição de senha, bloqueio, MFA futuro) e dos dados treinamento/avaliação em plataforma SaaS gerenciada (multi AZ, backup automático, recuperação ponto-no-tempo, segurança por IAM e regras de segurança, trilha de auditoria nativa).
- **Target Users**: (a) ADMINISTRADOR do treinamento — operações de gestão de conteúdo e visualização de resultados; (b) PROFISSIONAL/STUDENT — estudo da cartilha digital e realização de simulado.

## Goals
1. **Gerenciamento de Contas**: Cadastro, autenticação, perfil e recuperação de senha de todos os usuários do sistema passam a ser de responsabilidade exclusiva do **Firebase Auth** do projeto `hub-training-2200d`.
2. **Armazenamento de Dados**: 100% das entidades atualmente persistidas em `training.db` (governança, infra, treinamento, simulado, auditoria, compatibilidade) passam a ser persistidas exclusivamente no **Firestore** (coleções aninhadas, documentos, campos tipados).
3. **Migração 1-shot**: Script idempotente exporta `training.db` inteiro e grava nas coleções do Firestore, preservando integridade referencial (foreign keys → `uid`/docRefs quando aplicável).
4. **Substituição de camada de acesso a dados**: Todos os endpoints do Node/Express (`server/routes/*.cjs`) que hoje consultam/alteram SQLite via `openDb()`/`better-sqlite3` são refatorados para usar **Firebase Admin SDK** (`@google-cloud/firestore`). Todas as rotas do Python WSGI (`app.py`) que hoje consultam/alteram SQLite via `sqlite3` são refatorados para usar **Admin SDK Python** (`firebase-admin`).
5. **Preservação Regras de Negócio**: 100% das regras de segurança funcionais são mantidas intactas: RBAC ADMIN/STUDENT, `PASS_SCORE=23` simulado, IDOR block via `requireSelfOrAdmin`, STUDENT sem gabarito/score detalhado, `PENDING_TECHNICAL_VALIDATION` exibido nas views obrigatórias.
6. **Entrada para Dashboard na Home WSGI**: Tela principal do `app.py` (rota `/` servida do `home.html`) exibe botão CTA proeminente + link no nav superior para o SPA `/dashboard`. (Entregue antecipadamente: ver Completion Evidence em tasks).

## Non-Goals (Fora do escopo — NÃO implementar nesta fase)
- **Migração de senhas** bcrypt existentes (hash one-way impossível de reverter; usuários antigos devem usar Redefinir Senha do Firebase).
- **Dual-stack SQLite+Firestore pós-migração**: SQLite é descontinuado no runtime após sucesso da migração 1-shot.
- **OAuth social login**: Google, Apple, Microsoft, SSO corporativo etc. serão futuras fases separadas.
- **Firebase Storage**: Imagens, fluxogramas, assets continuam servidos via `/static/*` local; Storage fica para fase posterior.
- **Firebase Functions / Extensões**: Regras de negócio continuam em Node/Express e Python WSGI; Functions é futura fases.
- **Firebase Hosting**: Frontend continua servido pelo Node Express local; Hosting é fase futura.
- **Analytics / Performance Monitoring**: Crashlytics/Analytics ficam para fase posterior.
- **Alterações UX/CSS**: Nenhuma refatoração de UI ou classes CSS nesta fase.
- **Realtime Database**: Escolhido Firestore; RTDB não é usado.

## Background & Context
- **Sistema atual**: Dual backend com (a) Python WSGI `app.py` (rotas `/`, `/simulado`, `/admin/*` para versão legada simulado simples + painel ADM antigo) e (b) Node/Express `server/index.cjs` (SPA `/dashboard`, REST API `/api/*` para autenticação JWT, training, quiz, progress, checkpoints, audit, equipment, images, dashboard). Ambos compartilham SQLite `training.db`.
- **Estrutura SQLite atual**: 17 tabelas (roles, users, permissions; equipment_types, technical_equipment, equipment_relationships; training_modules, training_lessons, lesson_progress, lesson_checkpoints, checkpoint_options, checkpoint_answers; questions, question_options, quiz_attempts, quiz_answers; audit_logs, content_versions; tabela legada attempts).
- **Decisões do usuário (AskUserQuestion 2026-09-16)**: (1) Escopo Full Migration Auth + Dados; (2) Firestore como banco; (3) Migração 1-shot tudo; (4) Credenciais (Client SDK config + Service Account JSON) fornecidas pelo usuário via `.env`/`firebase-service-account.json`.
- **Tarefa entregue ANTES do spec (baixo risco, sem ambiguidade)**: Botão/link Dashboard na home WSGI já implementado em `home.html` (nav topbar + hero CTA) e `app.py` (builder `page()` nav). Completion Evidence: task 2 `tasks.md`.

## Functional Requirements (FRs)

### Autenticação e Contas
- **FR-A1 — Registro novo usuário**: Endpoint POST `/api/auth/register` cria usuário no Firebase Auth (email/senha) E cria doc correspondente na coleção `users` do Firestore com `role=STUDENT`, `is_active=true`, metadados de auditoria. Replicar comportamento atual: não existe auto-cadastro de ADMIN (só por promoção via endpoint admin).
- **FR-A2 — Login**: POST `/api/auth/login` valida credenciais via Firebase Auth, recebe `idToken` do cliente ou valida server-side via Admin SDK, consulta doc `users` Firestore para role/status, retorna JWT próprio ou Firebase idToken+claims customizadas. Mantém contrato atual do payload de resposta: `{token, expiresIn, user:{id,email,name,role}}`.
- **FR-A3 — Logout**: POST `/api/auth/logout` registra trilha auditoria e instrui cliente a descartar token. Se Firebase usado: revoga refreshToken do usuário.
- **FR-A4 — Promover ADMIN**: Endpoint ADMIN-only promove usuário existente para role ADMIN (atualiza claims customizadas Firebase Auth + doc Firestore users).
- **FR-A5 — Inativar/Bloquear usuário**: ADMIN pode `is_active=false`; middleware rejeita token de usuário inativo (igual middleware atual).
- **FR-A6 — Redefinição de Senha**: Acessível via tela login (link Firebase padrão ou tela custom) — usuários antigos do SQLite usam este fluxo para definir 1ª senha no Firebase.
- **FR-A7 — /api/auth/me**: GET com token válido retorna `req.user` completo, mesmo contrato atual.

### Camada de Dados (Firestore)
- **FR-D1 — Esquema Firestore idêntico à semântica SQLite**: Coleções top-level: `roles`, `users`, `permissions`, `equipment_types`, `technical_equipment`, `equipment_relationships`, `training_modules`, `training_lessons`, `lesson_progress`, `lesson_checkpoints`, `checkpoint_options`, `checkpoint_answers`, `questions`, `question_options`, `quiz_attempts`, `quiz_answers`, `audit_logs`, `content_versions`, `attempts_legacy`. Campos de cada coleção 1:1 mapeados das colunas SQLite atuais (tipos: string, number, bool, timestamp, array, map quando aplicável).
- **FR-D2 — Chaves estrangeiras → referências ou field id**: relações 1:N usam fields `xxx_id` (mantido por compatibilidade com código existente) e opcionalmente `DocumentReference` como campo adicional; N:N usa array de refs ou collection group.
- **FR-D3 — Integridade na migração**: Script lê cada tabela SQLite inteira, valida tipos, gera docId determinístico (`id` INTEGER SQLite = documentId string por padrão) e grava via batch Firestore em chunks de 500 (limite do batch).
- **FR-D4 — Idempotência migração**: Antes de inserir, script verifica existência docId; se existente, SKIP (não sobrescreve) — exceto se flag `--force` informada.
- **FR-D5 — Unicidades**: Constraints UNIQUE SQLite (ex: `users.email`) são replicados no app-layer (query pré-insert) E via **Regras de Segurança Firestore** válidas server-side.

### Endpoints Node/Express (refatoração acesso a dados)
- **FR-EN1 — Todas as rotas `/api/*`** que hoje usam `const db = openDb()` (better-sqlite3) agora usam `const db = getFirestore()` do Admin SDK. Assinatura e payload de resposta são PRESERVADOS (não quebra contrato API com dashboard SPA).
- **FR-EN2 — RBAC middleware intacto**: `authenticateToken`, `requireRole(...roles)`, `requireSelfOrAdmin(getId)` permanecem como middleware de rotas; a única mudança é `u = firestore().collection('users').doc(sub).get()` no lugar de `db.prepare(...).get()`.
- **FR-EN3 — PASS_SCORE=23 simulado**: Constante em `server/routes/quiz.cjs:L5` preservada; payload STUDENT = `{attempt_id, result: APROVADO|NÃO APROVADO}`; payload ADMIN = score/gabarito/acertos completos — inalterado.
- **FR-EN4 — Auditoria**: Toda operação de escrita grava doc em coleção `audit_logs` Firestore (campos idênticos à tabela atual). Rotas `/api/audit/*` continuam funcionando.

### Python WSGI (app.py refatoração)
- **FR-EP1 — init_db, save_attempt, rows**: Funções `sqlite3.connect(DB_PATH)` substituídas por `firestore.client()` do SDK Admin Python. Operações: `attempts` tabela legada → coleção `attempts_legacy` Firestore.
- **FR-EP2 — admin_auth**: Sessão por cookie `adm_session` em `SESSIONS` dict é mantida, MAS validação de senha ADMIN pode usar doc Firestore ou claims customizadas Firebase.
- **FR-EP3 — Rotas WSGI /, /simulado, /admin/***: HTML retornado e contrato de redirect são PRESERVADOS 1:1. A única mudança é camada de persistência.
- **FR-EP4 — Botão Dashboard já entregue**: home.html e builder `page()` já exibem nav link + CTA para `/dashboard` (implementado previamente). Se Firebase requer SDK JS no cliente: inserir `<script>` no builder/HTML existente.

### Operações de Migração
- **FR-M1 — Script migrate_firestore.cjs**: Node standalone que (a) lê tabelas; (b) valida tipos; (c) grava Firestore em batches. Aceita flags: `--dry-run` (log só), `--force` (sobrescreve docs existentes), `--tables roles,users,...` (filtrar tabelas).
- **FR-M2 — Script migrate_firestore.py**: Equivalente Python para coleção `attempts_legacy` usada pelo `app.py` (ou unificar tudo no Node script se possível).
- **FR-M3 — Dump JSON backup**: Antes da migração real, script gera `backup-pre-migracao.json.zip` completo do SQLite para rollback manual se necessário.

## Non-Functional Requirements (NFRs)
- **NFR-1 — Segurança Credenciais**: Service Account JSON (.json privado) NÃO vai para Git. Salvo em `./firebase-service-account.json` listado no `.gitignore`. Lido via `GOOGLE_APPLICATION_CREDENTIALS` env var ou path absoluto.
- **NFR-2 — Config Client SDK**: apiKey/authDomain/projectId etc. armazenados em variáveis `.env` (FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN etc.); NÃO hardcoded em arquivos de origem.
- **NFR-3 — Idempotência Seeds**: Seeds de integração cartilha já existentes (`database/seed_cartilha_*.cjs`) passam a operar em Firestore; marcadores anti-duplicata (`CARTILHA_APPENDED_v1`) permanecem.
- **NFR-4 — Performance p95**: CRUD treinamento/simulado < 500ms por requisição em Firestore região `southamerica-east1` (São Paulo).
- **NFR-5 — Disponibilidade e Durabilidade**: Dados Firestore = multi-AZ nativo GCP; recovery point-objective < 10min (nativo PITR se habilitado).
- **NFR-6 — Compatibilidade API**: Zero quebra de contrato com SPA `/dashboard` e com cliente mobile/futuro. Mesmos status code, mesmos keys de JSON.
- **NFR-7 — Logs e Observabilidade**: Falhas Firestore são logadas com `console.error` no Node e `sys.stderr.write` no Python; stack trace completo nunca exposto ao cliente (HTTP 500 genérico).
- **NFR-8 — Graceful Shutdown**: Servidor Node fecha conexão Firebase Admin antes de sair; Python app.py fecha SDK admin no bloco `finally` (como já faz hoje para `server_close()`).

## Constraints
- **Técnicas**:
  1. **Dependências novas permitidas**: `firebase-admin` (Node), `firebase` (client-side SDK JS opcional), `@google-cloud/firestore` (opcional se incluso no admin), `firebase-admin` (Python SDK pip).
  2. Nenhuma outra dependência nova instalada.
  3. Pilha servidores preservada: dual stack (Python WSGI + Node Express) NÃO é unificada nesta fase.
  4. Firestore modo Native (não Datastore); coleções no mesmo projeto Firebase `hub-training-2200d`.
  5. Python `app.py` usa SQLite `training.db` local → APENAS no runtime pré-migração; pós-migração com sucesso, `DB_PATH` é desativado via env var `DISABLE_LOCAL_SQLITE=1` (opcional).
- **Negócio**:
  1. `PASS_SCORE=23` é imutável nesta fase.
  2. Nenhum papel novo adicionado; apenas ADMIN e STUDENT.
  3. Gabarito `is_correct` de simulado/checkpoints NUNCA é retornado no payload STUDENT.
  4. `PENDING_TECHNICAL_VALIDATION` permanece visível nas 4 views obrigatórias.
- **Dependências Externas**:
  1. Projeto Firebase `hub-training-2200d` já existe (console URL fornecido pelo usuário).
  2. Usuário entrega Service Account JSON com permissões: Firebase Admin, Cloud Datastore User (para Firestore), Firebase Rules Editor (opcional).
  3. Usuário entrega Client SDK config completo (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId opcional).

## Assumptions
1. **Usuário entrega credenciais no início da Implementação**: arquivos `.env` atualizados + `firebase-service-account.json` na raiz do projeto.
2. **Firestore região `southamerica-east1` (SP)**: se região diferente, nenhum código muda, apenas latência percebida (NFR-4 pode ter valor ajustado).
3. **Usuários antigos aceitam Redefinir Senha**: não existe forma técnica de migrar bcrypt → Firebase password; comunicação prévia com usuários.
4. **Quota Firestore Spark/Blaze**: usuário garante que plano cobre a gravação da migração 1-shot (~20k reads/writes para conteúdo pequeno).
5. **Credenciais Python SDK**: `pip install firebase-admin` no ambiente do usuário já disponível; se não, será criado `requirements.txt` mínimo.

## Open Questions
- **[ ] Q1** (Bloqueante p/ Implementação): Data e hora que o usuário fornece as credenciais (`.env` novo + `service-account.json`). Implementação da integração Firebase real NÃO começa sem credenciais reais.
- **[ ] Q2**: Após sucesso da migração 1-shot, usuário quer arquivo `training.db` ser movido para `archive/training.db-YYYYMMDD.bak` (backup) ou mantido como está? (Não-blockeante: será decidido antes rodar script migração).
- **[ ] Q3**: ADMIN-ONLY do `app.py` — usuário quer manter login por cookie `adm_session` (sessão in-memory) OU migrar completamente para token Firebase no lado admin WSGI também? (Default recomendado: manter sessão in-memory p/ simplicidade; login WSGI admin via senha doc Firestore).

---

## Acceptance Criteria

### AC-1: Login novo usuário via Firebase Auth com role STUDENT
- **Type**: `rule`
- **Given**: Endpoint `/api/auth/register` recebe `{email, password, name}` válido
- **When**: Requisição POST executada
- **Then**: (a) Usuário é criado no Firebase Auth; (b) doc criado em `users/{id}` Firestore com `role=STUDENT`, `is_active=true`; (c) resposta HTTP 201 com `{id, email, name}` — keys idênticas ao contrato atual
- **Pass Condition**: Auditoria `test_api.cjs` equivalente PASS: `POST /api/auth/register + GET /api/auth/me + POST /api/auth/login` = 200 + user role STUDENT
- **Evidence**: Execução `node tests/test_api.cjs` + inspeção Firestore console ou `node -e` query

### AC-2: Promoção ADMIN só por endpoint Admin
- **Type**: `rule`
- **Given**: Usuário STUDENT existe
- **When**: (a) Usuário STUDENT chama endpoint de promoção → 403; (b) Usuário ADMIN chama mesmo endpoint → 200
- **Then**: Role alterado no doc Firestore + claims customizadas Firebase atualizadas. ADMIN agora acessa rotas `requireRole('ADMIN')`. STUDENT bloqueado por 403.
- **Pass Condition**: 403 para STUDENT, 200 para ADMIN em endpoint promoção
- **Evidence**: Request via curl ou test automatizado

### AC-3: Simulado - STUDENT NÃO recebe gabarito/is_correct; ADMIN recebe tudo. PASS_SCORE=23.
- **Type**: `rule`
- **Given**: Tentativa simulado realizada: score=22, score=23, score=30
- **When**: `GET /api/quiz/attempt/:id` com role STUDENT e role ADMIN
- **Then**: (a) STUDENT recebe `{attempt_id, result:NÃO APROVADO|APROVADO}` SOMENTE — NÃO existe key `score`, NÃO existe key `is_correct`, NÃO existe key `answers`; (b) ADMIN recebe payload COMPLETO; (c) 22=NÃO APROVADO, 23=APROVADO, 30=APROVADO
- **Pass Condition**: Mesmo contrato validado por `test_api.cjs` equivalente (score 22/23/30)
- **Evidence**: Execução `test_api.cjs` ou `curl`

### AC-4: Progresso de lições gravado/lido do Firestore com integridade
- **Type**: `rule`
- **Given**: Usuário logado
- **When**: `POST /api/progress/:lessonId` com `{status:COMPLETED}`
- **Then**: doc `lesson_progress/{user_lesson_unique}` no Firestore é atualizado com status=COMPLETED e completed_at timestamp; `GET /api/progress` retorna mesmo valor em menos de 500ms
- **Pass Condition**: `test_progress.cjs` equivalente PASS (8 testes de progresso)
- **Evidence**: `node tests/test_progress.cjs`

### AC-5: Migração 1-shot idempotente + validação counts
- **Type**: `rule`
- **Given**: `training.db` populado (17 módulos, 18 lições, papéis ADMIN/STUDENT, etc.)
- **When**: (a) Rodar `node database/migrate_firestore.cjs --dry-run`; (b) rodar `--force` 1ª vez; (c) rodar NOVAMENTE sem `--force` 2ª vez
- **Then**: (a) Log counts tabelas; (b) counts Firestore = counts SQLite 1:1 todas tabelas; (c) 2ª execução = TODOS SKIPs, 0 inserts duplicados
- **Pass Condition**: Contagens `SELECT COUNT(*) FROM X` SQLite == `db.collection(X).count().get()` Firestore
- **Evidence**: Log stdout script + query console Firebase

### AC-6: home.html e app.py exibem link + CTA para Dashboard em todas as rotas
- **Type**: `rule`
- **Given**: GET `/` e GET `/simulado` e GET `/admin/login`
- **When**: Inspecionar HTML retornado
- **Then**: (a) topbar nav contém `<a href="/dashboard">Dashboard</a>` em TODAS as páginas (home + page builder interno); (b) hero section home contém 1 botão CTA primary `<a class="btn primary" href="/dashboard">Abrir Dashboard HUB</a>`
- **Pass Condition**: Grep por `href="/dashboard"` retorna >= 2 matches em home.html e no output string do `page()` builder
- **Evidence**: `grep -n "href=\"/dashboard\"" home.html app.py` — 3+ matches
- **Situação**: Já IMPLEMENTADO ANTES do spec (ver Task 2 tasks.md)

### AC-7: Regras de segurança Firestore server-side bloqueiam writes STUDENT
- **Type**: `rule`
- **Given**: Usuário STUDENT com client SDK tenta gravar `training_modules`
- **When**: `db.collection('training_modules').add(...)` via client
- **Then**: Rejeitado 403 Permission Denied (não passa regras Firestore server-side)
- **Pass Condition**: Regras Firestore publicadas e validação de tentativa de escrita negada
- **Evidence**: `firebase deploy --only firestore:rules` + curl ou test SDK cliente simulando STUDENT

### AC-8: Rotas Python WSGI /simulado (/submit) gravam attempts no Firestore (não mais SQLite)
- **Type**: `rule`
- **Given**: POST `/simulado` no app.py com `candidate=Teste+Candidato` + 30 respostas (23+)
- **When**: Requisição encerrada
- **Then**: (a) NENHUMA conexão SQLite aberta (verificar log de depuração ou wrapper); (b) doc novo em `attempts_legacy/{id}` Firestore com score/passed
- **Pass Condition**: `attempts_legacy` count aumenta após POST; `training.db` arquivo NÃO tem arquivo `-wal` atualizado pós-migração (nenhuma escrita SQLite)
- **Evidence**: Arquivo training.db-wal tamanho inalterado após submit simulado; Firestore console.

### AC-9: Zero regressão - suíte de testes automatizados equivalente PASS
- **Type**: `rule`
- **Given**: Integração Firebase pronta
- **When**: Rodar `node tests/test_api.cjs && node tests/test_progress.cjs && node tests/test_audit.cjs`
- **Then**: TODOS PASS, 0 failures
- **Pass Condition**: 25/25 testes PASS (ou equivalente adaptado do original para Firebase)
- **Evidence**: Stdout dos 3 scripts

### AC-10: Qualidade Arquitetura - Separação de Camadas (Repository Pattern)
- **Type**: `rubric`
- **Dimension**: Isolamento Firebase (código não acopla handlers HTTP direto a detalhes Firestore)
- **Scale**: 1-5
- **Anchors**: 1 = rotas chamam `db.collection()` inline em todo lado sem abstração; 3 = arquivo central `server/lib/firestore_repo.cjs` com funções nomeadas, mas handlers ainda usam refs; 5 = repository pattern completo: handlers chamam `repo.getLesson(id)`, `repo.saveProgress(user, lesson, data)` — handlers não sabem se é Firebase ou SQLite (baixo acoplamento, fácil trocar fonte)
- **Pass Threshold**: >= 4
- **Evidence**: Inspeção de código em `server/routes/*.cjs` e `server/lib/*` (ou equivalente)

### AC-11: Segurança Credenciais (NENHUMA secret hardcodada)
- **Type**: `rubric`
- **Dimension**: Gestão de segredos
- **Scale**: 1-5
- **Anchors**: 1 = apiKey/service-account hardcoded em arquivos JS/PY e cometidos no git; 3 = segredos em .env, mas service-account.json não gitignorado; 5 = todas as credenciais em .env/service-account.json, TUDO listado em .gitignore, NENHUM match `AIza`, `-----BEGIN PRIVATE KEY-----`, `client_email` em grep de arquivos de origem exceto arquivos gitignorados
- **Pass Threshold**: >= 4
- **Evidence**: Grep todo repo por secrets e .gitignore content

---
Fim do spec.md
