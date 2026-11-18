# Relatório de Etapa — Equipes Isoladas, Ícone Tauri, CORE-01/02 e Piloto Visual do Andar 03

- **Data:** 2026-11-18 (UTC-3)
- **Coordenação:** Antigravity (execução por etapas em worktrees isolados, respeitando Ryzen 5 5600G + 16 GB RAM)
- **Branches preservadas sem alteração:** `main` (`48100ed`), `agent/codex/visual-5-floors` (`e666912`, PR #1 aberto)

---

## 1. Organização das 5 Equipes e Branches Isoladas

| Equipe | Branch / Worktree | Escopo nesta etapa | Commit |
|---|---|---|---|
| **1 & 2. Direção Artística + Frontend PixiJS** | `agent/antigravity/floor03-pilot` (`C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot`) | Piloto modular em camadas do Andar 03 + correção rótulo Andar 04 | `c378d1d` |
| **3. Núcleo, MCP e Drive** | `agent/antigravity/core-mcp-drive` (`C:\Users\PC NOVO\Projetos\worktrees\core-mcp-drive`) | `CORE-01/02`: SQLite WAL, catálogo Drive somente leitura, agregador de evidências | `34b70b1` |
| **4. Testes, Segurança e Desempenho Windows** | Aplicado nas duas branches acima | Ícones Tauri 2 (`icon.ico`), Playwright Windows + `webServer`, `@types/node`, filtro Vitest, validação `cargo check` e E2E | `34b70b1` / `c378d1d` |
| **5. Documentação, GitHub e Backups** | `agent/antigravity/setup` (`C:\Users\PC NOVO\Projetos\cloud-workspace-ia`) | Relatórios contínuos, atualização de checklists e sincronização verificada no Drive | *(este commit)* |

---

## 2. Correções de Build, Ícone Tauri e Testes Windows (Equipe 4)

1. **Ícones Tauri 2 (`src-tauri/icons/`):**
   - Criado `scripts/generate-tauri-icon.mjs` para gerar o emblema pixel art 16 bits original `assets/icon-cw-1024.png` (`1024×1024`, kernel `nearest-neighbor`).
   - Executado `npx tauri icon assets/icon-cw-1024.png`, gerando `icon.ico` (`12.844` bytes), PNGs (`32x32`, `64x64`, `128x128`, `128x128@2x`, `icon.png`), `icon.icns` e logos Store/Appx nas duas branches de trabalho.
   - **`cargo check` em `src-tauri/`:** **PASSOU (`exit code 0`)** tanto em `floor03-pilot` quanto em `core-mcp-drive`.
2. **Playwright no Windows (`floor03-pilot/playwright.config.ts`):**
   - Autodetecção do Chromium local em `%LOCALAPPDATA%\ms-playwright\chromium-*\chrome-win64\chrome.exe` quando `CHROMIUM_PATH` não estiver definido, com fallback `/usr/bin/chromium`.
   - Adicionado bloco `webServer` (`npm run dev -- --port 1420 --strictPort`) para iniciar/reaproveitar o servidor local automaticamente durante `npm run test:e2e`.
3. **Configuração TypeScript + Vitest (`core-mcp-drive`):**
   - Adicionado `@types/node@^26.6.6` ao `package.json`, `types: ["node", "vite/client", "vitest/globals"]` ao `tsconfig.json`, e `test.include: ['tests/**/*.test.ts']` em `vite.config.ts` (`vitest/config`).
   - Adicionados scripts `test:contracts` e `test:core`.

---

## 3. Núcleo `CORE-01/02` — SQLite, Catálogo Drive e Evidências (Equipe 3 · `34b70b1`)

Contratos preservados intocados: `src/core-contracts/agentState.ts`, `tests/agentState.node.test.mjs` e `src/lib/policy.ts`.

- **`src/core/storage/sqliteStore.ts`:**
  - Utiliza `node:sqlite` (`DatabaseSync`) nativo do Node `v26.7.0` com `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL` e `PRAGMA foreign_keys = ON`.
  - Schema completo para `projects`, `project_files_manifest`, `workspaces`, `agents`, `agent_events`, `tasks`, `approvals`, `sync_jobs`, `backup_records` e `audit_events`.
  - Função `redactSecrets()` mascarando tokens (`gho_`, `ghp_`, `github_pat_`, `AIza`, `sk-`, `Bearer`, `TOKEN=`, `PASSWORD=`, `KDBX_KEY=`) antes da persistência de logs e auditorias.
- **`src/core/catalog/driveCatalog.ts`:**
  - Scanner **estritamente somente leitura** para `G:\Meu Drive\Projetos Code\01 - Projetos`.
  - Identifica subpastas, marcadores de stack (`package.json`, `Cargo.toml`, `tsconfig.json`, `pyproject.toml`, etc.) e arquivos sensíveis (`.env`, `*.kdbx`, `*.key`, `*.pem`) **apenas por nome/categoria (`secret-name-only`)**, sem ler conteúdo nem acionar downloads completos no streaming do Drive.
- **`src/core/evidence/evidenceAggregator.ts`:**
  - Consome `agent_events`, `tasks` e estados de serviço do `SqliteStore` e delega toda decisão visual a `agentVisualState`, `chiefVisible` e `connectionLabel` sem fabricar trabalho a partir de processos abertos.

### Testes verificados em `agent/antigravity/core-mcp-drive`
- `npm run build` (`tsc --noEmit && vite build`): **PASSOU** (`1.08s`)
- `npm run test` (`vitest run`): **PASSOU** (`2` arquivos / `7/7` testes)
- `npm run test:policy`: **PASSOU** (`3/3`)
- `npm run test:contracts`: **PASSOU** (`5/5`)
- `npm run test:core`: **PASSOU** (`4/4`, incluindo leitura real não destrutiva de `G:\Meu Drive\Projetos Code\01 - Projetos`, descobrindo `cloud-workspace-ia`, `Arquivos Navegaveis` e `Direcao Artistica - R03 - 2026-11-16`)
- `cargo check` (`src-tauri/`): **PASSOU** (`exit 0`)

---

## 4. Piloto Visual Funcional do Andar 03 (`03 — Funcionários IA`) (Equipes 1 & 2 · `c378d1d`)

- **Natureza do piloto:** Prova modular com **camadas e sprites independentes e editáveis** sobre o motor PixiJS 8 herdado do PR #1 (zero uso da imagem R03 como fundo único; os outros andares não foram expandidos antes da aprovação do piloto).
- **Direção e correções solicitadas aplicadas:**
  - Texto do Andar 04 corrigido para **`INFRAESTRUTURA / MCP / TESTES`** em `src/data/floors.ts`, `src/scene/interiors.ts` e `src/scene/OfficeRenderer.ts`.
  - Identificação preservada para os quatro agentes **ChatGPT**, **Codex**, **Antigravity** e **Claude Code** com emblemas individuais (`f3-badge-*`) e rótulos legíveis acima da borda do piso.
  - Mapa editável Tiled `assets/floor03-pilot/floor03_layout.tmx` exportado via `tiled.exe --export-map json` para `public/art/floor03_layout.json`.
  - Módulo `scripts/art/floor03Pilot.mjs` adicionando **14 sprites modulares** (`f3-bookshelf`, `f3-neon-sign`, `f3-holo-map`, `f3-holo-chart`, `f3-holo-chip`, `f3-rug`, `f3-chair`, `f3-desk`, `f3-monitor-back`, `f3-bot-ia` e 4 `f3-badge-*`), mantendo o atlas `public/art/office.png` em `1024×1072` (`4,19 MB` RGBA < limite de `5,00 MB`).
  - **Monitores com verso para o observador:** `f3-monitor-back` exibe o chassi traseiro para a câmera e a borda luminosa da tela voltada para o personagem sentado, em camada de oclusão (`y - 1.5`) que cobre as mãos digitando sem tapar personagens em pé no corredor frontal.

### Testes e capturas reais verificados em `agent/antigravity/floor03-pilot`
- `npm run art:build`: **PASSOU** (`229` sprites em `1024×1072`, `4,19 MB` RGBA)
- `npm run build`: **PASSOU** (`5.43s`)
- `npm run test` (`vitest run`): **PASSOU** (`5` arquivos / `23/23` testes)
- `npm run test:policy`: **PASSOU** (`3/3`)
- `npm run test:contracts`: **PASSOU** (`5/5`)
- `npm run test:e2e` (`playwright test`): **PASSOU** (`8/8` testes em `51.8s` — `1280×800`, `1440×900`, zoom por andar, estados DEMO independentes, pausa, movimento reduzido, fallback WebGL e ancoragem de pés)
- `cargo check` (`src-tauri/`): **PASSOU** (`exit 0`)

---

## 5. Pendências e Próximos Passos Aguardando Decisão

1. **Aprovação humana do Piloto Visual do Andar 03** (comparando as capturas reais anexas `PILOTO_ANDAR03_ZOOM_1440x900.png`, `PILOTO_PREDIO_OVERVIEW_1440x900.png` e `PILOTO_DEMO_WORKING_1440x900.png`) antes de expandir a arte modular para os andares `01`, `02`, `04` e `05`.
2. **Aprovação para integração (merge controlado)** das branches `agent/antigravity/core-mcp-drive` e `agent/antigravity/floor03-pilot`, quando avaliado.
3. **Avanço do Núcleo (`CORE-03/04/05`):** Gateway MCP local autenticado (`stdio` / HTTP `127.0.0.1`), workspaces temporários com checkpoints SHA-256 fora do Drive e integração KeePassXC sob demanda.
