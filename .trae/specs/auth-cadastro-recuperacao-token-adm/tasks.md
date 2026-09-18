# HUB Training — Autenticação Completa: Implementation Plan

## Task 1: Migração DB — Criar tabelas `invite_tokens` e `password_reset_tokens`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Criar arquivo `database/migrations/0003_auth_tokens.sql` idempotente com:
    - `CREATE TABLE IF NOT EXISTS invite_tokens (id INTEGER PK, token TEXT UNIQUE NOT NULL, email_restriction TEXT, created_by INTEGER, max_uses INTEGER DEFAULT 1, remaining_uses INTEGER DEFAULT 1, revoked INTEGER DEFAULT 0, revoked_by INTEGER, revoked_at TEXT, used_by INTEGER, used_at TEXT, expires_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)` + índice em token.
    - `CREATE TABLE IF NOT EXISTS password_reset_tokens (id INTEGER PK, token TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL, used_by INTEGER, used_at TEXT, revoked INTEGER DEFAULT 0, expires_at TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)` + índice em token e user_id.
  - Atualizar `database/migrate.cjs` para rodar `0003_auth_tokens.sql` APÓS `0001_initial_schema.sql` e `0002_add_unique_constraint.cjs` (append-only).
  - Executar a migração contra `training.db` e confirmar que `sqlite_master` tem as 2 novas tabelas.
- **Acceptance Criteria Addressed**: AC-1, AC-3, AC-4 (dependência de persistência)
- **Test Requirements**:
  - `rule` TR-1.1: Rodar `node database/migrate.cjs` duas vezes consecutivas → exit code 0 ambas (idempotência).
  - `rule` TR-1.2: `SELECT name FROM sqlite_master WHERE name IN ('invite_tokens','password_reset_tokens')` → 2 rows.
  - `rule` TR-1.3: `PRAGMA index_list(invite_tokens)` → contém índice sobre token.
- **Notes**: Manter compatibilidade com dados existentes; não DROP nem ALTER tabelas existentes.

