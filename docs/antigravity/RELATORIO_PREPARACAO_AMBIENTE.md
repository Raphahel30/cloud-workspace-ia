# Relatório de Preparação do Ambiente Windows — Cloud Workspace IA

- **Data:** 2026-11-18 (UTC-3)
- **Responsável pela preparação:** Antigravity (diagnóstico com Gemini 4 Hydrogen High)
- **Branch de preparação:** `agent/antigravity/setup` (criada a partir de `origin/main` `48100ed0656614aab9ce981454b5b34b51c2de4e`)
- **PR #1 (`agent/codex/visual-5-floors`):** Preservado integralmente, sem merge, sem sobrescrita

---

## 1. Inventário Real do Computador

| Item | Especificação Alvo | Verificado no Sistema |
|---|---|---|
| Sistema Operacional | Windows | Microsoft Windows 11 Pro `10.0.26200` (Build `26200`, 64 bits) |
| Processador | AMD Ryzen 5 5600G | `AMD Ryzen 5 5600G with Radeon Graphics` (6 núcleos / 12 threads) |
| GPU Integrada | Radeon integrada | `AMD Radeon(TM) Graphics` — Driver `31.0.21924.61` (`536870912` bytes / 512 MB reportados) |
| Memória RAM | 16 GB RAM | `15,30 GB` utilizáveis |
| Armazenamento | SSD NVMe 512 GB | `XrayDisk 512GB SSD` — Unidade `C:` NTFS `475,34 GB` totais / `59,09 GB` livres após preparações |

---

## 2. Estado do Google Drive (Prioridade 1)

