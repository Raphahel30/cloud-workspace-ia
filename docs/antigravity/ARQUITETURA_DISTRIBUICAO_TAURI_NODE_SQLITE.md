# Arquitetura de Integração e Distribuição Windows — Tauri 2 + Node/SQLite (`CORE`)

**Branch:** `agent/antigravity/core-mcp-drive`  
**Objetivo:** Garantir que o usuário final no Windows execute o **Cloud Workspace IA** a partir de um único instalador (`NSIS`/`MSI`) gerado pelo Tauri 2 **sem precisar instalar Node.js, npm, C++ Build Tools ou SQLite manualmente**.

---

## 1. Decisão Arquitetural Validada

1. **Banco SQLite nativo no runtime (`node:sqlite`):**
   - O projeto já roda sobre **Node.js `v26.7.0`** que possui `node:sqlite` (`DatabaseSync`) embutido diretamente no binário do Node, com suporte nativo a modo **`WAL`** e **`PRAGMA foreign_keys = ON`**.
   - **Vantagem crítica no Windows:** Elimina dependências nativas C++ (`better-sqlite3`, `node-gyp`), problemas de ABI entre versões e necessidade de DLL externa `sqlite3.dll`.

2. **Empacotamento como Sidecar Tauri 2 (`bundle.externalBin`) via Node 26 SEA (`node --build-sea`):**
   - Validado neste ambiente que o Node `v26.7.0` suporta nativamente `--build-sea`.
   - No pipeline de build de distribuição Windows, o bundle do núcleo (`cloud-workspace-core.cjs`) é compilado junto ao binário `node.exe` em um único executável autossuficiente:
     - `src-tauri/binaries/cloud-workspace-core-x86_64-pc-windows-msvc.exe`
   - No `tauri.conf.json` (etapa de release futuro), declara-se `bundle.externalBin: ["binaries/cloud-workspace-core"]` com permissão de execução via `tauri-plugin-shell` (escopada apenas para esse sidecar).
   - **Fallback / Desenvolvimento:** Caso o empacotamento SEA seja desativado em debug, o Tauri pode distribuir o runtime portátil embarcado em `resources/node/node.exe` + `resources/core/cloud-workspace-core.cjs` como processo filho privado do aplicativo.

3. **Ciclo de Vida Supervisionado pelo Host Tauri (Rust) e IPC:**
   - Ao abrir o aplicativo desktop, o backend Rust do Tauri (`src-tauri`) inicia o sidecar `cloud-workspace-core` com `--healthcheck` e passa por variável/canal seguro o diretório de dados locais do usuário em `%LOCALAPPDATA%\CloudWorkspaceIA\`.
   - **Proibição estrutural contra `G:\`:** `resolveSidecarConfig()` em [tauriSidecarRuntime.ts](file:///C:/Users/PC%20NOVO/Projetos/worktrees/core-mcp-drive/src/core/runtime/tauriSidecarRuntime.ts) valida em tempo de execução que **nenhum** arquivo SQLite (`workspace.sqlite`), workspace temporário ou snapshot cifrado possa residir em `G:\` ou em pastas sincronizadas pelo Google Drive (`DriveFS` / `Meu Drive`), evitando corrupção do WAL SQLite.
   - **Canais de comunicação local:**
     - **Frontend Tauri <-> Sidecar:** Comandos Tauri / loopback autenticado exclusivamente em `127.0.0.1` com validação estrita do cabeçalho `Origin` (`http://127.0.0.1:1420`, `http://localhost:1420`, `tauri://localhost`, `https://tauri.localhost`) + token Bearer de sessão curta.
     - **Agentes autorizados (Codex, Antigravity, Claude Code) <-> Gateway MCP:** Transporte `stdio` (processo filho autenticado) ou HTTP `127.0.0.1` com token efêmero e escopo restrito por projeto.

---

## 2. Contrato de Inicialização e Verificação

- **Banco local:** `%LOCALAPPDATA%\CloudWorkspaceIA\data\workspace.sqlite` (`journal_mode = WAL`, `foreign_keys = ON`, 10 tabelas obrigatórias).
- **Workspaces temporários:** `%LOCALAPPDATA%\CloudWorkspaceIA\Workspaces\<projectId>\<runId>`.
- **Snapshots cifrados:** `%LOCALAPPDATA%\CloudWorkspaceIA\Snapshots\`.
- **Auditoria & Redação:** Todo log e evento persistido passa por `redactSecrets()`, garantindo que tokens, senhas e chaves mestras nunca sejam gravados no SQLite nem enviados à UI.
