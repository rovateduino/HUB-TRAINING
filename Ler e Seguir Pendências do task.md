# Ler e Seguir Pendências do task.md

> **Workspace:** e:\Projetos AI\Ambiente Teste\HUB TRAINING

---

**User**

leia o arquivo task.md e siga com as pendencias

**Assistant**

Vou ler os artefatos do spec mode para entender o estado atual e as pendências.

Vou começar verificando o estado atual dos arquivos para a Task 15 (em progresso).

Perfeito. Task 15 está `pending` no tasks.md (meu TODO estava adiantado). Vou executar os 3 itens em paralelo: criar `.env.example`, atualizar `.gitignore`, e limpar `package.json`.

Agora valido TR-15.1 (grep) e, em seguida, atualizo a Task 15 no tasks.md com Evidence. Depois sigo para a Task 14 (Seed Cartilha).

TR-15.1 PASS: `better-sqlite3` aparece apenas linha 38, dentro de `devDependencies`; `drizzle-orm` totalmente removido de `dependencies` (`drizzle-kit` permanece devDeps). Vou atualizar a Task 15 no tasks.md e depois inspecionar o TrainingRepo para confirmar assinaturas da Task 14.

Antes de criar o script da Task 14, preciso inspecionar o `seed_enriquecimento_cartilha.cjs` (o maior) para confirmar seu padrão (sobrescreve vs apenda) e os marcadores. Depois crio o script Firestore com ordem correta de aplicação.

Vou ler a parte final do `seed_enriquecimento_cartilha.cjs` para ver a lógica completa de montagem do content, IDs cobertos e como ele mescla QUIZ_MARKER (para replicar no Firestore). Depois crio o script consolidado.

Agora tenho todos os mapeamentos: IDs ENRIQUECIMENTO = 2-18 (17 lições), APPEND IDs = 2,8,10,11,12,13,14,15,16,17,18, QUIZ IDs = mesmos 11, M01 desc. Vou ler o objeto AULA completo (~1300 linhas) e criar o script Firestore consolidado.

Agora tenho todos os dados dos 3 seeds consolidados. Vou atualizar o status do TODO (Task15 concluída, Task14 em progresso) e criar o script `seed_cartilha_firestore.cjs` com os 4 passos: módulo, enriquecimento, append, quiz — todos idempotentes.

===

O erro foi só ausência de `file_path`. Vou criar o arquivo completo agora (utilizo os objetos inline pois são dados estáticos dos seeds originais).ada

Vou começar identificando o estado atual do arquivo truncado e verificando o tasks.md. Em seguida, reparo o script da Task 14 e prossigo com as validações e tasks restantes.

Arquivo confirmado TRUNCADO. Preciso do conteúdo completo das lições 17 (final) e 18 para reparar. Vou ler os seeds originais SQLite como referência.

Agora tenho o conteúdo completo. Vou reparar o arquivo em duas etapas: primeiro completo o final da lição 17 e adiciono a lição 18, depois fecho o objeto AULA e adiciono a invocação do main().

Arquivo reparado com sucesso. Agora vou validar a sintaxe e executar o script em 2 rodadas (1ª com changes, 2ª com 0 skips anti-duplicata).

Sintaxe validada (exit 0). Agora executar a 1ª rodada do seed para aplicar changes.

1ª execução OK: 12 changes aplicadas (M01 desc + 11 Appends). Enriquecimento e Quiz já estavam presentes de migração anterior (skips). Agora executar a 2ª vez para confirmar idempotência (0 changes).

TR-14.1 CONCLUÍDO (2ª execução = `✅ 0 changes, all skipped by anti-duplicate markers). Agora validar TR-14.2: lição 2 content contém `CARTILHA_APPENDED_v1.

TR-14.1 e TR-14.2 ambos PASSARAM. Agora atualizo o Completion Evidence da Task 14 no tasks.md e marco como completed.

Task 14 100% concluída. Agora vou para Task 16: Smoke E2E + grep AC-7 (zero matches SQLite em runtime).

Primeiro executo o grep AC-7 (mais rápido) e verifico se já existem testes/smoke scripts no projeto.

TR-16.2 AC-7 PASSOU (grep server/**/*.cjs = 0 matches). Agora verifico os testes existentes para validar se cobrem os 14 passos E2E; se sim reaproveito, senão crio smoke_contract.cjs.

Os testes existentes usam `better-sqlite3` diretamente para montar gabarito/cleanup — incompatíveis com Firestore primário. Vou criar `scripts/smoke_contract.cjs` novo cobrindo os 14 passos do tasks.md usando apenas HTTP. Em seguida valido a sintaxe, subo servidor na porta 5101 e executo.

Agora validar sintaxe e executar o smoke contract. O script já gerencia o spawn do servidor na porta 5101 e o cleanup ao final.

Smoke executou mas com 4 FAIL de paths que divergem (404/403). Preciso verificar as rotas reais no `server/index.cjs` e ajustar o smoke com os paths corretos. Antes, matar o processo que está ocupando porta 5101.

Agora sei os paths corretos. Vou ajustar o smoke: GET progress → use `/api/progress/user/:id`; promote/issue-certificate são endpoints `/api/admin/`; quiz submit 403 pode ser legítimo. Mudo porta para 5102 e reexecuto.

---