- **Instalador utilizado:** `Google.GoogleDrive` versão `133.0.2.0` via `winget` (`https://dl.google.com/release2/drive-file-stream/.../setup.exe`, hash verificado).
- **Executável:** `C:\Program Files\Google\Drive File Stream\133.0.2.0\GoogleDriveFS.exe`.
- **Autenticação e montagem:** Autenticado pelo usuário via navegador; unidade virtual montada em **`G:\`** (Label: `Google Drive`, FS reportado `FAT32`).
- **Modo de sincronização:** **Streaming de arquivos** confirmado (`AppData\Local\Google\DriveFS` ocupa apenas `142,71 MB` em 370 arquivos e o espaço livre em `C:\` permaneceu ~59 GB).
  - *Observação técnica:* `root_preference_sqlite.db` e `mirror_sqlite.db` indicam que as pastas locais `Documents`, `Desktop` e `Downloads` possuem backup/espelhamento ativo do computador para `G:\Outros computadores`, enquanto `G:\Meu Drive` opera em streaming.
- **Caminhos válidos verificados:**
  - `G:\Meu Drive\Projetos Code`
  - `G:\Meu Drive\Projetos Code\00 - Documentacao Cloud Workspace IA` (Plano Mestre v2.0, histórico, instruções de retomada, `03_STATUS_E_REGISTRO_DE_ETAPAS.txt`, versões arquivadas e ZIP de continuidade)
  - `G:\Meu Drive\Projetos Code\01 - Projetos\cloud-workspace-ia`
    - `Arquivos Navegaveis`
    - `Pacotes` (`FASE_1A`, `FASE_1B`, `FASE1C`, `Fase1D`)
    - `Previa Visual para Aprovacao` (inclui `REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png`)
    - `Entrega Codex Cloud` (`Cloud_Workspace_IA_PARA_CODEX_CLOUD_2026-11-16.zip`, prompts, guia e registro)
    - `Direcao Artistica - R03 - 2026-11-16` (contém `R03_01_PREDIO_INTEIRO_PROPOSTA_NAO_APROVADA.png`, `R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png`, `R03_03_COMPARACAO_ARTISTICA.{png,pdf}`, registros R03, `R03_MATERIAIS_APROVACAO_2026-11-16.zip` e `R03_RECIBOS_DRIVE.json`)
- **Teste de leitura e gravação:** Leitura confirmada em `03_STATUS_E_REGISTRO_DE_ETAPAS.txt` (`19707` bytes) e `R03_01_PREDIO_INTEIRO_PROPOSTA_NAO_APROVADA.png` (`2817164` bytes). Gravação e leitura de retorno validadas na subpasta temporária `G:\Meu Drive\Projetos Code\01 - Projetos\cloud-workspace-ia\_teste_conexao_temp\teste_escrita_antigravity.txt`, removida em seguida sem alterar nenhum arquivo original.

---

## 3. Ferramentas Encontradas e Instaladas

### 3.1 Ferramentas já encontradas no computador

| Ferramenta | Versão verificada | Local / Caminho executável |
|---|---|---|
| Winget | `v1.29.380` | `C:\Users\PC NOVO\AppData\Local\Microsoft\WindowsApps\winget.exe` |
| Git for Windows | `2.55.0.windows.3` | `C:\Program Files\Git\cmd\git.exe` |
| GitHub CLI (`gh`) | `2.98.0` (autenticado como `Raphahel30`) | `C:\Program Files\GitHub CLI\gh.exe` |
| Node.js / npm | `v26.7.0` / `11.19.0` | `C:\Program Files\nodejs\node.exe` · `C:\Program Files\nodejs\npm.ps1` |
| Rustup / Rustc / Cargo | `rustup 1.29.1` · `rustc 1.98.1` · `cargo 1.98.1` (`stable-x86_64-pc-windows-msvc` padrão) | `C:\Users\PC NOVO\.cargo\bin\{rustup,rustc,cargo}.exe` |
| Microsoft C++ Build Tools | VS 2022 BuildTools · MSVC `14.44.35207` | `C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\cl.exe` |
| Windows SDK | `10.0.26100.0` | `C:\Program Files (x86)\Windows Kits\10\Include\10.0.26100.0` |
| Microsoft WebView2 Runtime | `157.0.4341.46` / `157.0.4341.60` (detectado pelo Tauri) | `C:\Program Files (x86)\Microsoft\EdgeWebView\Application` |
| Python / uv | Python `3.12.10` · `uv` | `C:\Users\PC NOVO\AppData\Local\Programs\Python\Python312\python.exe` · `C:\Users\PC NOVO\AppData\Local\hermes\bin\uv.exe` |
| Playwright Chromium (cache) | `chromium-1243`, `chromium-1248`, `chromium_headless_shell-*`, `ffmpeg-*` | `C:\Users\PC NOVO\AppData\Local\ms-playwright` |

### 3.2 Ferramentas instaladas nesta preparação (fontes oficiais via `winget`)

| Ferramenta | Versão verificada | Local de instalação | Executáveis verificados |
|---|---|---|---|
| Google Drive | `133.0.2.0` (`Google.GoogleDrive`) | `C:\Program Files\Google\Drive File Stream\133.0.2.0` | `GoogleDriveFS.exe` |
| Pixelorama | `1.2.3` (`OramaInteractive.Pixelorama`) | `C:\Users\PC NOVO\AppData\Roaming\Orama Interactive\Pixelorama` | `pixelorama.exe` |
| Krita | `5.3.4.1` (`KDE.Krita`) | `C:\Program Files\Krita (x64)` | `bin\krita.exe`, `bin\kritarunner.exe`, `bin\ffmpeg.exe` |
| Tiled Map Editor | `1.12.2` (`Tiled.Tiled`) | `C:\Program Files\Tiled` | `tiled.exe`, `tmxrasterizer.exe`, `terraingenerator.exe`, `tmxviewer.exe` |
| KeePassXC | `2.8.0` (`KeePassXCTeam.KeePassXC`) | `C:\Program Files\KeePassXC` | `KeePassXC.exe`, `keepassxc-cli.exe`, `keepassxc-proxy.exe` |

> **Nota de segurança:** Nenhuma credencial ou banco `.kdbx` foi importado, aberto ou acessado nesta etapa.

---

## 4. Repositório GitHub e Estado das Branches

- **Repositório:** `Raphahel30/cloud-workspace-ia` (privado)
- **Clone local oficial:** `C:\Users\PC NOVO\Projetos\cloud-workspace-ia` (fora do `scratch` e fora da unidade `G:\` do Drive)
- **Branches existentes preservadas:**
  - `main` (`48100ed`) — base Fase 1D
  - `agent/codex/visual-5-floors` (`e666912`, PR `#1` aberto) — protótipo visual rejeitado em aparência + propostas artísticas R03 aguardando aprovação humana
- **Nova branch criada:** `agent/antigravity/setup` (a partir de `origin/main`)
- **Separação de estados confirmada:**
  1. `REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png`: referência conceitual **aprovada**.
  2. Implementação visual do protótipo no PR `#1`: **rejeitada** em aparência; mantida apenas como referência técnica sem merge.
  3. Duas propostas artísticas R03 (`R03_01_PREDIO_INTEIRO_PROPOSTA_NAO_APROVADA.png` e `R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png`): **aguardando aprovação humana**.

---

