# AUDITORIA TÉCNICA COMPLETA — HUB TRAINING
> **Papel:** Engenheiro DEV | **Data:** 2026-09-21 | **Fonte:** `README.md` + leitura exaustiva de `server/`, `database/`, `scripts/`, `src/`, `static/`, `tests/`
> **Stack real:** Node.js 20 / Express 4 / Firestore (primário) + SQLite (origem de seeds) / JWT + bcrypt / Vercel

---

## 1. VISÃO GERAL E CARACTERÍSTICAS

| Item | Detalhe |
|---|---|
| Nome | HUB Training — Treinamento Manutenção Elétrica (Hubs / Sites / Data Centers) |
| Tipo | Web app didático + LMS mínimo + avaliador + certificador |
| Origem | Substituiu versão Python/Flask |
| Runtime DB | **Firestore** projeto `hub-training-2200d`, região `southamerica-east1`. SQLite (`training.db` WAL) **removido do runtime**, mantido como origem dos seeds |
| Conteúdo | **33 módulos**: 17 trilha base (order 1–17) + 7 NR-10 (order 18–24, cat `NR-10`) + 9 Ar-condicionado (order 25–33, cat `AC`). ~33 lições (1/módulo). ~42–45 checkpoints. **90 questões**: 30 base (order 1–30) + 30 NR-10 (101–130) + 30 AC (201–230), 360 opções |
| Simulado | 30 questões, aprovação **23/30 (76,7%)**, cálculo só no backend, 30/30 obrigatórias, **máx 3 tentativas (1+2)**, aprovado não retenta |
| Visibilidade | STUDENT vê só `APROVADO / NÃO APROVADO`. ADM vê score, %, resposta dada, correta, erros, exporta CSV |
| Janela preventiva | **01:00–05:00** (ticket + autorização SMC). Corrigida via `scripts/fix_janela.cjs` (era 21:00–06:45) |
| Portaria | Cadastro exige **invite_token** ADM (portaria controlada). Reset de senha via token em tela (sem SMTP) |
| Menu público | Início \| Mini Cursos \| ADM |
| Deploy | `https://hub-training-eta.vercel.app/` (auto via push `main`). `build.js` valida entrypoint + estáticos. `/static/*` servido pelo Express (sem rota `/static` no `vercel.json` para evitar 404) |
| Testes referência | `test_auth_full.cjs` **27/27 PASS**, `test:final` **41/41 PASS** |

---

## 2. ARQUITETURA E ESTRUTURA DE PASTAS

```
server/index.cjs                  # entrypoint Express (health, HTML, monta /api/*)
server/middleware/auth.cjs        # authenticateToken, requireRole, requireSelfOrAdmin, JWT_SECRET/EXPIRES
server/middleware/rateLimit.cjs   # 5 limiters express-rate-limit
server/routes/  (12 arquivos)     # auth, admin (757 linhas), training, quiz, progress,
                                  # certificates, checkpoints, dashboard, practical,
                                  # audit, equipment, images
server/repositories/ (12 arquivos)# _base.cjs + authRepo, quizRepo, trainingRepo, adminRepo,
                                  # progressRepo, checkpointRepo, certificateRepo, practicalRepo,
                                  # auditRepo, equipmentRepo, imagesRepo  (Firestore SDK)
server/services/firebase.cjs      # initFirebase, getFirestore/Auth, wrappers
server/services/firestoreSync.cjs # [DEPRECATED] NO-OP p/ compatibilidade
database/migrations/              # 0001_initial_schema.sql, 0002_add_unique_constraint.cjs,
                                  # 0003_auth_tokens.sql, 0004_certificates.sql, 0005_certification_final.cjs
database/seed*.cjs                # seed.cjs, seed_lessons, seed_lessons_09_17, seed_quiz,
                                  # seed_checkpoints, seed_nr10, seed_ac, seed_users, seed_images, ...
scripts/                          # migrate_sqlite_to_firestore, seed_nr10/ac_firestore, fix_janela,
                                  # verify-firebase, smoke_contract
src/pages/student/                # base.html, index.html, dashboard.html, quiz.html, admin.html (+ legacy Jinja/Flask)
static/                           # SPA real: dashboard.js/css, login/register/reset/admin_*.html
home.html / dashboard.html / validar.html  # landing, SPA aluno, validação pública de certificado
tests/                            # final_acceptance.cjs, test_auth_full.cjs, test_api/progress/audit/...
vercel.json / build.js / package.json / .env.example
```

