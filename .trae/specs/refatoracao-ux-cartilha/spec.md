# Refatoração UX — Separação Home × Cartilha Digital

## Overview
- **Summary**: Reorganizar a experiência do HUB Training separando a página inicial (portal/apresentação) da área de estudo (cartilha digital completa), mantendo integralmente autenticação, RBAC, regras do simulado, persistência e conteúdo técnico existente.
- **Purpose**: Corrigir o fluxo conceitual: o aluno deve entender rapidamente "onde está", "o que vai aprender" e "onde começar a estudar" — sem que a home despeje conteúdo técnico aprofundado.
- **Target Users**: Aluno STUDENT (jornada principal) e administrador ADMIN (visualização e auditoria).

## Goals
- Home = portal de apresentação, navegação e KPIs (não área de estudo).
- "Estudar Cartilha" = ambiente dedicado que se assemelha a uma cartilha/manual de treinamento completo, com índice lateral, estrutura didática por módulo (M01–M17), caixas informativas, alertas e navegação anterior/próximo.
- Simulado Final = área separada da cartilha, com CTA claro pós-estudo.
- Preservar identidade visual existente (sidebar azul-marinho, topbar branca, hero, cards, KPIs, tokens CSS), responsividade, JWT/RBAC, score mínimo 23/30, status PENDING_TECHNICAL_VALIDATION e conteúdo técnico sem reescrita autoral.

## Non-Goals
- Não reescrever conteúdo técnico já gravado no banco (training_lessons.content, descrições de módulos, questões do simulado).
- Não alterar JWT, RBAC, autenticação, criptografia de senha, regras de autorização de endpoints, auditoria existente.
- Não alterar PASS_SCORE = 23 nem lógica de aprovação/reprovação.
- Não alterar banco/schema sem necessidade; preferir reutilizar `training_modules`, `training_lessons`, `lesson_progress`, `checkpoints`, `quiz_*`, `audit_logs`.
- Não mover lógica sensível (gabarito, score, roles) para o frontend.
- Não remover funcionalidades existentes (KPIs, progresso, checkpoints, cer tificado, tela ADM, etc.).
- Não aprovar tecnicamente o conteúdo; manter o status PENDING_TECHNICAL_VALIDATION.

## Background & Context
O código atual já implementa uma SPA em `dashboard.html` + `static/dashboard.js` com: menu lateral (Início / Estudar Cartilha / Simulado / Certificado / Ajuda / Área ADM), hero da home com CTAs, seção "O que você vai aprender" com 10 cards resumidos, "Como funciona o treinamento" com 5 passos, página `page-study` com progresso e índice, páginas `page-module` e `page-lesson` com navegação anterior/próximo e checkpoints, simulado separado e regras 23/30 preservadas. Os dados de módulos/lições já residem em `training.db` (estrutura `training_modules`, `training_lessons`, `lesson_progress`).

## Functional Requirements