## Task 2: Rotas de Auth — Atualizar `/api/auth/register` (exige invite_token) + adicionar reset/request e reset/confirm
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Atualizar [auth.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/routes/auth.cjs):
    - `POST /api/auth/register`: adicionar require de `invite_token`; validar tabela `invite_tokens` (exists, remaining_uses > 0, expires_at > now, revoked=0, email_restriction compatível); após insert user → decrement remaining_uses, set used_by e used_at se max_uses=1.
    - Novo `POST /api/auth/reset/request`: body `{email}` → sempre retorna 200 com mensagem genérica; se email existe → cria token (máx 3 ativos por user antes de expirar) e **retorna token no JSON de resposta** (sinaliza com `token_visible_for_copy: true`).
    - Novo `POST /api/auth/reset/confirm`: body `{token, new_password, confirm_password}` → valida; atualiza hash; marca token.
  - Manter compatibilidade: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` inalterados.
  - Todas as ações emitem audit_logs via SQL insert + syncAuditLog.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-5, AC-7
- **Test Requirements**:
  - `rule` TR-2.1: Register SEM invite_token → 400.
  - `rule` TR-2.2: Register COM token válido → 201 + token marcado used_by.
  - `rule` TR-2.3: Login user is_active=0 → 401.
  - `rule` TR-2.4: Reset request + confirm 2x → 1ª 200, 2ª 400.
  - `rule` TR-2.5: Reset request com email inexistente → 200 (sem token no JSON).
  - `rubric` TR-2.6: Auditabilidade das actions; escala 0-2 (1=register audita, 2=register+reset+login audita), threshold >= 2, evidence: SELECT COUNT FROM audit_logs action = X.
- **Notes**: bcrypt rounds = 10 (mantido). Nunca logar senha plaintext.

## Task 3: Rate limit aprimorado para endpoints de auth
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: None
- **Description**:
  - Em [index.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/index.cjs), criar 3 limiters específicos:
    - `authLoginLimiter`: 10 / 15min → aplicado em `/api/auth/login`.
    - `authRegisterLimiter`: 10 / 15min → aplicado em `/api/auth/register`.
    - `authResetLimiter`: 5 / 15min → aplicado em `/api/auth/reset/request` e `/api/auth/reset/confirm`.
  - Aplicar via `router.post('/login', authLoginLimiter, handler)` no auth.cjs (passar como import ou definir em módulo).
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-3.1: 11 POSTs rápidos para `/login` com credenciais inválidas → 11ª é 429.
- **Notes**: Usar `express-rate-limit` já em dependências (não adicionar libs).

## Task 4: Rotas Admin — `invite-tokens` (CRUD), `/users/:id/reset-token`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Atualizar [admin.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/routes/admin.cjs):
    - `POST /api/admin/invite-tokens`: body `{email?, ttl_hours?:168, max_uses?:1}` → `crypto.randomBytes(16).toString('hex')` (32 chars). Valida max_uses >= 1 && <= 1000.
    - `GET /api/admin/invite-tokens`: query `?status=active|used|revoked|expired|all (default)` → select com join a users.
    - `PATCH /api/admin/invite-tokens/:id/revoke`: marca revoked=1.
    - `POST /api/admin/users/:id/reset-token`: cria password_reset_token para user_id X e retorna token (1h TTL).
  - Auditoria: INVITE_TOKEN_CREATE, INVITE_TOKEN_REVOKE, ADMIN_PASSWORD_RESET_REQUEST.
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-4.1: POST invite-tokens (sem JWT ADMIN) → 401/403.
  - `rule` TR-4.2: POST convite → 201 + token 32-hex; GET status=active → contém o token.
  - `rule` TR-4.3: PATCH revoke → GET status=revoked retorna o token.
  - `rule` TR-4.4: POST users/:id/reset-token → retorna token 40 chars e tabela password_reset_tokens tem row.

## Task 5: Rotas HTML públicas e template engine — `/login`, `/register`, `/reset`, `/admin/login`
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Em [index.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/index.cjs), adicionar 4 rotas:
    - `GET /login` → `sendFile(static/login.html)`
    - `GET /register` → `sendFile(static/register.html)`
    - `GET /reset` → `sendFile(static/reset.html)`
    - `GET /admin/login` → `sendFile(static/admin_login.html)`
  - Copiar e converter `templates/admin_login.html` para `static/admin_login.html` (HTML estático com fetch client-side, sem SSR template blocks).
- **Acceptance Criteria Addressed**: AC-6
- **Test Requirements**:
  - `rule` TR-5.1: GET 4 rotas → 200 + Content-Type text/html + `<form` presente.
- **Notes**: Manter rota `/admin/login` distinta de `/login` (ADM é só administradores).

## Task 6: Criar HTML `/login` — tela de acesso pública com links
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Criar `static/login.html`: inputs email (type=email required), senha (type=password required, minlength=6), botão "Entrar".
  - Client-side: submit via `fetch('/api/auth/login')`; sucesso → `localStorage.setItem('token', r.token)` + `location.href = '/dashboard'`; erro → mensagem em `<div id="error" role="alert" aria-live="polite">`.
  - Links no rodapé: "Esqueci minha senha → /reset", "Sou novo / Quero me cadastrar → /register".
  - CSS: usar `static/style.css` + estilos inline; a11y: `<label for>` em cada input, `aria-describedby` apontando para error/mensagens; focus outline visível (não remover).
- **Acceptance Criteria Addressed**: AC-2, AC-6, AC-8
- **Test Requirements**:
  - `rule` TR-6.1: grep por `<label for=` → pelo menos 2 ocorrências.
  - `rule` TR-6.2: grep por `aria-describedby` → pelo menos 1 ocorrência.
  - `rubric` TR-6.3: Contraste e layout; escala 0-3 (0=sem estilo, 1=inputs alinhados, 2=tipografia e espaçamento, 3=responsivo em 560px), threshold >= 2, evidence: screenshot ou diff.
- **Notes**: Nunca logar password no console. Senhas devem ter autocomplete='current-password'.

## Task 7: Criar HTML `/register` — cadastro com Token de Convite obrigatório
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Criar `static/register.html`: inputs nome, email, senha, confirmar senha, Token de Convite (required, campo destacado com helper "Token fornecido pelo administrador").
  - Validação client-side: senhas iguais, senha min 6, formato email básico.
  - Submit → `POST /api/auth/register` body `{name, email, password, invite_token}`; sucesso → `location.href = '/login?registered=1'`; erro → mostra mensagem.
  - a11y: idem login.
- **Acceptance Criteria Addressed**: AC-1, AC-6, AC-8
- **Test Requirements**:
  - `rule` TR-7.1: HTML contém 5 `<label for>` (name, email, pwd, confirm_pwd, invite_token).
  - `rule` TR-7.2: Submit client-side só dispara após validação (senhas iguais).
- **Notes**: autocomplete: new-password e username conforme MDN.

## Task 8: Criar HTML `/reset` — fluxo de 2 etapas (pedido + confirmação)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5
- **Description**:
  - Criar `static/reset.html`: duas views renderizadas dinamicamente (ocultar/show divs):
    - View A (Pedido): campo email + botão "Gerar Token de Reset". Submit → `POST /reset/request` → sucesso: exibe mensagem grande tipo card com `<code id="reset-token">${token}</code>` + botão "Copiar" (navigator.clipboard).
    - View B (Confirmação): campos token (preenchível via ?token=), nova senha, confirmar. Submit → `POST /reset/confirm` → sucesso: `location.href='/login?reset=1'`.
  - Acessibilidade: foco movido para o card do token após geração (`.focus()`).
- **Acceptance Criteria Addressed**: AC-3, AC-6, AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-8.1: HTML tem ambas views (A e B) com IDs distintos.
  - `rule` TR-8.2: ?token=abcd preenche o campo automaticamente via DOMContentLoaded.
  - `rubric` TR-8.3: UX do token copiável; escala 0-2 (0=só texto, 1=botão copiar, 2=botão copiar + feedback "Copiado!"), threshold >= 2.

## Task 9: Atualizar tela ADM (templates/admin.html + static) — Gestão de Tokens de Convite e Reset Manual
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 4
- **Description**:
  - Ler `templates/admin.html` atual e adicionar 2 seções/abas:
    - "Tokens de Convite": formulário de criação (email opcional, TTL horas, usos máximos), listagem filtrável por status com botão "Revogar" por linha e "Copiar token".
    - Na listagem de usuários existente: adicionar coluna/ação "Reset de Senha" → abre modal com token + botão copiar.
  - Se `admin.html` for template que é compilado server-side, atualizar também a cópia em `static/` (decisão: manter versão estática em `static/admin.html` e ajustar rota do servidor para ela).
- **Acceptance Criteria Addressed**: AC-4, AC-11
- **Test Requirements**:
  - `rule` TR-9.1: Admin HTML contém string "Tokens de Convite" e botão Gerar.
  - `rule` TR-9.2: Admin HTML contém string "Reset de Senha" por linha de usuário.

## Task 10: Testes de aceitação automatizados e arquivo de smoke test
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Tasks 1, 2, 3, 4, 5, 6, 7, 8, 9
- **Description**:
  - Criar `tests/test_auth_full.cjs` cobrindo:
    1. Geração de token convite (ADM) → cadastro usando (201) → 2ª tentativa mesmo token (400).
    2. Login OK e is_active=0.
    3. Reset request + confirm + 2-uso (expira/uso).
    4. Revogação de convite (GET revoked retorna).
    5. Rate limit de login: 11 requests → 429.
  - Rodar `node tests/test_auth_full.cjs` → exit 0; todos os steps pass.
  - Executar a suíte final existente `npm run test:final` para garantir não regressão.
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- **Test Requirements**:
  - `rule` TR-10.1: `node tests/test_auth_full.cjs` → exit 0 e output com todos PASS.
  - `rule` TR-10.2: `npm run test:final` → sem regressões (status exit 0).

## Task 11: Documentação — README/.env (JWT_SECRET) e quick start
- **Status**: `pending`
- **Priority**: low
- **Depends On**: None
- **Description**:
  - Se `JWT_SECRET` ainda for o valor default (HUB-TRAINING-SECRET-MUDAR-2026) no `.env` ou middleware, **alertar no log do startup** quando for default (não bloquear).
  - Atualizar [README.md](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/README.md) com uma seção "Autenticação" listando as rotas novas: /login, /register, /reset, /admin/login, /api/admin/invite-tokens.
- **Acceptance Criteria Addressed**: NFR-1 (awareness)
- **Test Requirements**:
  - `rule` TR-11.1: Server startup loga `[AUTH] AVISO: JWT_SECRET usando valor default.` quando default.
  - `rule` TR-11.2: README contém seção "Autenticação" com listagem das 4 rotas HTML + 4 rotas API novas.