**Fluxo runtime:** `home (pública) → /login|/register (invite_token) | /reset → /dashboard SPA (JWT Bearer) → study → checkpoint (trava 409) → complete → quiz 30Q → 23 APROVADO → practical APTO → ADMIN emite certificado → /validar/:number (pública)`.

---

## 3. BACKEND — `server/index.cjs` (205 linhas)

- `express()`, `helmet({contentSecurityPolicy:false})`, `cors()`, `express.json()`, `urlencoded`.
- `PORT = process.env.PORT \|\| 5000`. `initFirebase()` em `setTimeout(100ms)` com log `FONTE PRIMÁRIA ATIVA — Firestore`.
- Avisos startup: `JWT_SECRET` default `HUB-TRAINING-SECRET-MUDAR-2026` e `Rate limit = MemoryStore (não compartilhado entre Vercel Functions)`.
- Rate limit global: `app.use('/api/')` → GET/HEAD/OPTIONS usa `apiReadLimiter`, resto `apiWriteLimiter`.
- Estáticos: `app.use('/static', express.static(../static))`.
- **Rotas diretas:** `GET /health`, `GET /api/firebase/status` (ADMIN), `POST /api/firebase/bulk-sync` (ADMIN, deprecated `{ok:true, deprecated:true}`).
- **Rotas HTML (sendFile):** `GET / → home.html`; `GET /dashboard`, `/simulado → dashboard.html`; `GET /validar/:certificateNumber → validar.html`; `/login|/register|/reset → static/*.html`; `/admin/login → static/admin_login.html`; `/admin → static/admin.html`.
- **Montagem:** `/api/training|/auth|/quiz|/admin|/dashboard|/progress|/checkpoints|/certificates|/practical|/audit|/equipment|/images`.
- `404 {error:'Rota não encontrada'}`, `500 {error:'Erro interno'}`. `shutdown(SIGINT/SIGTERM)`. `module.exports=app` (Vercel `@vercel/node`).

---

## 4. MIDDLEWARES

### 4.1 `server/middleware/auth.cjs` (58 linhas)
Exports: `authenticateToken, requireRole, requireSelfOrAdmin, JWT_SECRET, JWT_EXPIRES`.
- `JWT_SECRET = process.env.JWT_SECRET \|\| 'HUB-TRAINING-SECRET-MUDAR-2026'`, `JWT_EXPIRES = '8h'`.
- `authenticateToken`: extrai `Authorization: Bearer` ou `?token=`; `401 Token ausente / TOKEN_EXPIRED / TOKEN_INVALID`; `jwt.verify → payload.sub`; `findUserById`; bloqueia `is_active===false` (`INACTIVE_ACCOUNT`); anexa `req.user={id,email,name,role,is_active}`.
- `requireRole(...roles)`: `401` sem user, `403 Acesso negado para papel X`.
- `requireSelfOrAdmin(getId)`: ADMIN passa; senão `String(getId(req))===String(req.user.id)` senão `403 IDOR/BOLA bloqueado`. Usado em `progress` e `audit`.

### 4.2 `server/middleware/rateLimit.cjs` (49 linhas, `express-rate-limit`)
| Limiter | Janela | Max | Uso |
|---|---|---|---|
| `authLoginLimiter` | 15 min | 10 | `/api/auth/login` |
| `authRegisterLimiter` | 15 min | 10 | `/api/auth/register` |
| `authResetLimiter` | 15 min | 5 | `/api/auth/reset/*` |
| `apiReadLimiter` | 15 min | 1000 | GET/HEAD/OPTIONS (SPA tagarela) |
| `apiWriteLimiter` | 15 min | 200 | demais writes |
| `apiGlobalLimiter` | 15 min | 100 | deprecated compat |

Todos `standardHeaders:true, legacyHeaders:false, {error, code:'RATE_LIMITED'}`.

---

## 5. ROTAS API — DETALHE POR MÓDULO

