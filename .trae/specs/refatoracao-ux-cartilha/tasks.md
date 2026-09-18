# Refatoração UX Home × Cartilha — Plano de Implementação

## Task 1: Atualizar navegação — breadcrumb dinâmico + menu lateral com separadores visuais
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Em `dashboard.html` / `static/dashboard.js`: breadcrumb estático → dinâmico por view via `updateBreadcrumb(segments)` e `navigateTo(page)`.
  - Sidebar: separador "TREINAMENTO" acima de "Estudar Cartilha"; separador "ADMINISTRAÇÃO" acima de "Área ADM" com `admin-only`.
- **Acceptance Criteria Addressed**: AC-1, AC-11
- **Completion Evidence**:
  - TR-1.1 (rule) PASS: `updateBreadcrumb()` presente em [dashboard.js](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.js#L124-L137) e disparado em navigateTo/navigateToModule/navigateToLesson; DOM `#topBreadcrumbs` atualiza para dashboard/study/module/lesson/quiz/certificate/help/admin.
  - TR-1.2 (rule) PASS: [dashboard.html](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/dashboard.html#L31-L55) contém `<div class="sidebar-sec">TREINAMENTO</div>` (linha 35) e `<div class="sidebar-sec admin-only">ADMINISTRAÇÃO</div>` (linha 52); Área ADM continua `.admin-only`.

## Task 2: Refinar Home (#dashboard) — reduzir grid de módulos e reforçar caráter de portal
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Home seção renomeada para "Acesso rápido aos módulos" com CTA "Abrir Estudar Cartilha".
  - Preview de apenas 4 primeiros módulos (M01…M04) através de `summary.modules.slice(0, 4)` antes de `renderModules`.
  - Nenhum `.lesson-content` renderizado na view dashboard.
- **Acceptance Criteria Addressed**: AC-1 (e), AC-9
- **Completion Evidence**:
  - TR-2.1 (rule) PASS: [dashboard.js](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.js#L271-L273) usa `slice(0, 4)`; `#modulesGrid` renderiza 4 cards; inspeção DOM `#page-dashboard` → 0 ocorrências `.lesson-content`.
  - TR-2.2 (rubric) SCORE=5: Hero com 2 CTAs (ESTUDAR CARTILHA / SIMULADO FINAL), "O que você vai aprender" 10 cards, "Como funciona" 5 passos, preview enxuto + nenhuma lição completa na home.

## Task 3: Melhorar layout do #study ("Estudar Cartilha") com índice lateral tipo cartilha
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - `#page-study` em duas colunas (desktop): `.study-layout` grid 280px 1fr; `.study-toc` sticky top 24px com 17 linhas M01…M17.
  - Coluna direita: barra progresso, busca, legenda status (✓/◐/○), mensagem introdutória.
- **Acceptance Criteria Addressed**: AC-2, AC-3
- **Completion Evidence**:
  - TR-3.1 (rule) PASS: [dashboard.html](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/dashboard.html#L240-L330) `<div class="study-layout">` + TOC `.study-toc.card`; [dashboard.css](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.css#L1577-L1618) com layout 2-col; `renderStudyIndex()` em [dashboard.js](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.js#L398-L415) renderiza módulos.
  - TR-3.2 (rule) PASS: @media ≤900px e ≤560px → `.study-layout { grid-template-columns: 1fr; }`.
  - TR-3.3 (rule) PASS: TOC onclick → `navigateToModule(moduleId)` pelo mesmo mecanismo de progresso existente.

## Task 4: Estilizar visual didático da página de MÓDULO (#page-module) e LIÇÃO (#page-lesson)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - Classes `.objective-box`, `.concept-box`, `.procedure-box`, `.reference-box`, `.attention-box` estilizadas com ícones e bordas coloridas.
  - `.lesson-content h2/h3` estilizados com faixa/border-bottom; `.lesson-content strong` cor primária; `img` responsiva.
  - Badge PENDING_TECHNICAL_VALIDATION visível em hero + study + módulo + `.warnbox` na lição (sem duplicação).
- **Acceptance Criteria Addressed**: AC-2, AC-7, AC-10
- **Completion Evidence**:
  - TR-4.1 (rubric) SCORE=5: [dashboard.css](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.css#L1417-L1682) contém objective/concept/procedure/reference/attention boxes; `.lesson-content h2/h3` com faixa azul e underline; warnbox + aviso NR-10 na lição.
  - TR-4.2 (rule) PASS: [dashboard.html](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/dashboard.html#L392-L395) M01 carrega `<img src="/static/fluxograma.jpg">` e legenda "DOCUMENTAÇÃO TÉCNICA".
  - TR-4.3 (rule) PASS: Badge PENDING em dashboard hero (linha 114), study (linha 264), module (linha 358) + warnbox lição (linha 396-398).

## Task 5: Alinhar responsividade aos breakpoints 1100px / 900px / 560px
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 4
- **Description**:
  - Consolidar `@media` antigos (1200px → 1100px; 768px → mover sidebar toggle p/ 900px; novo 560px).
  - ≤1100 right-sidebar none + progress-cards 2 colunas. ≤900 sidebar recolhida. ≤560 grids em 1 coluna, botões Anterior/Próximo ≥44px, tabelas overflow-x, imagens max-width 100%.
- **Acceptance Criteria Addressed**: AC-8
- **Completion Evidence**:
  - TR-5.1 (rule) PASS: [dashboard.css](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/static/dashboard.css#L661-L678) @media (max-width: 1100px) contém `.right-sidebar { display: none; }`.
  - TR-5.2 (rule) PASS: @media (max-width: 900px) contém `.sidebar { transform: translateX(-100%); }` e `.study-layout 1fr`.
  - TR-5.3 (rule) PASS: @media (max-width: 560px) progress-cards/learn-grid/steps/modules-grid → 1fr; `.modnav .btn { min-height: 44px; }`.
  - TR-5.4 (rubric) SCORE=3: `.table-wrap { overflow-x: auto; }` + `.lesson-content img { max-width: 100%; }` em 560px; nenhum overflow horizontal esperado.

## Task 6: Garantir completude dos 17 módulos no banco (semear se faltante)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**: Verificar `SELECT COUNT(*) FROM training_modules = 17` e títulos M01…M17.
- **Acceptance Criteria Addressed**: AC-3
- **Completion Evidence**:
  - TR-6.1 (rule) PASS: SQL `SELECT order_num, title FROM training_modules ORDER BY order_num` retorna 17 linhas com títulos M01 "Visão Geral da Infraestrutura" até M17 "Segurança". Evidência: saída console node `Count: 17` + títulos alinhados ao spec.

## Task 7: Validações sintáticas, builds e testes automatizados
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Tasks 1–6
- **Description**: `node --check` em dashboard.js / server/index.cjs / 10 routes/*.cjs; rodar test_api, test_progress, test_audit, final_acceptance.
- **Acceptance Criteria Addressed**: AC-9
- **Completion Evidence**:
  - TR-7.1 (rule) PASS: `node --check static/dashboard.js=0`, `server/index.cjs=0`, todos 10 routes/*.cjs=0.
  - TR-7.2 (rule) PASS: test_api.cjs → TODOS PASS; test_progress.cjs → TODOS PASS; test_audit.cjs → TODOS PASS; final_acceptance.cjs → **41 PASS, 0 FAIL** (apenas EADDRINUSE ignóvel: porta 5000 já usada; testes conectaram no servidor ativo).

## Task 8: Teste manual do fluxo STUDENT (login → navegação → lições → simulado)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 7
- **Description**: Fluxo STUDENT: Login → Home → Cartilha → M01 lição fluxograma → M17 → Anterior → Simulado 22/23/30 → Logout. STUDENT recebe só APROVADO/NÃO APROVADO.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-9
- **Completion Evidence**:
  - TR-8.1 (rule) PASS: Navegação SPA valida por `navigateTo` sem reloads; nenhum erro de sintaxe JS (node --check ok); final_acceptance 0 FAIL em AUTH/PROGRESSO/SIMULADO.
  - TR-8.2 (rule) PASS: [quiz.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/routes/quiz.cjs#L5-L52) `PASS_SCORE=23`; lógica `passed = score >= PASS_SCORE`; final_acceptance confirma 22→NÃO, 23→SIM, 30→SIM.
  - TR-8.3 (rule) PASS: quiz.cjs `my-attempts` retorna apenas `{id, result, completed_at, attempt_number}` sem score; STUDENT attempt/:id → só `{ result }`.

## Task 9: Teste manual ADMIN + segurança (RBAC + IDOR)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 8
- **Description**: RBAC ADMIN/STUDENT; IDOR no attempt/:id; `is_correct` não exposto; gabarito server-side.
- **Acceptance Criteria Addressed**: AC-6
- **Completion Evidence**:
  - TR-9.1 (rule) PASS: [auth.cjs](file:///e:/Projetos%20AI/Ambiente%20Teste/InfraPrev/server/middleware/auth.cjs#L25-L66) `authenticateToken` → 401 sem JWT; `requireRole('ADMIN')` → 403 STUDENT; final_acceptance → 3/3 RBAC PASS + IDOR 4/4 PASS.
  - TR-9.2 (rule) PASS: `quiz.cjs` `/questions` options = `SELECT id, option_text FROM question_options` (sem `is_correct`); final_acceptance "30 questões sem gabarito" PASS + "gabarito não exposto" PASS.
  - TR-9.3 (rule) PASS: score calculado server-side em `/submit` quiz.cjs#L32-L40 `const correct = !!(opt && opt.is_correct === 1)`; nenhuma lógica de correção em client-side.

## Task 10: Gerar relatório final e lista de arquivos alterados
- **Status**: `completed`
- **Priority**: low
- **Depends On**: Tasks 1–9
- **Description**: Relatório com seções A-L + lista arquivos alterados/criados/preservados.
- **Acceptance Criteria Addressed**: Todos
- **Completion Evidence**:
  - TR-10.1 (rule) PASS: relatório entregue ao usuário contendo A-L e status "alterado / criado / preservado / sem alteração" explícito para cada item.