## 5. Testes de Compatibilidade (Node.js `v26.7.0`)

### 5.1 Na branch `agent/antigravity/setup` (`origin/main` `48100ed`)
- `npm install`: **PASSOU** (106 pacotes instalados em `C:\Users\PC NOVO\Projetos\cloud-workspace-ia\node_modules`).
- `npm run build` (`tsc --noEmit && vite build`): **FALHOU** no código base da `main` em `vite.config.ts(8,20): error TS2591: Cannot find name 'process'` (ausência de `@types/node` no `package.json` da `main`; já corrigido na branch do PR `#1`).
- `npm run test` (`vitest run`): **PARCIAL** — `tests/policy.test.ts` **6/6 passaram**; `tests/agentState.node.test.mjs` e `tests/scenePolicy.node.test.mjs` falharam no Vitest por usarem `node:test` sem filtro no `vite.config.ts`.
- `npm run test:policy`: **PASSOU** (3/3).
- `node --experimental-strip-types --test tests/agentState.node.test.mjs`: **PASSOU** (5/5).

### 5.2 Validação isolada da stack completa em worktree temporário de `origin/agent/codex/visual-5-floors` (`e666912`)
*(Executado em worktree destacado e removido ao fim da verificação, sem alterar PR `#1`.)*
- `npm install`: **PASSOU** (128 pacotes: React `19`, TypeScript `5.8`, Vite `6.4.6`, PixiJS `8.23.0`, `@tauri-apps/api` / `@tauri-apps/cli` `2.12.5`, `@playwright/test` `1.65.1`, `sharp` `0.35.5`, Vitest `3.2.7`).
- `npm run build` (`tsc --noEmit && vite build`): **PASSOU** (791 módulos em `9.73s`).
- `npm run test` (Vitest): **PASSOU** (5 arquivos, 22/22 testes).
- `npm run test:policy`: **PASSOU** (3/3).
- `npm run test:contracts`: **PASSOU** (5/5).
- `npm run test:e2e` (Playwright): **FALHOU por padrão** ao buscar `/usr/bin/chromium` (caminho Linux em `playwright.config.ts`) e sem `webServer` automático; ao definir `CHROMIUM_PATH=C:\Users\PC NOVO\AppData\Local\ms-playwright\chromium-1248\chrome-win64\chrome.exe` com `vite --port 1420` ativo, **PASSOU 8/8 testes E2E em `50.0s` (`E2E_EXIT: 0`)**.
- `npx tauri info`: detectou `Windows 10.0.26200 x86_64`, `WebView2 157.0.4341.60`, `MSVC Ferramentas de Build do Visual Studio 2022`, `rustc 1.98.1`, `cargo 1.98.1`, `rustup 1.29.1`, `stable-x86_64-pc-windows-msvc`, `node 26.7.0`, `npm 11.19.0`.
- `cargo check` em `src-tauri`: baixou e compilou todas as dependências Rust/Tauri 2 (`tauri 2.12.7`, `wry 0.57.3`, `tao 0.37.2`, `webview2-com 0.39.1`), interrompendo somente na etapa final de `tauri-build` por ausência de `src-tauri/icons/icon.ico`.

**Conclusão sobre Node.js:** O `Node.js v26.7.0` já instalado mostrou compatibilidade total com `PixiJS 8`, `React 19`, `TypeScript 5.8`, `Vite 6`, `Vitest 3`, `Playwright 1.65` e `sharp 0.35.5` (inclusive alinhado com `@types/node: ^26.6.6` na branch visual). Não foi necessário instalar Node 24.

---

## 6. Avaliação da Automação Artística (Prioridade 4)