### 5.1 `routes/auth.cjs` (205 linhas)
Imports: `bcrypt, jsonwebtoken`, `authRepo{findUserByEmail,findUserById,createUser,updateUser}`, `adminRepo{findInviteTokenByToken,consumeInviteToken,createResetToken,findResetToken,countActiveResetTokens,consumeResetToken}`, `auditRepo{saveAuditLog}`. Consts: `PWD_MIN_LEN=6`, `RESET_MAX_ACTIVE_PER_USER=3`, `EMAIL_RE`.
- `POST /api/auth/register` (+registerLimiter): body `email,password,name,identifier?,invite_token`. Valida senha≥6, email regex. Busca convite; rejeita se inexistente/revogado/`remaining_uses<=0`/expirado/`email_restriction` divergente. `409` se email existe. `bcrypt.hash(pw,10)`, `createUser({role:'STUDENT',is_active:true})`, `consumeInviteToken`, audit `USER_REGISTER` → `201 {id,email,name}`.
- `POST /api/auth/login` (+loginLimiter): `findUserByEmail(includeSensitive)`, `is_active` check + audit `LOGIN_FALHA` → `401 Credenciais inválidas` (genérico anti-enumeração). `bcrypt.compare`. Sucesso audit `LOGIN`, `jwt.sign({sub,email,role,name},{expiresIn})` → `{token,expiresIn,user}`.
- `POST /api/auth/logout` (auth): audit `LOGOUT` → `204` (token descartado client-side).
- `GET /api/auth/me` (auth): `{user:req.user}`.
- `POST /api/auth/reset/request` (+resetLimiter): sempre `200` genérico. Se user ativo: se `countActive>=3` → `token_visible_for_copy:false`; senão `createResetToken(u.id,1h)` → `{token,expires_at,token_visible_for_copy:true}` + audit `PASSWORD_RESET_REQUEST`.
- `POST /api/auth/reset/confirm` (+resetLimiter): `token,new_password,confirm_password` (≥6, iguais). Rejeita `used/consumed_at/revoked/used_by/expirado`. `bcrypt.hash`, `updateUser`, `consumeResetToken`, audit `PASSWORD_RESET_CONFIRM`.
- Coleções: `users, invite_tokens, password_reset_tokens, audit_logs`.

### 5.2 `routes/admin.cjs` (757 linhas, `router.use(authenticateToken,requireRole('ADMIN'))`)
Consts: `DEFAULT_TTL_HOURS=168`, `DEFAULT_RESET_TTL=1`, `MAX_USES_CEIL=1000`, `PASS_SCORE_VIEW=23`, `PROMOTABLE_ROLES=[ADMIN,TECHNICAL_EVALUATOR,STUDENT]`.
- `GET /attempts?user&result&from&to` → `listAttemptsAdmin(page1,200)` + `usersMap` → `{id,user_id,user_name,user_email,date:completed_at,score,total,correct,wrong,result:APROVADO/NÃO APROVADO}`.
- `GET /attempt/:id` → `getQuizAttemptFull` + `getQuestionById/getOptionById/getQuestionOptionsWithCorrect` (given_text vs correct_text).
- `GET /users`, `GET /dashboard` (`getDashboardCounts → {modules,lessons,checkpoints,attempts,passed,failed}`).
- `POST /invite-tokens {email?,ttl_hours?,max_uses?}` (1≤ttl≤8760, 1≤max≤1000) → `201 {id,token,email_restriction,expires_at,max_uses,remaining_uses}` + audit `INVITE_TOKEN_CREATE`.
- `GET /invite-tokens?status=active|used|revoked|expired|all` (enriquece created_by/used_by/revoked_by names).
- `PATCH /invite-tokens/:id/revoke` (idempotente), `POST /users/:id/reset-token` (1h, audit `ADMIN_PASSWORD_RESET_REQUEST`).
- `POST /users/:id/promote {role}`, `PATCH /users/:id/active {is_active}` (bloqueia auto-desativação), `DELETE /attempts/:id|/attempts{ids|all+filters}`, `DELETE /users/:id|/users{ids|all}` (pula self e ADMINs, best-effort `firebase.auth().deleteUser`), `DELETE /invite-tokens/:id|...`.
- Certificados: `GET /certificates?name&code&from&to&status`, `GET /certificates/:id/preview` (QR `qrcode.toDataURL(validationUrl)` + `validation_url=/validar/<number>`), `GET /certificates/:id`, `POST /certificates/:id/revoke`, `GET|PUT /certificate-settings {workload_hours,modality,signer1/2_name/role}`, `GET /certification-pipeline`, **`POST /certificates/issue {user_id,force?,reason?}`** — emissão exclusiva: só STUDENT, `409` se VALID existe, exige `READY_FOR_ADMIN_CERTIFICATION` senão `force+reason≥10` + base acadêmica; snapshot `listModuleWorkload`, `percentage=round(score/30*1000)/10`, `generateYearlyCertificateNumber('HUB')`, audits `CERTIFICATE_ELIGIBILITY_REACHED + CERTIFICATE_ISSUED`.
- `POST /users/:id/reset-attempts` (zera 3 chances), `GET|PUT /module-workload {hours:{moduleId}}`, `POST /checkpoints/complete {user_id,lesson_id?}` (marca com `by_admin:true,attempt 0`).

