# Relatório de Etapa 3 — Distribuição Tauri + Núcleo CORE-03/04/05 e Prova Artística de 1 Estação (R03_02)

- **Data:** 2026-11-18 (UTC-3)
- **Branches atualizadas e preservadas:**
  - `agent/antigravity/core-mcp-drive` -> commit `470fc0b` (`C:\Users\PC NOVO\Projetos\worktrees\core-mcp-drive`)
  - `agent/antigravity/floor03-pilot` -> commit `e4a24c1` (`C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot`)
  - `main` (`48100ed`) e **PR #1** (`agent/codex/visual-5-floors` · `e666912`) preservados intactos; nenhum merge, deploy ou exclusão de arquivos do SSD foi executado.
- **Contratos protegidos preservados intocados:** `src/core-contracts/agentState.ts`, `tests/agentState.node.test.mjs`, `src/lib/policy.ts` e `tests/policy.test.ts`.

---

## 1. Arquitetura Tauri 2 + Node/SQLite para Distribuição Windows (Sem Instalações Manuais)

Validado antes da implementação de `CORE-03/04/05` em [ARQUITETURA_DISTRIBUICAO_TAURI_NODE_SQLITE.md](./ARQUITETURA_DISTRIBUICAO_TAURI_NODE_SQLITE.md) e [tauriSidecarRuntime.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/core-mcp-drive/src/core/runtime/tauriSidecarRuntime.ts):

- **Empacotamento primário:** Sidecar Tauri 2 (`bundle.externalBin`) gerado via **Node 26 Single Executable Application (`node --build-sea`)** em `src-tauri/binaries/cloud-workspace-core-x86_64-pc-windows-msvc.exe` (flag `--build-sea` confirmada no `Node.js v26.7.0`).
- **SQLite embarcado sem dependências C++:** Utiliza `node:sqlite` (`DatabaseSync`) nativo do Node 26 em modo `WAL` + `PRAGMA foreign_keys = ON`, eliminando necessidade de usuário instalar Node.js, npm, SQLite ou ferramentas nativas no Windows.
- **Blindagem contra `G:\`:** `resolveSidecarConfig()` bloqueia qualquer tentativa de armazenar `workspace.sqlite`, workspaces temporários ou snapshots cifrados dentro da unidade `G:\` ou pastas sincronizadas do Google Drive (`Meu Drive` / `DriveFS`). O serviço escuta somente em `127.0.0.1` e `stdio`.

---

## 2. Implementação do Núcleo (`CORE-03 / 04 / 05` · Commit `470fc0b`)

- **Helpers adicionados sem quebra de contrato (`sqliteStore.ts`):** `getProject()`, `getWorkspace()`, `listWorkspaces()`, `listSyncJobs()`, `getBackupRecord()` e `listTableNames()`.
- **`CORE-03` — Gateway MCP Local ([localMcpGateway.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/core-mcp-drive/src/core/mcp/localMcpGateway.ts)):**
  - Suporte JSON-RPC 2.0 sobre `stdio` e HTTP loopback restrito a `127.0.0.1`.
  - Proteção contra DNS rebinding via validação estrita do cabeçalho `Origin` (`http://127.0.0.1:1420`, `http://localhost:1420`, `tauri://localhost`, `https://tauri.localhost` -> `403` fora da allowlist).
  - Autenticação por token Bearer de sessão curta (`issueSessionToken`), confinamento estrito de caminhos (`resolveConfinedWorkspacePath`), allowlist de perfis de comando por stack (`COMMAND_ALLOWLIST_BY_STACK`, bloqueando comandos arbitrários e metacaracteres de shell) e bloqueio de commit/push fora de branches `agent/*`.
  - Exposição das 14 ferramentas do Plano Mestre (`projects_list`, `project_get`, `workspace_prepare`, `workspace_status`, `files_read`, `files_patch`, `tests_run`, `tests_status`, `tests_logs`, `git_diff`, `git_commit_branch`, `git_push_branch`, `sync_checkpoint`, `cleanup_preview`), emitindo evidências verificadas (`origin: 'cloud-workspace-mcp'`, `origin: 'cloud-workspace'`).