- **FR-1**: A home (`#dashboard`) responde às perguntas "O que é este treinamento?", "O que vou aprender?", "Quanto já avancei?", "Onde começo?", "Como faço a avaliação?" sem exibir lições completas ou duplicar conteúdo aprofundado da cartilha.
- **FR-2**: Hero da home contém: título "Treinamento de Manutenção Elétrica", subtítulo explicativo (infraestrutura, rotina preventiva, medições, baterias, UPS, FCC, Infratel, segurança, avaliação final), status "PENDENTE DE VALIDAÇÃO TÉCNICA" quando aplicável, e dois CTAs principais: [ESTUDAR CARTILHA] e [SIMULADO FINAL].
- **FR-3**: Home contém a seção "O que você vai aprender" com cards-resumo para (pelo menos) Infraestrutura, UPS, FCC e Sistema DC, Baterias, Manutenção Preventiva, Medições, Corrente dos Circuitos, HIOKI, Infratel, Segurança. Esses cards são apenas resumos; o conteúdo completo permanece na cartilha.
- **FR-4**: Home contém a seção "Como funciona o treinamento" com a sequência visual 01 ESTUDE → 02 CONHEÇA A INFRAESTRUTURA → 03 CONCLUA AS LIÇÕES → 04 FAÇA O SIMULADO → 05 RESULTADO (indicando a regra 23/30).
- **FR-5**: Home contém KPIs (módulos concluídos, aulas, checkpoints, progresso geral) e sidebar direita com resumo do curso (como atualmente). A "prévia de módulos" na home não duplica a cartilha; se houver grid de módulos ele deve ser claramente um atalho para a área de estudo.
- **FR-6**: Rota/área `#study` ("Estudar Cartilha") funciona como cartilha digital, não como mais um grid de cards do dashboard.
- **FR-7**: Área Estudar Cartilha exibe: barra de progresso do treinamento (X concluídos, Y em andamento, Z restantes), busca/filtro textual, e um ÍNDICE DA CARTILHA (M01 Visão Geral da Infraestrutura … M17 Segurança — 17 módulos no total) com status por módulo (✓ Concluído, ◐ Em andamento, ○ Não iniciado) e clicar leva ao módulo correspondente, respeitando a regra de progresso existente.
- **FR-8**: Página interna de módulo (`page-module`) apresenta estrutura didática: breadcrumb dinâmico, badge "MÓDULO NN", título do módulo, caixa "OBJETIVO DO MÓDULO", lista de lições, e navegação Anterior / Índice / Próximo. Conteúdo técnico obtido via `/api/training/module/:id` (sem reescrita).
- **FR-9**: Página interna de lição (`page-lesson`) apresenta estrutura didática: breadcrumb dinâmico (Início › Estudar Cartilha › Módulo › Título da aula), badges de classificação, caixa "OBJETIVO", conteúdo renderizado a partir de `training_lessons.content`, caixa de alerta/warning com PENDING_TECHNICAL_VALIDATION, figura do fluxograma real (somente quando aplicável, ex: M01) com legenda "DOCUMENTAÇÃO TÉCNICA", checkpoints, botão [CONCLUIR LIÇÃO], e navegação [← ANTERIOR] [ÍNDICE] [PRÓXIMO →].
- **FR-10**: Simulado Final permanece em área separada (`#quiz`), com: 30 questões, regra 23/30, STUDENT recebe apenas APROVADO / NÃO APROVADO (sem score detalhado), ADMIN recebe detalhamento completo. Existe CTA claro "Você concluiu seus estudos? Teste seus conhecimentos no Simulado Final." com [INICIAR SIMULADO].
- **FR-11**: Menu lateral reorganizado com seções visuais: (1) INÍCIO, (2) ESTUDAR CARTILHA (ícone 📖/fa-book-open), (3) SIMULADO FINAL (ícone 📝/fa-clipboard-list), (4) CERTIFICADO (ícone 🏆/fa-certificate), (5) AJUDA (ícone ❓/fa-question-circle) e — separado visualmente — (6) ADMINISTRAÇÃO com Área ADM. A exibição/link do menu ADM continua dependendo de RBAC no backend; a simples ocultação visual NÃO é mecanismo de segurança.
- **FR-12**: Breadcrumb do topo é dinâmico e reflete a página atual (ex: `Início › Treinamento` na home; `Início › Estudar Cartilha › M07 › Bancos de Baterias` na lição).
- **FR-13**: Persistência de progresso e checkpoints continua via `lesson_progress`; os endpoints `/api/progress/*`, `/api/checkpoints/*`, `/api/training/*` continuam a autoridade. Nenhuma regressão em completar aula, avançar módulo, salvar checkpoint.

## Non-Functional Requirements