### 5.3 `routes/training.cjs` (114 linhas)
- `GET /modules → {modules}`; `GET /module/:id → {module,lessons}` (sem `content`); `GET /lesson/:id → {lesson}` (com HTML); `POST /lesson/:lessonId/complete` (auth → `saveLessonProgress COMPLETED/100` + audit `LESSON_COMPLETE`); `GET /lesson/:lessonId/checkpoints` (sem gabarito).

### 5.4 `routes/quiz.cjs` (138 linhas) — `PASS_SCORE=23, PASS_TOTAL=30, MAX_ATTEMPTS=3`
- `GET /questions` (auth): ADMIN `listQuestionsFull`, STUDENT `listQuestions` (sem `is_correct`).
- `POST /submit` (auth): `answers:{qid:oid}`; `answeredCount!==30→400`; `listQuestions` deve ter 30; `alreadyPassed→403`; `used>=3→403`; loop `getOptionById` → score; `passed=score>=23`; `saveQuizAttempt({...attempt_number:used+1,ip,user_agent})` + `saveQuizAnswer`; audit `QUIZ_SUBMIT` → `{attempt_id,result,attempt_number,max:3,remaining}`.
- `GET /my-attempts` (sem score p/ STUDENT), `GET /attempts` (ADMIN paginado senão próprio), `GET /my-attempt/:id` (IDOR 403; STUDENT só `{result}`, ADMIN full).

### 5.5 `routes/progress.cjs` (154 linhas)
- `GET /user/:userId` e `GET /lesson/:lessonId/user/:userId` (+`requireSelfOrAdmin`); `POST /` (anti-spoof `user_id!==req.user.id→403` salvo ADMIN; cria `IN_PROGRESS/0` ou atualiza + audit `LESSON_COMPLETED/PROGRESS_UPDATE/LESSON_START`); `PATCH /:id` (dono ou ADMIN).

### 5.6 `routes/certificates.cjs` (172 linhas)
- `GET /my` (auth): `getTrainingStatus` + `getValidCertificateByUser` + `getPracticalByUserId` + QR; audit `CERTIFICATE_VIEWED`. Teoria aprovada **não** gera cert sozinha.
- `POST /my/downloaded`, `PATCH /:id/downloaded` (audit `CERTIFICATE_DOWNLOADED`).
- `GET /validate/:number` **PÚBLICO**: `getCertificateByNumber(UPPER)`; `404 NOT_FOUND`; `result_final:'TREINAMENTO CONCLUÍDO'`, `exceptional=!!issue_note`.

### 5.7 `routes/checkpoints.cjs` (126 linhas)
- `GET /lesson/:lessonId` (público, sem gabarito); `GET /my-answers?lesson_id` (auth, trava front); `POST /:checkpointId/submit` (auth: `hasAnswered→409 locked:true`, valida opção, `saveCheckpointAnswer`, audit `CHECKPOINT_SUBMIT`). **Resposta única imutável.**

### 5.8 `routes/dashboard.cjs` (45 linhas)
- `GET /summary` (auth): paralelo `listModules,getAllLessons,getProgress,countAnsweredCheckpoints`; por módulo `{status:COMPLETED|IN_PROGRESS|NOT_STARTED,progress%}`; `geral=round(done/total*100)`; `eligible=(done===total)`; `next_step:{cta:'Iniciar Simulado Final'}`.

### 5.9 `routes/audit.cjs` (52 linhas)
- `GET /user/:userId` (+SelfOrAdmin, limit 50); `GET /entity/:entityType/:entityId` (qualquer logado); `GET /` (ADMIN, limit/offset).

### 5.10 `routes/practical.cjs` (201 linhas) + `CRITERIA/RESULTS`
- `POST /` (só `ADMIN,TECHNICAL_EVALUATOR`): `{user_id,evaluation_date,result:APTO|NAO_APTO,observations?,criteria?,evaluator_title?}`; data não futura; alvo existe e não ADMIN; **`422` se `!isTheoryApproved` (exige 23/30)**; `upsertEvaluation` + audits `PRACTICAL_EVALUATION_CREATED/_APPROVED/_NOT_APPROVED`.
- `GET /overview|/pending (quiz.approved && practical!==APTO)|/mine|/user/:userId`.

