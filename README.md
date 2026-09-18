# HUB Training — Treinamento Manutenção Elétrica

Aplicação web (**Node.js 20 / Express 4 / Firestore como fonte primária**) para treinamento interno de profissionais que executam manutenção preventiva elétrica em Hubs / Sites / Data Centers. Substituiu a versão anterior em Python/Flask.

## Recursos
- Site didático responsivo com **33 módulos** + fluxograma real: 17 da trilha base, **7 do mini-curso NR-10** e **9 do curso de Ar-condicionado**.
- "Acesso rápido aos módulos" lista **todos** os módulos (com busca); "Estudar Cartilha" tem o índice completo.
- Fotos reais de infraestrutura elétrica (gerador, banco de baterias, data center).
- Simulado com 30 questões; aprovação em **23/30 (76,7%)** — banco principal inalterado (novos cursos usam faixas próprias: NR-10 `order 101–130`, AC `order 201–230`).
- Profissional (STUDENT) vê apenas **APROVADO / NÃO APROVADO**.
- ADM vê pontuação, percentual, resposta dada, correta e erros, exporta CSV.
- Histórico em SQLite WAL (`training.db`) com Firestore como **fonte primária do runtime** (`hub-training-2200d`, região `southamerica-east1`).
- Autenticação completa: JWT + bcrypt 10 rounds + rate limit + audit trail.
- **Portaria controlada pelo ADM**: só se cadastra quem tem **token de convite** emitido pela área ADM.
- Recuperação de senha via token exibido em tela (não depende de SMTP/e-mail transacional).
- Menu público: **Início | Mini Cursos | ADM**.
- Janela de manutenção da rotina preventiva: **01:00–05:00** (ticket + autorização do SMC).

## Mini-cursos
Seguem o mesmo padrão dos demais cursos (`training_modules → training_lessons → lesson_checkpoints/checkpoint_options` + banco `questions/question_options` com `explanation`):

| Mini-curso | Módulos (`order`) | Categoria | Carga sugerida | Checkpoints (fixação) | Banco avaliação |
|---|---|---|---|---|---|
| NR-10 — Segurança em Instalações e Serviços em Eletricidade | 7 (18–24) | `NR-10` | ~2h | 11 (simulado 10Q, gabarito 1-B…10-B) | 30Q `order 101–130`, cat. `NR-10 -*` |
| Ar-condicionado — Instalação e Manutenção | 9 (25–33) | `AC` | ~3h | 14 (simulado 10Q + 4 extras) | 30Q `order 201–230`, cat. `AC -*` |

- Os mini-cursos **contam para a certificação** (totais dinâmicos: é preciso concluir todas as lições + checkpoints) e entram no **Conteúdo Programático** do certificado; preencha a carga horária por módulo em Área ADM → Configurações do Certificado.
- Material educacional: **não** substitui o curso oficial NR-10 (40h), certificações (NR-35/NR-10), manuais de fabricantes nem prática supervisionada.

### Seeds (idempotentes — só inserem o que não existe, nunca apagam)
```sh
npm run seed:nr10             # SQLite: 7 módulos + 7 lições + 11 checkpoints + 30 questões
npm run seed:nr10:firestore   # Replica o NR-10 do SQLite → Firestore (219 docs) [--force] [--dry-run]
npm run seed:ac               # SQLite: 9 módulos + 9 lições + 14 checkpoints + 30 questões
npm run seed:ac:firestore     # Replica o AC do SQLite → Firestore (238 docs) [--force] [--dry-run]
node scripts/fix_janela.cjs   # 1-shot: janela 21:00–06:45 → 01:00–05:00 (lição 10, qopt 268, cpopt 44) [--dry-run]
```

## Como executar
Requer **Node.js 18+** (20+ recomendado) e npm.

1. Clone / extraia o projeto.
2. Copie `.env.example` (ou crie `.env`) e configure no mínimo:
   ```env
   PORT=5000
   JWT_SECRET=coloque-uma-string-longa-aleatoria-aqui
   ```
   > ⚠️ Sem `JWT_SECRET` no `.env`, o sistema usa `HUB-TRAINING-SECRET-MUDAR-2026` e imprime um **aviso no startup**:
   > `[AUTH] AVISO: JWT_SECRET usando valor DEFAULT. Altere no .env antes de produção.`
3. Instale dependências:
   ```sh
   npm install
   ```
4. Rode a migração do banco (idempotente — execute quantas vezes quiser):
   ```sh
   node database/migrate.cjs
   ```
5. Popule usuários de demonstração (se for a primeira vez):
   ```sh
   node database/seed_users.cjs
   ```
6. Inicie o servidor:
   ```sh
   npm run dev        # desenvolvimento com restart automático? NÃO — dev = node server/index.cjs
   # ou
   npm start          # produção
   ```
7. Abra: `http://localhost:5000`

## Contas padrão (seed)
As contas iniciais são criadas pelo script de seed. As credenciais são
entregues pelo responsável do ambiente — nunca ficam expostas em telas ou
nesta documentação. Troque a senha padrão no primeiro acesso.