- **NFR-1 (Responsividade)**: Breakpoints em 1100px, 900px e 560px. No desktop: três colunas (sidebar app + conteúdo + sidebar direita). Tablet (≤1100): oculta sidebar direita, conteúdo ocupa largura. Celular (≤560): sidebar recolhível/off-canvas, índice da cartilha acessível, conteúdo em uma coluna, tabelas com `overflow-x: auto`, imagens com `max-width: 100%`, botões Anterior/Próximo clicáveis (altura ≥ 44px).
- **NFR-2 (Identidade visual)**: Preservar tema claro, fundo cinza-azulado (`#f3f4f6`), sidebar azul-marinho (`--sidebar-bg: #1a2332`), topbar branca/cinza-claro, raios 12px, sombras suaves, tokens CSS (`--primary-blue`, `--success-green`, `--warning-yellow`, `--text-dark`, `--text-muted`, `--border-color`). A nova área de estudo (cartilha) pertence ao MESMO sistema (nenhum design desconectado).
- **NFR-3 (Performance)**: Navegação SPA client-side; nenhum recarregamento de página ao trocar views (exceto login/logout externos). Carregamento inicial via `checkAuth()` e `loadDashboardData()` sem regressão perceptível.
- **NFR-4 (Segurança)**: Continuar uso de `Authorization: Bearer <token>` em `apiCall()`; endpoints com `helmet` + `rateLimit`; score/gabarito calculados exclusivamente no backend (ver `/api/quiz/submit`). Nenhuma exposição de `correct_option` no payload do STUDENT.
- **NFR-5 (Acessibilidade a11y)**: Foco visível (`:focus-visible`), botões Anterior/Próximo com aria-labels, `role="progressbar"` em barras de progresso, `aria-pressed` em option-buttons, labels `sr-only` para campos de busca, heading hierarchy consistente (h1 hero, h2 seções, h3 sub-seções).
- **NFR-6 (Conteúdo técnico)**: Toda informação didática origina-se do banco (módulos, lições, imagens cadastradas). Não inventar imagens técnicas falsas. O fluxograma real (`fluxograma.jpg`) continua como "DOCUMENTAÇÃO TÉCNICA". Na ausência de imagem real, usar caixa textual explicativa ou tag "REFERÊNCIA ILUSTRATIVA" clara.
- **NFR-7 (Build/Sintaxe)**: `node --check static/dashboard.js` e sintaxe HTML/CSS válidas. Sem dependências novas não autorizadas.

## Constraints
- **Technical**:
  - Stack atual preservada: Python WSGI (`app.py`) e Node/Express (`server/index.cjs`), SPA nativa (sem React/Vue), SQLite (`training.db`), CSS puro em `static/dashboard.css`, JS vanilla em `static/dashboard.js`.
  - PASS_SCORE = 23 (constante em app.py e backend quiz).
  - Nenhum schema novo em banco a menos que estritamente necessário (preferir reutilizar tabelas existentes).
  - Nenhum `any` no TypeScript existente em `database/` (mantém `unknown`/genéricos quando houver).
- **Business**:
  - Conteúdo "PENDING_TECHNICAL_VALIDATION" — nenhuma afirmação no front pode ser lida como "norma" ou "procedimento obrigatório" sem aviso claro.
  - Preservar toda funcionalidade já auditada (RBAC, endpoints protegidos, auditoria).
- **Dependencies**:
  - FontAwesome CDN 6.4.0 já em uso.
  - `helmet`, `cors`, `express-rate-limit`, `dotenv`, `better-sqlite3` em package.json. NÃO adicionar novas libs.

## Assumptions
- Os 17 módulos já existem em `training_modules` (M01…M17) e as lições já foram semeadas por `seed.cjs`, `seed_lessons.cjs`, `seed_lessons_09_17.cjs`. Se faltarem, a execução dos seeds é requisito prévio do ambiente, não scope desta refatoração de UX.
- O backend `/api/training/module/:id`, `/api/training/lesson/:id`, `/api/dashboard/summary`, `/api/progress/*`, `/api/checkpoints/*`, `/api/quiz/*`, `/api/admin/*` já operam corretamente com RBAC via middleware de autenticação.
- A "tela web.png" de referência visual já define o design system; esta refatoração apenas reorganiza conteúdo/layout dentro dele.

