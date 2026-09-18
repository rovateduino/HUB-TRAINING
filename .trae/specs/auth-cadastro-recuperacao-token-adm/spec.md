# HUB Training — Autenticação Completa: Cadastro, Recuperação de Senha e Validação via Token ADM

## Overview
- **Summary**: Implementar três fluxos no sistema HUB Training: (a) tela pública de login com links para cadastro e recuperação; (b) cadastro de profissional que **exige um Token de Convite pré-gerado pelo ADM** (sem token válido, cadastro é rejeitado); (c) recuperação de senha via Token de Reset de 1 uso (exibido em tela para cópia, sem SMTP); (d) tela ADM com gestão de Tokens de Convite (criar/listar/revogar) e Tokens de Reset.
- **Purpose**: Fechar a lacuna de autoatendimento atual (não existe tela de cadastro visível, não existe recuperação de senha) e introduzir a **portaria controlada pelo ADM**: só entra no sistema quem o ADM pré-autorizar via token de convite.
- **Target Users**: (1) Profissional STUDENT — acessa /login, /register, /reset e dashboard após ativação; (2) Administrador ADMIN — gestão de tokens e usuários via /admin/login e API /api/admin/*; (3) Sistema — JWT stateless + SQLite persistente + Firestore dual-write.

## Goals
- G1. Qualquer pessoa consegue chegar à tela de login sem token; para se cadastrar, exige Token de Convite válido do ADM.
- G2. Login retorna JWT com role; apenas usuários `is_active=1` conseguem logar.
- G3. Usuário consegue resetar senha sem suporte, usando Token de Reset de 1 uso.
- G4. Tela ADM lista usuários, tokens de convite e tokens de reset com status.
- G5. Toda ação (geração de token, uso, revogação, cadastro, reset) gera entrada em `audit_logs` e sync Firestore quando aplicável.

## Non-Goals
- Não implementar envio de email transacional (SMTP/SendGrid) — tokens são exibidos em tela ou recuperados via tela ADM.
- Não implementar 2FA/MFA.
- Não alterar schema de roles (STUDENT e ADMIN são suficientes).
- Não refatorar o formato do JWT existente (campos `sub, email, role`); apenas adicionar claims não obrigatórios.
- Não alterar a API de `/api/auth/login` existente — compatibilidade absoluta.

## Background & Context
- Estado atual: existe `POST /api/auth/register` aberto (qualquer pessoa cria STUDENT sem autorização).
- Estado atual: `is_active` já existe na tabela users mas não é usado no cadastro — assume-se 1 sempre.
- Estado atual: middleware `authenticateToken` já valida `is_active` no login token-by-token.
- Estado atual: telas HTML `/login` e `/register` não existem; `admin_login` existe (via `/admin/login` rota? Não — atualmente só tem arquivo em templates e /dashboard SPA.
- Hard constraints herdadas do projeto: senha de admin nunca é logada; `PASS_SCORE=23/30`; `is_correct` proibido para STUDENT; SQLite via `better-sqlite3`; sync Firestore em `services/firestoreSync.cjs`.

## Functional Requirements
- **FR-1 (Login Pública)**: Criar rota HTTP `GET /login` → entrega `static/login.html`. Tela tem campos email/senha e links para "Esqueci minha senha" (/reset) e "Quero me cadastrar" (/register). Após submit → `POST /api/auth/login` → salva JWT em `localStorage` → redireciona para `/dashboard`.
- **FR-2 (Cadastro com Token Obrigatório)**: Criar rota HTTP `GET /register` → entrega `static/register.html`. Formulário: nome, email, senha (mín 6), confirmar senha, **Token de Convite (obrigatório)**. Submit → `POST /api/auth/register`.
- **FR-3 (POST /api/auth/register validando Token de Convite)**: Endpoint atual passa a exigir `invite_token` no body. O token é validado: existe em `invite_tokens`, `used_by IS NULL`, `expires_at > NOW`, `revoked=0`. Se válido: cria user STUDENT com `is_active=1`, marca token como usado (`used_by=user.id`, `used_at=NOW`). Se inválido/expirado/usado: 400.
- **FR-4 (Geração de Token de Convite pelo ADM)**: `POST /api/admin/invite-tokens` (auth ADMIN) → body: `email (opcional)`, `ttl_hours (default 168 = 7dias)`, `max_uses (default 1)` → gera token aleatório 32 chars, grava em `invite_tokens`. Retorna `{ token, email_restriction, expires_at, max_uses, remaining_uses }`.
- **FR-5 (Listagem de Tokens de Convite pelo ADM)**: `GET /api/admin/invite-tokens` (auth ADMIN) → query opcional `?status=active|used|revoked|expired` → lista todos os tokens com metadados.
- **FR-6 (Revogação de Token de Convite)**: `PATCH /api/admin/invite-tokens/:id/revoke` (auth ADMIN) → `revoked=1`, registra `revoked_by=admin_id`, `revoked_at=NOW`.
- **FR-7 (Tela ADM: Gestão de Tokens)**: Adicionar aba/seção "Tokens de Convite" na tela ADM existente (templates/admin.html) com: botão "Gerar Token", listagem filtrável por status, botão "Revogar".
- **FR-8 (Recuperação de Senha: Pedido)**: Rota HTTP `GET /reset` → entrega `static/reset.html`. 1ª etapa: informar email → `POST /api/auth/reset/request` → se email existe, gera token e RETORNA em tela (mensagem amigável + botão Copiar). Se email não existe, retorna mensagem genérica mesmo assim (enumeração prevention).
- **FR-9 (Geração e Persistência do Token de Reset)**: `POST /api/auth/reset/request` body `{email}` → cria row em `password_reset_tokens` (token 40 chars, expires_at = +1h, used_by null). Regra: no máximo 3 tokens ativos por email (anti-flood).
- **FR-10 (Reset de Senha: Consumo)**: 2ª etapa do reset ou tela /reset com `?token=` → formulário de nova senha + confirmar. Submit → `POST /api/auth/reset/confirm` body `{token, new_password, confirm_password}` → valida token (exists + used_by=null + expires_at>now + revoked=0) → bcrypt.hash + atualiza `users.password_hash` + marca token usado.
- **FR-11 (Tela ADM: Reset Manual)**: Tela ADM permite, por usuário, ação "Gerar Token de Reset" (chama `POST /api/admin/users/:id/reset-token`) → retorna token em modal com botão copiar. Útil para atendimento.
- **FR-12 (Logout)**: Tela login deve ter logout consistente com rota existente `POST /api/auth/logout`.
- **FR-13 (Rota /admin/login HTML)**: Hoje só existe arquivo templates/admin_login.html — registrar `GET /admin/login` no [index.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/index.cjs) entregando esse HTML com integração de `POST /api/auth/login`.
- **FR-14 (Auditoria obrigatória)**: As ações USER_REGISTER (incluindo token usado), INVITE_TOKEN_CREATE, INVITE_TOKEN_REVOKE, PASSWORD_RESET_REQUEST, PASSWORD_RESET_CONFIRM, LOGIN, LOGOUT geram entrada em audit_logs com IP e user-agent.

## Non-Functional Requirements
- **NFR-1 (Segurança — OWASP Top 10 A07:2021)**: Senhas sempre bcrypt 10+ rounds. Tokens: valor aleatório criptograficamente seguro (crypto.randomBytes → hex), nunca armazenados em log. Never log `password` plaintext em lugar algum (mesmo audit_logs). Rate-limit aplicado: `/api/auth/reset/request` = 5 reqs/15min/IP; `/api/auth/login` e `/register` = 10 reqs/15min/IP.
- **NFR-2 (Segurança — Enumeração Prevention)**: Reset request não revela se email existe; login retorna mensagem genérica "Credenciais inválidas" tanto para email inexistente quanto senha errada; register com token vinculado a email específico retorna 400 se token não bate com email, sem revelar qual o email correto.
- **NFR-3 (Idempotência)**: Migração é idempotente (CREATE TABLE IF NOT EXISTS). Sync Firestore: quando possível, usa os serviços existentes `syncUserUpsert` e `syncAuditLog`; novas entidades (invite_tokens, reset_tokens) não são sincronizadas por padrão (Firestore só recebe entidades críticas).
- **NFR-4 (Performance)**: Todas as tabelas novas têm índices em colunas buscadas: `invite_tokens(token)` UNIQUE, `password_reset_tokens(token)` UNIQUE.
- **NFR-5 (Compatibilidade)**: Clientes existentes que usam `POST /api/auth/login` com credenciais antigas continuam a funcionar sem alterações. A exigência de `invite_token` aplica-se APENAS aos novos usuários; usuários pré-existentes em training.db não são afetados.
- **NFR-6 (Acessibilidade a11y)**: Telas HTML públicas (/login, /register, /reset) seguem a11y: `for=""` nos labels, `aria-describedby` em mensagens de erro, foco visível, ordem de tabulação lógica, contraste mínimo 4.5:1 no texto.
- **NFR-7 (Sem `any`)**: Caso haja TypeScript, mas este projeto usa CommonJS puro — assegurar que bodies sejam validados com guardas explícitas (typeof, null checks) antes de uso.

## Constraints
- **Technical**: Node.js + Express (CommonJS). SQLite `better-sqlite3` (não há driver alternativo). JWT via `jsonwebtoken`. Estrutura: `server/index.cjs`, `server/routes/*.cjs`, `server/middleware/auth.cjs`. Sync Firestore: `server/services/firestoreSync.cjs`. **NÃO usar bibliotecas novas** (ex: zod, nodemailer) sem aprovação explícita — manter stack atual.
- **Business**: Só ADM cria tokens de convite. Sem fluxo aberto de auto-cadastro sem aprovação prévia. Senha mínima 6 caracteres. Tokens de convite expiram em 7 dias por padrão. Tokens de reset expiram em 1 hora.
- **Dependencies**: Migrações executadas via `database/migrate.cjs` → scripts em `database/migrations/`.

## Assumptions
- A1. Telas HTML `/login`, `/register`, `/reset` usarão o mesmo CSS base `/static/style.css` + estilos inline específicos (sem bibliotecas UI).
- A2. Integração cliente-servidor: forms HTML normais (submit) são okay; mensagens de erro renderizadas no HTML usando interpolação server-side simples (**não é necessário SSR** — pode ser páginas estáticas + fetch client-side).
- A3. Sem validação de formato de email complexa além de `x@x.x` básico no back-end.
- A4. Token de convite pode ser de uso único (padrão) ou múltiplos usos (campo `max_uses`) para facilitar cadastro em lote.
- A5. `admin_login.html` existente em `templates/` é SSR via Handlebars? Assumindo NO (arquivo não tem servidor de templates registrado). Solução: converter para HTML estático com fetch client-side igual às outras telas públicas.

## Acceptance Criteria

### AC-1: Cadastro exige Token de Convite válido
- **Type**: `rule`
- **Given**: Token de convite `tokenA` foi gerado pelo ADM e está ativo; `tokenB` não existe.
- **When**: `POST /api/auth/register` body `{name, email, password, invite_token: "tokenB"}`.
- **Then**: Resposta é **400**; **nenhum** usuário novo foi criado em `users`; `invite_tokens.used_by` de tokenA continua NULL.
- **Pass Condition**: Requisição com token inválido → 400 e não cria user; requisição com token válido → 201 + user criado + token marcado como usado.
- **Evidence**: `curl` / `node -e http.request` registrando statusCode + count antes/depois na tabela users.

### AC-2: Login funciona apenas para usuário ativo
- **Type**: `rule`
- **Given**: Usuário U1 `is_active=1` existe; usuário U2 `is_active=0` existe (ambos STUDENT).
- **When**: `POST /api/auth/login` U1 → / U2 →.
- **Then**: U1 retorna 200, token JWT válido em payload; U2 retorna **401 Credenciais inválidas** (mesma mensagem de senha errada).
- **Pass Condition**: Ambos cenários ocorrem e o JWT de U1 passa na validação `jwt.verify` contra `JWT_SECRET`.
- **Evidence**: http script + `jwt.verify` em Node.

### AC-3: Token de Reset é 1-uso e expira
- **Type**: `rule`
- **Given**: Token de reset `resetT1` gerado há 2 minutos.
- **When**: (a) `POST /reset/confirm` com `resetT1` + nova senha → (b) mesma chamada novamente.
- **Then**: (a) retorna 200, `users.password_hash` atualizado; (b) retorna 400 (token já usado). Token gerado há 65 minutos → 400 "token expirado".
- **Pass Condition**: 3 cenários (primeiro uso OK, segundo uso FAIL, expirado FAIL).
- **Evidence**: script node executando 3 requisições em cadeia.

### AC-4: Tela ADM gerencia Tokens de Convite
- **Type**: `rule`
- **Given**: Sessão ADM autenticada.
- **When**: (a) `POST /api/admin/invite-tokens` com `{ttl_hours: 24}` → (b) `PATCH /api/admin/invite-tokens/:id/revoke` → (c) `GET /api/admin/invite-tokens?status=revoked`.
- **Then**: (a) 201 + token 32 chars; (b) 200 revoked=true; (c) lista contém o token revogado.
- **Pass Condition**: 3 endpoints respondem corretamente e a persistência no SQLite bate.
- **Evidence**: chain de requisições + `SELECT * FROM invite_tokens`.

### AC-5: Auditoria completa
- **Type**: `rubric`
- **Dimension**: Cobertura de audit_logs para ações de auth e tokens.
- **Scale**: 0-5
- **Anchors**: 0 = nenhum evento auditado; 2 = só login/logout; 3 = +register; 4 = +invite_token create/revoke; 5 = +password_reset request/confirm.
- **Pass Threshold**: >= 4
- **Evidence**: `SELECT action, COUNT(*) FROM audit_logs GROUP BY action` após rodar a bateria de testes — lista deve conter LOGIN, LOGOUT, USER_REGISTER, INVITE_TOKEN_CREATE, INVITE_TOKEN_REVOKE, PASSWORD_RESET_REQUEST, PASSWORD_RESET_CONFIRM.

### AC-6: Rotas HTML públicas entregam conteúdo
- **Type**: `rule`
- **Given**: Servidor rodando.
- **When**: `GET /login`, `GET /register`, `GET /reset`, `GET /admin/login`.
- **Then**: Todas retornam 200, `Content-Type: text/html` e `<form>` aparece no body.
- **Pass Condition**: 4 rotas retornam 200 + HTML parseável contendo tag <form>.
- **Evidence**: 4 requisições HTTP com node.

### AC-7: Segurança — Rate limit e enumeração
- **Type**: `rubric`
- **Dimension**: Segurança defensiva na camada de auth.
- **Scale**: 0-3
- **Anchors**: 0 = sem proteção; 1 = rate-limit só para login; 2 = +prevent enumeração de email em reset; 3 = +rate-limit para reset/register + tokens nunca aparecem em server logs.
- **Pass Threshold**: >= 2
- **Evidence**: 11 requisições em <15min em /login → 11ª retorna 429; reset request com email inexistente retorna 200 genérico.

### AC-8: a11y nas telas públicas
- **Type**: `rubric`
- **Dimension**: Acessibilidade de marcação nas telas /login, /register, /reset.
- **Scale**: 0-5
- **Anchors**: 0 = sem labels; 1 = só inputs; 2 = labels com for; 3 = +aria-describedby em erros; 4 = +contraste e alt; 5 = +ordem tab / focus management.
- **Pass Threshold**: >= 3
- **Evidence**: grep por `<label for=` e `aria-describedby` em cada HTML.

## Open Questions
- [x] Fluxo de validação ADM → Resolvido: **ADM gera token → Usuário cadastra usando o token** (pré-autorização).
- [x] Recuperação de senha → Resolvido: **Token exibido NA TELA + copiar** (sem SMTP).
- [x] Local telas auth → Resolvido: **Páginas separadas /login, /register, /reset** (3 arquivos HTML + 3 rotas novas).