### 5.11 `routes/equipment.cjs` (49 linhas, público) + `routes/images.cjs` (11 linhas, público)
- `GET /equipment/ → {equipment}`, `/relationships` (filtra INNER JOIN), `/topology → {topology}`. `GET /images/ → {images}`.

---

## 6. REPOSITÓRIOS (`server/repositories/`) E SERVIÇOS

- **`_base.cjs` (76 linhas):** `collection,docRef,parseDoc/parseDocs (Timestamps→ISO recursivo depth 8),batch/commitBatch,now(serverTimestamp),counter(increment),arrayUnion/Remove`.
- **`authRepo`:** `findUserByEmail(includeSensitive?)`, `findUserById`, `createUser (UUID sem hífen, lower email, STUDENT/active)`, `updateUser`, `setUserActive`, `promoteUserRole`, `listUsers({role,is_active,search},{page,pageSize≤200})`.
- **`quizRepo` (316 linhas):** `listQuestions(30,shuffleSeed PRNG)/listQuestionsFull`, `getQuestionById/OptionsWithCorrect/getOptionById(valida pertencimento)`, `saveQuizAttempt/saveQuizAnswer(doc ${attempt}_${question})`, `getQuizAttempt/Full/AttemptsByUser/count/hasPassed/getLastPassed/listAttemptsAdmin`, CRUD questão/opção, `deleteAttemptAndAnswers(batch)/deleteAttemptsByUser`.
- **`trainingRepo` (167 linhas):** `listModules/getModuleById/listLessonsByModule/getLessonById/getAllLessons/updateModuleDescription/appendLessonContent(idempotente por marcador)/CRUD módulo/lição`.
- **Demais:** `adminRepo` (convites, resets, counts, pipeline, workload, settings), `progressRepo`, `checkpointRepo`, `certificateRepo`, `practicalRepo`, `auditRepo`, `equipmentRepo`, `imagesRepo` — todos Firestore via `_base`.
- **`services/firebase.cjs` (182 linhas):** `initFirebase()` (prioriza `GOOGLE_APPLICATION_CREDENTIALS`, senão `FIREBASE_PRIVATE_KEY` JSON completo ou key pura + `FIREBASE_CLIENT_EMAIL/PROJECT_ID`; `ignoreUndefinedProperties:true`), `getFirestore/getAuth/getTimestamp/increment/arrayUnion/...`, idempotente.
- **`services/firestoreSync.cjs` (126 linhas, DEPRECATED):** stub NO-OP (`enqueue/processQueue/flushQueue→resolve`, `canSync()=false`) p/ requires legados.

---

## 7. BANCO DE DADOS

### 7.1 Migrações (`node database/migrate.cjs`, WAL, `foreign_keys=ON`, idempotentes)
1. `0001_initial_schema.sql` (245 linhas, 19 tabelas): `roles, users, permissions, equipment_types, technical_equipment, equipment_relationships, training_modules, training_lessons, lesson_progress UNIQUE(user,lesson), lesson_checkpoints, checkpoint_options, checkpoint_answers, questions, question_options, quiz_attempts, quiz_answers, audit_logs, content_versions, attempts(legada)`.
2. `0002_add_unique_constraint.cjs`: recria `lesson_progress` com UNIQUE, dedup `MIN(id)`.
3. `0003_auth_tokens.sql`: `invite_tokens(token UNIQUE, email_restriction, max/remaining_uses, revoked, expires_at)` + `password_reset_tokens(token UNIQUE, user_id, used/revoked, expires_at)`.
4. `0004_certificates.sql`: `certificates(certificate_number UNIQUE, seq, user_id UNIQUE→ depois relaxado, training_name, modality, workload_hours TEXT, score/total/percentage, completion/issue_date, signer1/2, status VALID)` + `certificate_settings(id CHECK 1)`.
5. `0005_certification_final.cjs`: role `TECHNICAL_EVALUATOR`, `practical_evaluations(user_id UNIQUE, evaluator_id, date, result, criteria_data JSON, ...)`, `module_workload(module_id PK, hours TEXT)`, `certificates += practical_evaluation_id, issued_by, workload_detail, issue_note`, `checkpoint_answers += by_admin`, drop `idx_certificates_user_unique` (histórico REVOKED permitido, número nunca reutilizado).