- **`CORE-04` — Workspaces Temporários, SHA-256 e Recuperação ([workspaceManager.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/core-mcp-drive/src/core/workspaces/workspaceManager.ts)):**
  - Máquina de estados completa (`REMOTO` até `LIBERADO`, além de `CONFLITO`, `HASH_DIVERGENTE`, `ARQUIVO_ABERTO` e `SEM_ESPACO`).
  - Isolamento obrigatório fora de `G:\`, filtragem de arquivos sensíveis (`.env`, `*.kdbx`, `*.key`) no checkout e verificação de manifestos SHA-256.
  - Preservação segura de conflitos concorrentes gerando `<arquivo>.conflict-<agente>-<runId>` sem sobrescrever edições remotas.
  - Snapshots cifrados com **AES-256-GCM** (`createEncryptedSnapshot` / `restoreEncryptedSnapshot`) validados por AuthTag + SHA-256.
  - Gate obrigatório por `canCleanup()` de `src/lib/policy.ts`.
- **`CORE-05` — Adaptador KeePassXC Sob Demanda ([keepassAdapter.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/core-mcp-drive/src/core/security/keepassAdapter.ts)):**
  - Detecta `C:\Program Files\KeePassXC\keepassxc-cli.exe`, mas utiliza `FictitiousVaultProvider` nos testes sem tocar cofres reais do usuário.
  - Lista exclusivamente metadados (`listMetadata()`), exige `ApprovalRecord` explícito, por projeto e não expirado, checa trava/conflito `.kdbx` (`checkVaultSyncLock()`), passa segredo em `Buffer` temporário zerado imediatamente (`fill(0)`) no `finally` e aplica `redactSecrets` / `scrubSecretValue` em auditorias.

### Verificações executadas em `agent/antigravity/core-mcp-drive` (`470fc0b`)
- `npm run build`: **PASSOU** (`777ms`)
- `npm run test` (`vitest run`): **PASSOU** (`2` arquivos / `8/8` testes)
- `npm run test:policy`: **PASSOU** (`3/3`)
- `npm run test:contracts`: **PASSOU** (`5/5`)
- `npm run test:core` (`core01_02` + `core03_04_05` com dados fictícios/temporários): **PASSOU** (`8/8`)
- `cargo check` (`src-tauri/`): **PASSOU** (`15.17s`, `exit 0`)

---

## 3. Nova Prova Artística Obrigatória — 1 Estação Completa R03_02 (`e4a24c1`)

Seguindo a decisão de interromper a expansão de múltiplos andares e alterar a metodologia visual em relação aos SVGs geométricos rejeitados:

- **Nova metodologia ilustrada aplicada (`scripts/art/buildWorkstationProof.mjs`):**
  - Produção de 3 pranchas pixel art 16 bits fiéis à Estação 01 de `R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png` com uso do pipeline de geração de imagens + recorte determinístico RGBA em `sharp` (flood-fill a partir das bordas e despill anti-halo para verde/magenta) e exportação via **Tiled `1.12.2`** e pacote **Pixelorama `.pxo`**.
  - Separação estrita em **12 camadas independentes com transparência alfa real (RGBA)**:
    - Arquitetura dividida no rodapé em duas camadas: `layer_wall_window.png` (janela noturna esquerda, parede ripada de nogueira, estante, painel neon `IA` e viga) e `layer_floor_tiles.png` (piso azul-ardósia quadriculado com reflexos e LEDs frontais).
    - Objetos independentes: `sprite_rug.png`, `sprite_plant.png`, `sprite_chair.png`, `sprite_desk.png` (com gaveteiro 2 gavetas e cabos), `sprite_keyboard.png`, `sprite_accessories.png` (livro e caneca com vapor), `sprite_monitor_back.png` (traseira em perspectiva 3/4 com aletas e brilho ciano voltado para o personagem), `sprite_lamp.png` e `layer_lighting_glow.png`.
    - Personagem em estilo e proporções `R03_02`: `spritesheet_character_r03.png` + `spritesheet_character_r03.json` (`4x3`, **12 quadros distintos** cobrindo **`walk` (4)**, **`sit` (2)**, **`type` (4)** e **`stand` (2)**).
  - Projetos editáveis gerados em `assets/workstation-proof/workstation_r03_proof.tmx` (exportado via `tiled.exe --export-map json` -> `public/art/workstation-proof/workstation_r03_map.json`) e `assets/workstation-proof/workstation_r03_proof.pxo`.
- **Integração ao vivo no PixiJS 8 ([WorkstationProofRenderer.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/scene/WorkstationProofRenderer.ts) + [WorkstationProof.tsx](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/components/WorkstationProof.tsx)):**
  - Acessível via `/?proof=workstation` ou botão `"★ Prova Artística · 1 Estação R03_02"` no cabeçalho de Escritório, preservando a cena principal de 5 andares intacta na rota `/`.
  - Permite alternar os modos `Ciclo Completo (Auto)`, `walk`, `sit`, `type`, `stand` e ligar/desligar individualmente qualquer uma das 12 camadas para comprovar ausência de fundo estático único.

### Verificações e Inspeções Visuais em `agent/antigravity/floor03-pilot` (`e4a24c1`)
- `node scripts/art/buildWorkstationProof.mjs`: **PASSOU** (12 camadas RGBA validadas + Tiled JSON exportado)
- `npm run build`: **PASSOU** (`5.08s`, sem alertas de bundle)
- `npm run test` (`vitest run`): **PASSOU** (`5` arquivos / `24/24` testes, incluindo verificação pixel-a-pixel dos 12 quadros distintos, transparência alfa e mapa Tiled)
- `npm run test:policy`: **PASSOU** (`3/3`)
- `npm run test:contracts`: **PASSOU** (`5/5`)
- `npm run test:e2e` (`playwright test`): **PASSOU (`9/9` em `58.9s`)** — todos os 8 testes existentes de `office.spec.ts` + o novo `workstationProof.spec.ts` capturando em WebGL real os estados `walk`, `sit`, `type`, `stand` e prova com parede/mesa desligadas.
- `cargo check` (`src-tauri/`): **PASSOU** (`7.84s`, `exit 0`)
- Pranchas inspecionadas visualmente: `PROVA_ASSETS_SEPARADOS_TRANSPARENCIA.png`, `PROVA_ESTACAO_PIXI_TYPE.png`, `PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png` e `COMPARACAO_PROVA_ESTACAO_R03_02.png`.

---

## 4. Próximos Passos Aguardando Decisão

1. **Aprovação artística humana da Prova de 1 Estação (`COMPARACAO_PROVA_ESTACAO_R03_02.png`):** Confirmar se este padrão visual (assets ilustrados RGBA em camadas + animações `walk`/`sit`/`type`/`stand`) está aprovado para escalarmos os próximos personagens e estações dos 5 andares.
2. **Próximas etapas técnicas do Núcleo/Tauri:** Integração do comando Tauri/Rust para iniciar o sidecar `cloud-workspace-core` em produção + vinculação real controlada do KeePassXC e Playwright ao painel **Conexões** / **Laboratório** quando autorizado.