## Autenticação
### Rotas HTML (telas públicas / protegidas)
| Rota              | Descrição                                            | Acesso              |
|-------------------|------------------------------------------------------|---------------------|
| `/login`          | Entrada do profissional (STUDENT).                   | público             |
| `/register`       | Cadastro com **token de convite obrigatório**.       | público             |
| `/reset`          | Recuperação de senha (2 passos: pedido + confirmação)| público             |
| `/admin/login`    | Login do ADM (verifica role === ADMIN após logar).   | público             |
| `/admin`          | Painel ADM (Dashboard, Avaliações, Usuários, Convites)| Bearer + role ADMIN |
| `/dashboard`      | SPA principal do aluno após login.                   | Bearer              |

### Rotas API novas (auth + ADM)
| Método | Rota                                      | Descrição                                                                     |
|--------|-------------------------------------------|-------------------------------------------------------------------------------|
| POST   | `/api/auth/register`                      | Cria STUDENT, **exige** `invite_token` válido (não-expirado, não-revogado, `remaining_uses > 0`, `email_restriction` opcional). |
| POST   | `/api/auth/login`                         | bcrypt compare, checa `is_active=1`, retorna JWT.                             |
| POST   | `/api/auth/logout`                        | Audit LOGOUT (token client-side é descartado pelo navegador).                 |
| GET    | `/api/auth/me`                            | Dados do usuário autenticado.                                                 |
| POST   | `/api/auth/reset/request`                 | Sempre retorna 200 (previne enumeração). Token visível somente se `email` existir & ativo. |
| POST   | `/api/auth/reset/confirm`                 | Consome o token de reset (1 uso) e troca a senha.                             |
| POST   | `/api/admin/invite-tokens`                | ADM cria token de convite (`ttl_hours`, `max_uses`, `email_restriction` opcional). |
| GET    | `/api/admin/invite-tokens?status=`        | Lista convites; `status ∈ {active, used, revoked, expired, all}`.             |
| PATCH  | `/api/admin/invite-tokens/:id/revoke`     | Revoga um convite (idempotente).                                              |
| POST   | `/api/admin/users/:id/reset-token`        | ADM gera manualmente token de reset para um usuário (atendimento / helpdesk). |

### Segurança & Rate limit (por IP)
| Endpoint          | Janela   | Limite |
|-------------------|----------|--------|
| `/api/auth/login` | 15 min   | 10 req |
| `/api/auth/register` | 15 min | 10 req |
| `/api/auth/reset/*`  | 15 min | 5 req  |
| `/api/*` (global)    | 15 min | 100 req |

### Auditoria (`audit_logs` + Firestore `audit_logs/{id}`)
Ações registradas (dual-write, best-effort):
`LOGIN`, `LOGOUT`, `USER_REGISTER`, `INVITE_TOKEN_CREATE`, `INVITE_TOKEN_REVOKE`, `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_CONFIRM`, `ADMIN_PASSWORD_RESET_REQUEST`, `QUIZ_SUBMIT`, `PROGRESS_UPDATE`, `RBAC_DENIED`, etc.

## Banco de dados
- **Firestore é a fonte primária do runtime** (SQLite removido do runtime; `training.db` segue como origem dos seeds locais).
- Esquemas em `database/migrations/*.sql` + `*.cjs`.
- Migrações: `node database/migrate.cjs` (idempotente).
- Migração SQLite → Firestore: `node scripts/migrate_sqlite_to_firestore.cjs [--dry-run] [--force]`.
- Reset total (apaga dados): delete `training.db` e rode migrate + seed.
- Requer `./firebase-service-account.json` ou variáveis `FIREBASE_*` no `.env`. Se ausente, loga aviso.

## Testes
```sh
node tests/test_auth_full.cjs   # smoke auth completa (AC-1..AC-8)
npm run test:final              # regressão total (auth + RBAC + IDOR + simulado + a11y)
```
Resultados de referência (commit corrente):
- `test_auth_full.cjs`: **27/27 PASS**
- `test:final`: **41/41 PASS (0 regressões)**

## Publicação real
- Produção: `https://hub-training-eta.vercel.app/` (deploy automático via push na `main`).
- Build de validação: `npm run build` (`build.js` confere entrypoint + estáticos).
- **Assets `/static/*` são servidos pelo Express** (não há rota `/static` no `vercel.json`; ela causava 404 de CSS/JS em produção).
- Use **HTTPS** (nginx / Cloudflare / Application Gateway com WAF).
- Preencha `JWT_SECRET` (>= 64 bytes aleatórios).
- Backup diário de `training.db` (WAL shm/wal junto).
- Restrinja `/admin*` por IP / VPN, se possível.
- O site **não** é um documento oficial da empresa; usoc om autorização correspondente.

## Conteúdo técnico
Valores e sequências operacionais baseados no material fornecido pela equipe. Não substituem normas, procedimentos oficiais, manuais de fabricantes ou autorizações de manutenção.