### 7.2 Seeds (idempotentes salvo `seed_quiz`)
| Script | Inserção |
|---|---|
| `seed.cjs` | roles STUDENT/INSTRUCTOR/ADMIN; 6 `equipment_types`; 21 `technical_equipment` (CONCESSIONÁRIA…PDT); 21 relationships (POWERS/CONTROLS/DISTRIBUTES); módulos 1–17 |
| `seed_lessons.cjs` + `seed_lessons_09_17.cjs` | 17 lições base (Arquitetura…Segurança) |
| `seed_checkpoints.cjs` | 17 `NEW_CP` base + completa OPTS (QDGE/UPS/FCC), dedup `lesson_id\|question` |
| `seed_quiz.cjs` | **30Q order 1–30, 120 opts** (apaga antes). Ex: Q7 janela 01:00–05:00 |
| `seed_nr10.cjs` | **7 mods 18–24, 7 lições, 11 checkpoints/44 opts, 30Q 101–130/120 opts** |
| `seed_ac.cjs` | **9 mods 25–33, 9 lições, 14 checkpoints/56 opts, 30Q 201–230/120 opts** |
| `seed_users.cjs` | 4 users bcrypt10: `aluno.a/b (STUDENT/senha123)`, `adm (ADMIN/adm123456)`, `avaliador (TECHNICAL_EVALUATOR/aval123456)` |
| `scripts/seed_nr10/ac_firestore.cjs` | Replica SQLite→Firestore mesmos IDs (`--force/--dry-run`) |
| `scripts/migrate_sqlite_to_firestore.cjs` | 1-shot 27 tabelas em `TABLE_ORDER`, batch 500, backup JSON, BOOL/JSON fields coerce |
| `scripts/fix_janela.cjs` | `21:00–06:45→01:00–05:00` em `lessons/10`, `qopt 268`, `cpopt 44` |

### 7.3 Firestore runtime (coleções)
`users, invite_tokens, password_reset_tokens, training_modules, training_lessons, lesson_progress, lesson_checkpoints→checkpoints, checkpoint_options, checkpoint_answers, questions, question_options, quiz_attempts, quiz_answers, practical_evaluations, certificates, certificate_settings, module_workload, equipment(+types/relationships), technical_images→images, audit_logs`.

---

## 8. FRONTEND

- **`home.html` (landing pública):** hero + 10 cards (+09 NR-10, 10 AC) + seções `#nr10 (TN-S/DR≤30mA/40h)` `#ac (1TR=12.000/EEV/3-15m/classe A)` → CTA `/dashboard`.
- **`dashboard.html` (673 linhas, SPA `/static/dashboard.js+css`, FontAwesome):** sidebar `dashboard/study/quiz/certificate/practical(eval-only)/help/admin(admin-only)`; header breadcrumbs/notificações; pages `page-dashboard (banner, 4 cards, learn-grid 12 incl. NR-10/AC, steps 01–05)`, `modules/study(toc+studyBar)/progress/quiz(30Q 3 tentativas)/module/lesson(fluxograma+checkpoints)/admin(pipeline CERTIFICAÇÕES, issueModal, attempts, certificates, cfg)/certificate/practical/help`; right-sidebar; a11y `aria-label/<label>/@media 560px/focus-visible/sr-only`.
- **`validar.html` (96 linhas, pública):** `GET /api/certificates/validate/:number` → badges `VÁLIDO ✓/REVOGADO/NÃO ENCONTRADO` + dl participante/treinamento/modalidade/carga/resultado/teoria/prática.
- **`static/`:** `login/register/reset/admin_login/admin.html` + JS com `Authorization: Bearer` (localStorage), sem SSR de proteção em `/admin` (proteção real = API).
- **Legado `src/pages/student/`:** `base.html (Jinja), index/dashboard/quiz/admin.html` — referência Flask antiga, não usada no runtime Express.

---

## 9. SEGURANÇA, REGRAS DE NEGÓCIO E TESTES

