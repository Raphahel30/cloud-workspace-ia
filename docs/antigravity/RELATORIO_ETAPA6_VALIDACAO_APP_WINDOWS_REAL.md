# Relatório Etapa 6 — Validação do Aplicativo Windows Real (`Cloud Workspace IA`)

**Data:** 2026-11-19 (UTC-3)  
**Branch funcional:** `agent/antigravity/windows-functional` (base `efccb91` → commit `97265ea`)  
**Worktree de validação:** `C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot`  
**Repositório/documentação:** `agent/antigravity/setup` em `C:\Users\PC NOVO\Projetos\cloud-workspace-ia`  
**Preservação verificada:** `main`, PR #1, `agent/antigravity/core-mcp-drive` (`470fc0b`), `agent/antigravity/floor03-pilot` (`43243f5`), pixel art (Etapa 8) e os 4 arquivos de contratos protegidos (`src/core-contracts/agentState.ts`, `tests/agentState.node.test.mjs`, `src/lib/policy.ts`, `tests/policy.test.ts`) permaneceram sem alterações.

---

## 1. Resumo Executivo e Limite Transparente de Desktop Windows

- O aplicativo desktop real **Tauri 2 + Edge WebView2 + sidecar Node 26 SEA (`node:sqlite`)** foi compilado, iniciado, exercitado de ponta a ponta e validado também como **pacote portátil nativo isolado** em [`dist-win-test\CloudWorkspaceIA-Portable\`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/dist-win-test/CloudWorkspaceIA-Portable/manifesto-build-nativo.json) (sem executar instalador global).
- **Observação honesta sobre exibição no monitor físico:** os comandos automatizados desta sessão executam em desktops Win32 isolados (`WinSta0\exebox-*`) dentro da Sessão 1. Por política de segurança (sem burlar fronteiras de sandbox), a janela Win32 real renderizou e passou em todos os testes dentro do desktop isolado, mas **não pode ser projetada diretamente no desktop interativo `WinSta0\Default` por um processo do agente**.
- **Como abrir imediatamente no seu desktop Windows:**
  - **Modo portátil standalone (sem precisar de Vite/Node em execução):** abrir [`cloud-workspace-ia.exe`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/dist-win-test/CloudWorkspaceIA-Portable/cloud-workspace-ia.exe) (`C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot\dist-win-test\CloudWorkspaceIA-Portable\cloud-workspace-ia.exe`).
  - **Modo desenvolvimento (`desktop:dev`):** executar `npm run desktop:dev` dentro de `C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot`.

---

## 2. Problemas Reais Encontrados e Corrigidos Durante a Validação

1. **Bloqueio `EBUSY` do Vite no `npm run desktop:dev` ([`vite.config.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/vite.config.ts)):**  
   O watcher do Vite tentava observar `src-tauri/target/debug/build/.../*.exe` enquanto o Cargo compilava. Corrigido com `server.watch.ignored` para `src-tauri/target/**`, `src-tauri/binaries/**`, `dist-core/**`, `dist-win-test/**`, `test-results/**` e `playwright-report/**`.