| Ferramenta / Camada | Capacidade Automática Verificada | Limitação / Observação Real |
|---|---|---|
| **Pixelorama `1.2.3`** | CLI headless validado (`pixelorama.exe --headless --quit -- --version` retornou `v1.2.3-stable`; `--help` expõe `--export`, `--spritesheet`, `--output`, `--scale`, `--frames`, `--direction`, `--json`, `--split-layers`). | Exige projeto fonte `.pxo` (não aceita `.png` direto como entrada para `--spritesheet`). Adequado para editar/exportar sprites criados em `.pxo`. |
| **Scripts Python / Node + `sharp`** | Geração programática de PNGs pixel art RGBA8888 + leitura de metadados via `sharp` + geração de atlas JSON no padrão PixiJS 8 **100% funcional**. | Canal principal recomendado para montagem/empacotamento determinístico de spritesheets e validação de dimensões. |
| **Tiled `1.12.2`** | `tiled.exe --export-map json <tmx> <json>` gerou mapa isométrico JSON (`test_iso_map.json`, 912 bytes); `tmxrasterizer.exe --no-smoothing <tmx> <png>` rasterizou sem suavização (`test_iso_raster.png`, 684 bytes). | `tiled.exe --export-formats` não imprime no console stdout no Windows (subsystem GUI), mas `--export-map` funciona normalmente em linha de comando. |
| **Krita `5.3.4.1`** | Instalado com `krita.exe` e `kritarunner.exe` + Python `3.13`. | **Limitação confirmada:** `krita.exe --export` bloqueou aguardando interação/diálogo no Windows e `kritarunner.exe` sem sessão gráfica não concluiu exportação em 15s (mesmo com `PYTHONHOME`/`PYTHONPATH` configurados). Usar Krita para **revisão e pintura humana assistida**, não como executor batch headless. |
| **PixiJS `8.23.0`** | Carregamento de mapa Tiled JSON + `Spritesheet` + `AnimatedSprite` + `TextureStyle.defaultOptions.scaleMode = 'nearest'` verificado em execução real. | Zero erros de console/página. |
| **Playwright + Chromium** | Captura real em `256x128` (`pixi8_pipeline_capture.png`) e 8/8 testes E2E do escritório (`1280x800` e `1440x900`) validados com `ERRORS: 0`. | No Windows, exige `CHROMIUM_PATH` apontando para o Chromium do `ms-playwright` e servidor `vite` em `127.0.0.1:1420` (ou atualização futura do `playwright.config.ts`). |

**Teste técnico executado (sem alterar arte do projeto):**
Criados em pasta de trabalho temporária (`scratch/art_test`): tile isométrico `32x16` (`iso_tile_32x16.png`), spritesheet original de 2 quadros `32x16` (`test_sprite_sheet_32x16.png`), mapa isométrico `3x3` (`test_iso_map.tmx` → `test_iso_map.json` + `test_iso_raster.png`), atlas JSON (`test_sprite_sheet.atlas.json`) e renderização real no PixiJS 8 capturada por Playwright (`pixi8_pipeline_capture.png`).

---

## 7. Problemas Encontrados e Pendências

1. **Bloqueio de build Tauri (`src-tauri/icons/icon.ico`):** O arquivo de ícone referenciado em `tauri.conf.json` não existe ainda no repositório; impede `cargo check` e `tauri build` até ser gerado em etapa futura.
2. **Configuração Playwright voltada ao Linux na branch PR #1:** `playwright.config.ts` usa `/usr/bin/chromium` como fallback e não sobe `vite` automaticamente via `webServer`.
3. **Falhas conhecidas na branch `main` (Fase 1D):** `tsc --noEmit` falha por falta de `@types/node` para `vite.config.ts` e `vitest run` coleta arquivos `*.node.test.mjs`. (Não alterado nesta etapa por diretriz de não modificar código existente.)
4. **Automação headless do Krita no Windows:** Não confiável sem sessão GUI; manter automação batch em Python/Node+`sharp`/Tiled/Pixelorama CLI e deixar Krita para edição manual/revisão.
5. **KeePassXC (`2.8.0`):** Instalado e CLI verificado, aguardando etapa futura autorizada para criação/vinculação do cofre `.kdbx`.
6. **Aprovação artística pendente:** As duas propostas R03 no Drive continuam aguardando revisão humana; nenhuma arte definitiva dos 5 andares foi iniciada.

---

## 8. Próximas Etapas Recomendadas

1. **Revisar a auditoria somente leitura do SSD** (`AUDITORIA_SSD_SOMENTE_LEITURA.md`) e aprovar quais caches/duplicatas seguros podem ser limpos para ampliar a folga de disco (`59,09 GB` livres hoje).
2. **Aprovar ou solicitar ajustes nas duas propostas R03** salvas em `G:\Meu Drive\Projetos Code\01 - Projetos\cloud-workspace-ia\Direcao Artistica - R03 - 2026-11-16`.
3. Quando autorizar o próximo ciclo técnico:
   - Gerar `src-tauri/icons/icon.ico` e validar `npm run desktop:build` (Tauri 2 Windows).
   - Ajustar `playwright.config.ts` para detectar automaticamente o Chromium no Windows e iniciar `vite` via `webServer`.
   - Configurar o cofre KeePassXC em `03 - Cofre de Credenciais` somente quando iniciar a fase de integrações.