**Segurança:** JWT 8h Bearer, bcrypt 10, rate limits (10/10/5/1000/200), anti-enumeração no reset, anti-IDOR (`requireSelfOrAdmin` + checks quiz), STUDENT sem `is_correct/score`, cálculo quiz só servidor, `helmet+cors`, audit dual best-effort (`LOGIN/LOGOUT/USER_REGISTER/INVITE_* /PASSWORD_RESET_*/QUIZ_SUBMIT/PROGRESS_UPDATE/RBAC_DENIED/CERTIFICATE_* /PRACTICAL_* /CHECKPOINT_*`), `/admin*` recomendado atrás de IP/VPN + HTTPS/WAF, `JWT_SECRET≥64B`, backup diário WAL.
**Negócio:** aprovação `≥23/30`; 30/30 obrigatórias; 3 tentativas; checkpoints imutáveis; `eligible_for_quiz = COMPLETED==total`; prática exige teoria (`422`) + `APTO/NAO_APTO` + data não futura + não avalia ADMIN; certificação `READY = acadêmico + teoria + prática` + emissão só ADMIN (`409` se VALID, `force+reason≥10` excepcional, número `HUB+ano` único, QR `/validar`, `result_final` sempre `TREINAMENTO CONCLUÍDO`); convite `ttl 1–8760h (def 168), max 1–1000, email_restriction, remaining>0`.
**Testes:** `tests/test_auth_full.cjs` (AC-1..AC-8, 27 checks: HTML 200, login/convite/reset/audit/429), `tests/final_acceptance.cjs` (~42 asserts: health, 17 mods, auth/RBAC/IDOR/checkpoint 409/progresso/simulado 22→reprova/23→aprova/imagens/a11y).

---

## 10. RISCOS / DÍVIDA TÉCNICA (visão engenheiro)

1. `JWT_SECRET` default em código + `MemoryStore` rate-limit (não compartilha no serverless Vercel) — migrar p/ Redis/Upstash.
2. `sqlite.ts (Drizzle)` desatualizado (sem invite/reset/practical/workload) — runtime usa SQL bruto; unificar ou remover Drizzle.
3. Proteção `/admin` só client-side — ok pois API exige ADMIN, mas adicionar redirect server-side seria defesa em profundidade.
4. `firestoreSync.cjs` morto — remover após grep de requires.
5. Seeds `seed_quiz` destrutivo (apaga) vs NR-10/AC idempotentes — padronizar.
6. CSV export citado no README vive só no front ADM — sem endpoint dedicado auditável.
7. `training.db*` + `firebase-service-account.json` versionados/presentes no workspace — mover p/ secrets manager, garantir `.gitignore`.

---

## 11. SCRIPT DE RECONSTRUÇÃO DO ZERO (copy-paste)

> Objetivo: recriar o projeto funcional mínimo → completo. Executar na ordem. Requer Node 20+, conta Firebase (Firestore `southamerica-east1`), Vercel CLI opcional.