## Acceptance Criteria

### AC-1: Home = apresentação, não estudo
- **Type**: `rule`
- **Given**: Aluno STUDENT autenticado na página `#dashboard`
- **When**: Inspecionar a página
- **Then**: (a) Hero com título/subtítulo/status/2 CTAs; (b) 4 KPIs; (c) "O que você vai aprender" com 10+ cards-resumo; (d) "Como funciona" com 5 passos; (e) NENHUMA lição completa exibida (nenhum conteúdo de `training_lessons.content` renderizado na home)
- **Pass Condition**: Todos os subitens (a)-(e) são observáveis visualmente
- **Evidence**: Screenshot da home + inspeção do DOM via ferramenta de desenvolvedor confirmando ausência de `lesson-content` na view `#dashboard`

### AC-2: Área "Estudar Cartilha" = ambiente completo de estudo
- **Type**: `rubric`
- **Dimension**: Semelhança com uma cartilha/manual digital (estrutura, navegabilidade, componentes didáticos)
- **Scale**: 1-5
- **Anchors**: 1 = apenas lista de cards idênticos ao dashboard; 3 = tem índice + progresso mas sem estrutura didática nas páginas internas; 5 = tem índice com status, progresso, busca, breadcrumb dinâmico, páginas internas com Objetivo, alertas, figuras, checkpoints e navegação anterior/próximo consistentes
- **Pass Threshold**: >= 4
- **Evidence**: Inspeção visual de `#study`, `#page-module`, `#page-lesson` (screenshots)

### AC-3: 17 módulos acessíveis pela cartilha
- **Type**: `rule`
- **Given**: Aluno STUDENT autenticado em `#study`
- **When**: Renderizar `studyIndex`
- **Then**: 17 linhas (M01 … M17), cada uma com número, título e status (✓/◐/○). Clicar em M01 e depois em M17 navega corretamente.
- **Pass Condition**: `document.querySelectorAll('#studyIndex .study-row').length === 17` e navegação M01→M17 ocorre sem erros.
- **Evidence**: Saída do console do browser com length===17 + logs de navegação sem exceptions.

### AC-4: Simulado separado e regra 23/30 preservada
- **Type**: `rule`
- **Given**: Aluno STUDENT autenticado
- **When**: Rodar cenários de submit (22/30, 23/30, 30/30) via `apiCall('/api/quiz/submit')`
- **Then**: (a) 22/30 → NÃO APROVADO; (b) 23/30 → APROVADO; (c) 30/30 → APROVADO; (d) STUDENT NÃO vê score numérico nem gabarito no payload `/api/quiz/my-attempts`; (e) ADMIN vê score completo + gabarito em `/api/admin/attempt/:id`
- **Pass Condition**: Todos os subitens (a)-(e) passam
- **Evidence**: Screenshots do simulado + payloads das respostas HTTP capturados via Network

### AC-5: Progresso preservado sem regressão
- **Type**: `rule`
- **Given**: STUDENT com lições já concluídas
- **When**: Marcar lição como concluída via completeLesson() e recarregar a página
- **Then**: (a) KPI "Aulas" reflete o avanço; (b) status do módulo em `#study` muda de acordo; (c) entrada `lesson_progress.status=COMPLETED` no banco
- **Pass Condition**: (a)(b)(c) confirmados
- **Evidence**: SQL direto `SELECT * FROM lesson_progress WHERE user_id=?` + UI refletindo valores

### AC-6: Segurança e RBAC preservados
- **Type**: `rule`
- **Given**: Usuário STUDENT sem token, e STUDENT com token, e STUDENT tentando /api/admin
- **When**: (1) `GET /api/admin/dashboard` sem `Authorization`; (2) STUDENT JWT válido para `/api/admin/dashboard`; (3) payload `/api/quiz/questions` não contém `is_correct`
- **Then**: (1) 401; (2) 403; (3) nenhum campo `correct`/`is_correct` na resposta do STUDENT
- **Pass Condition**: (1)(2)(3) atendidos
- **Evidence**: curl / Postman captures ou DevTools Network tab