2. **Preflight CORS do WebView2/Tauri ([`tauriSidecarRuntime.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/core/runtime/tauriSidecarRuntime.ts), [`coreSidecarServer.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/core/runtime/coreSidecarServer.ts), [`localMcpGateway.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/core/mcp/localMcpGateway.ts)):**  
   Adicionada origem `http://tauri.localhost`, cabeçalhos `Access-Control-Allow-Origin` para origens permitidas e resposta `204 No Content` a requisições `OPTIONS` preflight; origens externas (ex.: `https://evil.example`) seguem bloqueadas com `403`.
3. **Dreno de pipe `stdout`, detecção de reinício e proteção do token no `CommandLine` ([`src-tauri/src/lib.rs`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src-tauri/src/lib.rs), [`sidecarCli.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/core/runtime/sidecarCli.ts)):**  
   - `stderr` redirecionado a `Stdio::null()` e leitura contínua do `stdout` em thread dedicada após o handshake `ready_line`, evitando `EPIPE`.
   - `restart_count` incorporado em `SidecarSupervisor`, `SidecarStatusDto` e `SidecarBootstrapDto`.
   - **Hardening descoberto na inspeção `Win32_Process`:** o token de sessão (`cw_tauri_...`) aparecia em `CommandLine` via `--ui-token`. Passado agora via variável de ambiente `CW_UI_TOKEN` (`cmd.args(["--port", "0"]).env("CW_UI_TOKEN", &ui_token)`), mantendo `parseArg('--ui-token') ?? process.env.CW_UI_TOKEN` no sidecar. Confirmado na execução portátil que `CommandLine` exibe apenas `"...\cloud-workspace-core.exe" --port 0`.
4. **Build release standalone apontava para `127.0.0.1:1420` ([`src-tauri/Cargo.toml`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src-tauri/Cargo.toml)):**  
   O primeiro teste portátil detectou que `cargo build --release` sem `custom-protocol` gerava um executável de `8,45 MB` tentando conectar em `http://127.0.0.1:1420` (deixando `SQLite` sem `projects`/`agents` quando o Vite estava parado). Adicionada a seção `[features] default = ["custom-protocol"]` / `custom-protocol = ["tauri/custom-protocol"]` (`desktop:dev` usa `--no-default-features` e preserva o Vite, enquanto `cargo build --release` gera `23,75 MB` embutindo `dist/` em `http://tauri.localhost`).
5. **Auto-recuperação após queda do sidecar e retry transparente ([`coreApiClient.ts`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/lib/coreApiClient.ts), [`App.tsx`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/src/App.tsx)):**  
   `coreRequest` reexecuta `ensureCoreSession(true)` em falha de rede ou HTTP `401`, e `App.tsx` reconcilia via `getOverview()` + `bootstrap()` em `visibilitychange`, `focus` e intervalo de `4 s` apenas com a janela visível (sem gasto ocioso minimizado).

---

## 3. Evidências Medidas em Execução Real

### 3.1 `npm run desktop:dev` (`task-1215` — árvore real + 7 telas + `G:\` + `sandbox-demo-ia`)
- **Processos medidos:** `cloud-workspace-ia.exe` (`PID 27932`, `46,8 MB`), filho `cloud-workspace-core.exe` (`PID 21052`, `63,65–65,61 MB`, portas loopback exclusivas `127.0.0.1:61319` `/mcp` e `127.0.0.1:61320` Core HTTP, Node `26.7.0`, SQLite `WAL` ativo com `10` tabelas criadas + `sqlite_sequence`), `conhost.exe` (`PID 944`, `7,84 MB`), e árvore `msedgewebview2.exe` (`PID 15772` + 5 filhos `4212`, `7004`, `20988`, `26224`, `31264`). **Total medido da árvore:** `577,67–580,68 MB` de RAM (`AMD Ryzen 5 5600G`, `12` threads, `15,3 GB` RAM total, `87,68 GB` livres no SSD de `475,34 GB`).
- **Banco SQLite ao vivo (`%LOCALAPPDATA%\CloudWorkspaceIA\data\workspace.sqlite`):** inicializou automaticamente com `agents = 4` (todos inicialmente em `unknown`), `projects = 1`, `audit_events = 4`.
- **Segurança & CORS ao vivo:** `OPTIONS http://127.0.0.1:1420 => 204`, `OPTIONS http://tauri.localhost => 204`, `OPTIONS https://evil.example => 403`, `GET` sem `X-CW-UI-Token => 401`.
- **Tela `Projetos` (`G:\Meu Drive\Projetos Code` em modo somente leitura):** `driveConnected = true`, `driveFreeGb = 83,3 GB`, detectado `cloud-workspace-ia` e pasta acompanhante `00 - Documentacao Cloud Workspace IA` sem qualquer escrita na unidade `G:\`.
- **Tela `Agentes IA` (MCP sem credenciais reais):** validação `POST /api/core/agents/validate` aprovou `4/4` etapas (`initialize`, `tools/list`, `projects_list` restrito, bloqueio fora de escopo) para `antigravity` e `codex` (passando para `idle`), enquanto `claude` e `chatgpt` permaneceram honestamente em `unknown` (`DESCONHECIDO`).
- **Tela `Workspaces` (somente projeto fictício `sandbox-demo-ia` fora de `G:\`):**
  - `prepare_sandbox` -> workspace isolado em `%LOCALAPPDATA%\CloudWorkspaceIA\Workspaces\sandbox-demo-ia\...`
  - `patch_file` (`SHA-256: 47ddbe782990`), `git_commit_branch`, `create_backup` AES-256-GCM (`SHA-256: 97cd4e4e3ccf`), `restore_backup` (`2` arquivos com SHA-256 validado), `simulate_conflict` (conflito em `src/index.ts` preservado sem sobrescrever destino), `simulate_interruption` (`1` tarefa + `2` workspaces reconciliados).
  - Workspace limpo B: `sync_checkpoint` (`1` arquivo conferido) -> `cleanup_preview` (`28,3 KB`, `blockedWithoutApproval: true`) -> `cleanup_execute` removido após aprovação.
- **Telas `Integrações`, `Testes e logs` e `Segurança`:** ferramentas reais (`Google Drive`, `Git`, `gh`, `MCP Gateway`, `KeePassXC CLI`, `Playwright Chromium 1248`, `Tauri Sidecar`) exibidas com fidelidade; `Desktop Commander` e `Hostinger` marcados como `DESCONHECIDO` (`unknown`). Teste `keepass-test` negado sem aprovação e liberado com aprovação efêmera sem vazar segredo (`zeroizedAfterUse: true`); execução `node-policy` via API saiu com `exitCode: 0`.

### 3.2 Pacote Portátil Nativo Isolado (`dist-win-test\CloudWorkspaceIA-Portable\`)
Gerado em pasta isolada de teste (ignorada pelo `.gitignore`, sem executar instalador global), com hashes registrados em [`manifesto-build-nativo.json`](file:///C:/Users/PC%20NOVO/Projetos/worktrees/floor03-pilot/dist-win-test/CloudWorkspaceIA-Portable/manifesto-build-nativo.json):

| Arquivo | Tamanho | SHA-256 |
|---|---|---|
| `cloud-workspace-ia.exe` | `24.903.168` bytes (`23,75 MB`) | `1c02e851343002230757ce2e15e971f0de38031e9fb5d763e35f1aeffbcee1b6` |
| `cloud-workspace-core.exe` | `103.462.728` bytes (`98,67 MB`) | `4b182550f25729bd201bf28d86eda7fd3eb89c7fa549b72160abe8ef64c91f64` |
| `cloud-workspace-core-x86_64-pc-windows-msvc.exe` | `103.462.728` bytes (`98,67 MB`) | `4b182550f25729bd201bf28d86eda7fd3eb89c7fa549b72160abe8ef64c91f64` |

- **Smoke test real com `Vite` parado (`127.0.0.1:1420` livre):**
  - Janela Win32 encontrada no mesmo desktop (`exebox-UG626YI4S32UUR5ZFL7YCM2HI7`): `PID 16024`, `HWND 0x7BF0BAA`, título `'Cloud Workspace IA — Central Operacional Windows'`.
  - Sidecar co-localizado iniciado automaticamente: `PID 9160` em `CloudWorkspaceIA-Portable\cloud-workspace-core.exe`, portas `50917` e `50918`, `CommandLine` = `"...\cloud-workspace-core.exe" --port 0` (sem token).
  - `CORS OPTIONS http://tauri.localhost => HTTP 204`, `Access-Control-Allow-Origin: http://tauri.localhost`.
  - **Minimizar / Restaurar Win32 + Recuperação de Queda:** `9` processos ativos (`499,33 MB` RAM, `2,344 s` CPU) → `SW_MINIMIZE(6)` (`IsIconic=True`, `541,47 MB`, `3,079 s`) → sidecar `PID 9160` encerrado à força → `SW_RESTORE(9)` (`IsIconic=False`) → **novo sidecar `PID 27384` respawnado automaticamente via IPC Tauri em `0,6 s`**.
  - **SQLite inicializado pelo frontend embutido (`http://tauri.localhost`):** `projects = 1` (`cloud-workspace-ia`), `agents = 4` em estado inicial `unknown`, auditoria automática `inspect_drive_readonly`, `startup_recovery`, `sidecar_started`.
  - **Encerramento limpo via `WM_CLOSE`:** `WaitForExit(7s) = True`, `0` processos `cloud-workspace-*` remanescentes.

---

## 4. Bateria Automatizada Pós-Edição Final (Todos Verificados Após o Último Código)

- `npm run sidecar:build` → **PASS** (`98,67 MB`, Node `26.7.0`, `10` tabelas SQLite, `--healthcheck` OK)
- `npm run build` (`tsc --noEmit && vite build`) → **PASS** (`797` módulos, `4,60 s`)
- `npm run test` (Vitest) → **26/26 PASS** (`6` arquivos)
- `npm run test:policy` → **3/3 PASS**
- `npm run test:contracts` → **5/5 PASS**
- `npm run test:core` → **9/9 PASS** (inclui spawn/recuperação do `.exe` Windows e varredura `G:\` somente leitura)
- `npm run test:e2e` (Playwright) → **10/10 PASS** (`1,4 m`)
- `cargo build --release` → **PASS** (`58,73 s`)

---

## 5. O Que Falta Para Distribuição Completa e Entrada Progressiva dos Agentes Reais

1. **Instalador Windows / Assinatura (mediante autorização futura):** habilitar empacotamento NSIS/MSI em `tauri.conf.json` (`bundle.active: true`), definir ícones dedicados de produção (`src-tauri/icons/`), política de atualização no diretório do usuário e eventual assinatura digital (`Authenticode`) para evitar alertas do SmartScreen.
2. **Entrada progressiva dos agentes reais:** configurar gradualmente clientes/bridges reais para `Claude Code` e `ChatGPT / Desktop Commander`, além de heartbeats reais de tarefas por projeto mantendo o contrato estrito (jamais marcar `working` sem job verificado e recente).
3. **Cofre real KeePassXC e ações externas:** integrar a abertura autenticada do `.kdbx` real, pushes/PRs e `Hostinger` apenas mediante aprovações explícitas por projeto/escopo.
4. **Etapa 8 (Pixel Art congelada) e merges:** refinar os detalhes pendentes da pixel art após o ciclo com uso real e decidir sobre merge da PR #1 e das branches `agent/antigravity/*`.