```bash
# ── 0. Pré-requisitos ──────────────────────────────────────────────
node -v  # >=20
npm -v

# ── 1. Scaffold ────────────────────────────────────────────────────
mkdir hub-training && cd hub-training
npm init -y
npm i express@4 cors dotenv helmet jsonwebtoken bcrypt express-rate-limit firebase-admin qrcode
npm i -D typescript tsx @types/node @types/express @types/bcrypt @types/jsonwebtoken
npm i -D --no-save better-sqlite3  # só p/ seeds/migração local (optional)

# ── 2. .env ────────────────────────────────────────────────────────
cat > .env.example <<'EOF'
NODE_ENV=development
PORT=5001
JWT_SECRET=troque-por-64-bytes-aleatorios-aqui-0123456789abcdef
JWT_EXPIRES=8h
FIREBASE_PROJECT_ID=hub-training-2200d
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@yyy.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n"
# local alternativo: GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
EOF
cp .env.example .env
# gere segredo real:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ── 3. Firebase ────────────────────────────────────────────────────
# - Criar projeto hub-training-2200d (southamerica-east1), Firestore Native Mode
# - Service account → JSON → firebase-service-account.json (NÃO commitar) ou
#   exportar FIREBASE_* no .env / Vercel Environment Variables
node scripts/verify-firebase.cjs  # após criar o arquivo abaixo

# ── 4. Estrutura de pastas ─────────────────────────────────────────
mkdir -p server/{routes,middleware,repositories,services} database/migrations scripts static src/pages/student tests docs audit

# ── 5. Migrações SQLite (origem seeds) ─────────────────────────────
# Criar nesta ordem (conteúdo = seção 7.1 desta auditoria):
# database/migrations/0001_initial_schema.sql   (19 tabelas)
# database/migrations/0002_add_unique_constraint.cjs
# database/migrations/0003_auth_tokens.sql
# database/migrations/0004_certificates.sql
# database/migrations/0005_certification_final.cjs
# database/migrate.cjs  (roda cada migration uma vez, tabela _migrations, WAL, FK ON)
node database/migrate.cjs

# ── 6. Seeds locais (ordem importa) ────────────────────────────────
node database/seed.cjs                 # roles + 6 equip types + 21 equip + 21 rel + mods 1-17
node database/seed_lessons.cjs         # lições mods 1-8
node database/seed_lessons_09_17.cjs   # lições mods 9-17
node database/seed_checkpoints.cjs     # 17 checkpoints base
node database/seed_quiz.cjs            # 30Q base (DESTRUTIVO - só 1x)
node database/seed_images.cjs
node database/seed_users.cjs           # 4 usuários demo (trocar senhas!)
node database/seed_nr10.cjs            # 7 mods + 7 lições + 11 cp + 30Q
node database/seed_ac.cjs              # 9 mods + 9 lições + 14 cp + 30Q
node scripts/fix_janela.cjs            # 21:00–06:45 → 01:00–05:00 (rode com --dry-run antes)

# ── 7. Backend (ordem de implementação) ────────────────────────────
# 7a. server/services/firebase.cjs  → initFirebase/getFirestore/getAuth/wrappers
# 7b. server/repositories/_base.cjs → collection/docRef/parseDoc/batch/now/counter
# 7c. server/repositories/*.cjs     → auth, training, quiz, progress, checkpoint,
#                                     certificate, practical, admin, audit, equipment, images
# 7d. server/middleware/auth.cjs    → JWT_SECRET/EXPIRES, authenticateToken, requireRole, requireSelfOrAdmin
# 7e. server/middleware/rateLimit.cjs → 5 limiters (10/10/5/1000/200)
# 7f. server/routes/*.cjs           → auth → training → checkpoints → progress →
#                                     quiz (PASS 23/30, 3 tentativas) → dashboard →
#                                     practical (APTO, exige teoria) → certificates →
#                                     admin (757 linhas por último) → audit → equipment → images
# 7g. server/index.cjs              → helmet/cors/json, /health, HTML sendFile,
#                                     monta /api/*, 404/500, module.exports=app
# 7h. server/services/firestoreSync.cjs → stub NO-OP (ou pule e remova requires)

# ── 8. Migração p/ Firestore ───────────────────────────────────────
node scripts/migrate_sqlite_to_firestore.cjs --dry-run
node scripts/migrate_sqlite_to_firestore.cjs
# ou por curso:
node scripts/seed_nr10_firestore.cjs --dry-run; node scripts/seed_nr10_firestore.cjs
node scripts/seed_ac_firestore.cjs --dry-run;   node scripts/seed_ac_firestore.cjs

# ── 9. Frontend ────────────────────────────────────────────────────
# home.html (landing) → static/login|register|reset|admin_login.html →
# dashboard.html + static/dashboard.js/css (SPA: study→checkpoint→quiz→certificate) →
# validar.html (pública) → static/admin.html (pipeline + issueModal + attempts)

# ── 10. Rodar + testar ─────────────────────────────────────────────
npm run dev & sleep 3
curl -s localhost:5000/health
node tests/test_auth_full.cjs   # esperado 27/27
node tests/final_acceptance.cjs # esperado 41/41 (npm run test:final)

# ── 11. Build + deploy Vercel ──────────────────────────────────────
npm run build
# vercel.json: builds [{src:server/index.cjs, use:@vercel/node, includeFiles:[static/**,home.html,dashboard.html,validar.html]}]
# routes: /=/dashboard/simulado/login/register/reset/admin*/validar/*/health/api/* → /server/index.cjs
vercel --prod
# Em produção: JWT_SECRET 64B, HTTPS+WAF, restringir /admin por IP/VPN, backup diário training.db
```

**Checklist de aceite do rebuild:** `/health` OK + Firestore `FONTE PRIMÁRIA ATIVA`; 33 módulos listados; `/api/quiz/questions` sem `is_correct` p/ STUDENT; submit 22→`NÃO APROVADO` sem score, 23→`APROVADO`; 2º submit checkpoint→`409`; IDOR `403`; `test:final` 41/41; `/validar/HUB-...` público com QR.

---
*Fim da auditoria. Documento gerado por engenharia a partir de leitura direta do código — sem inferência não verificada.*