### AC-7: PENDING_TECHNICAL_VALIDATION visível em home e lições
- **Type**: `rule`
- **Given**: Home (#dashboard) e lição M01 aberta
- **When**: Inspecionar conteúdo textual
- **Then**: Badge com texto "PENDENTE DE VALIDAÇÃO TÉCNICA" (ou variação aprovada) aparece em ambos os locais; warnbox na lição reforça que o treinamento não substitui NR-10/procedimentos/fabricante.
- **Pass Condition**: Badge presente em home + warnbox em lição.
- **Evidence**: Screenshots.

### AC-8: Responsividade nos breakpoints exigidos
- **Type**: `rubric`
- **Dimension**: Comportamento visual em 1100px, 900px e 560px
- **Scale**: 1-5
- **Anchors**: 1 = layout quebra em algum breakpoint; 3 = funciona mas botões pequenos, sem scroll em tabelas; 5 = 3 colunas → 2 → 1 sem quebra, imagens responsivas, tabelas com scroll, sidebar recolhível no mobile, botões com ≥44px de toque
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots em 1100px / 900px / 560px do Chrome DevTools.

### AC-9: Nenhuma regressão funcional básica
- **Type**: `rule`
- **Given**: Ambiente rodando
- **When**: Executar sequência: Login → abrir Home → abrir Estudar Cartilha → navegar M01 → abrir 1ª lição → responder checkpoint → concluir lição → abrir M17 → Anterior → Simulado → 23/30 → Resultado APROVADO → Logout
- **Then**: Nenhuma exceção JS, nenhum 500/400 inesperado, progresso persistido, resultado correto.
- **Pass Condition**: Fluxo completo sem erros.
- **Evidence**: Console do browser limpo (sem error/fatal) + server logs sem stacktrace.

### AC-10: Fluxograma real preservado sem topologia nova
- **Type**: `rule`
- **Given**: Lição M01 aberta
- **When**: Verificar a figura exibida
- **Then**: Fonte `/static/fluxograma.jpg` (o arquivo oficial fornecido), legenda contém "DOCUMENTAÇÃO TÉCNICA", nenhum diagrama novo inventado substitui o fluxograma real.
- **Pass Condition**: `img.src` termina em `/fluxograma.jpg` e legenda existe
- **Evidence**: Screenshot + inspetor de elementos.

### AC-11: Breadcrumb dinâmico + menu lateral correto
- **Type**: `rule`
- **Given**: Navegar sucessivamente Home → #study → M01 → lição 1 → #quiz → #certificate → #help
- **When**: A cada troca de view
- **Then**: (a) Menu lateral ativa o item correto (`nav-item.active`) em cada passo; (b) Breadcrumb do topo atualiza refletindo a hierarquia (ex: "Início › Estudar Cartilha › M01 › Arquitetura Elétrica").
- **Pass Condition**: (a) e (b) corretos em todas as views visitadas
- **Evidence**: Screenshots passo-a-passo.

## Open Questions
- [ ] Confirmar se os 17 módulos já estão 100% semeados no banco do ambiente atual (se não, rodar `database/seed.cjs`, `seed_lessons.cjs`, `seed_lessons_09_17.cjs`, `seed_checkpoints.cjs` antes da validação visual).
- [ ] A home atualmente renderiza um grid "Módulos do Treinamento" completo abaixo dos cards resumo. Confirmar se deve ser reduzido para 3-6 módulos (destaque) com CTA "Ver todos na Cartilha" ou se a seção de módulos na home deve ser removida, mantendo apenas a prévia via cards-resumo "O que você vai aprender." (Hipótese default: reduzir para destacar 3 primeiros + CTA para cartilha, mantendo a seção leve para não duplicar.)
