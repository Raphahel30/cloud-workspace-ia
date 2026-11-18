# Auditoria Somente Leitura do SSD e Projetos Locais

- **Data da coleta:** 2026-11-18 (UTC-3)
- **Modo:** **100% SOMENTE LEITURA** (nenhum arquivo, pasta ou repositório existente foi excluído, movido ou substituído)
- **Disco analisado:** Unidade `C:` (`XrayDisk 512GB SSD`) — `475,34 GB` totais | `416,25 GB` usados | **`59,09 GB` livres**

---

## 1. Maiores Consumidores Gerais em `C:\` e Perfil do Usuário

### 1.1 Pastas raiz em `C:\` (> 100 MB)
| Caminho | Tamanho | Observação |
|---|---:|---|
| `C:\Program Files (x86)` | `52,30 GB` | Programas / SDKs / Build Tools |
| `C:\Riot Games` | `51,29 GB` | Jogos |
| `C:\MoveInteractive` | `23,48 GB` | Jogos / cliente |
| `C:\Program Files` | `21,34 GB` | Programas (inclui Git, Node, Krita, Tiled, KeePassXC, Google Drive) |
| `C:\ProgramData` | `8,26 GB` | Dados de programas e instaladores |
| `C:\mingw64` + `C:\mingw64_real` | `1,78 GB` (`0,89 GB` cada) | **Possível duplicata** (`mingw64` e `mingw64_real` com tamanho idêntico) |
| `C:\GOG Games` | `0,85 GB` | Jogos |
| `C:\github-runner-teclado` | `0,73 GB` | GitHub Actions runner local (`teclado-backup-escrita`) |
| `C:\AMD` | `0,44 GB` | Pacotes extraídos de driver AMD |

### 1.2 `AppData\Local` e `AppData\Roaming` (> 500 MB)
| Caminho | Tamanho medido | Observação |
|---|---:|---|
| `AppData\Local\Google\Play Games` | `512,32 GB` *(lógico)* | Disco virtual esparso do Google Play Games (tamanho real alocado em disco é menor que o lógico) |
| `AppData\Local\Google\Chrome` | `4,12 GB` | Cache e perfis do Chrome |
| `AppData\Local\Google\DriveFS` | `0,14 GB` (`142,71 MB`) | Cache mínimo de streaming do Google Drive |
| `AppData\Local\Docker` | `26,95 GB` | Imagens/VHDX do Docker Desktop |
| `AppData\Local\Temp` | **`19,80 GB`** | Temporários acumulados (ver detalhamento na Seção 3) |
| `AppData\Local\Programs` | `14,35 GB` | Aplicativos instalados no perfil (Python, Antigravity/VSCode, etc.) |
| `AppData\Local\npm-cache` | **`11,01 GB`** | Cache global do npm |
| `AppData\Local\uv` | **`10,56 GB`** | Cache de pacotes Python do `uv` |
| `AppData\Local\hermes` | `9,22 GB` | Ferramenta / ambiente Hermes |
| `AppData\Local\Packages` | `7,17 GB` | Apps UWP / Store |
| `AppData\Local\Microsoft` | `4,28 GB` | Dados de sistema/Edge/VS |
| `AppData\Local\ms-playwright` | `1,39 GB` | Browsers dedicados do Playwright (necessários para testes) |
| `AppData\Local\SquirrelTemp` | `0,95 GB` | Temporários de atualizadores Squirrel |
| `AppData\Roaming\br.com.optigrill.assistant` | `2,38 GB` | Dados locais do app OptiGrill |
| `AppData\Roaming\npm` | `1,37 GB` | Pacotes npm globais |
| `AppData\Roaming\uv` | `1,25 GB` | Dados `uv` |

### 1.3 Outros caches e diretórios pesados do usuário
| Caminho | Tamanho | Observação |
|---|---:|---|
| `Desktop\Videoaulas_Tanatopraxia` | `6,01 GB` | Mídia / projetos de vídeo (inclui `node_modules` de `0,36 GB`) |
| `Desktop\Sites em produção` | `3,20 GB` | Conjunto de projetos web (com múltiplas cópias e `node_modules`) |
| `Documents\Codex` | `3,12 GB` | Snapshots datados (`2026-09-01` 1,18 GB, `2026-09-06` 958,5 MB, `2026-10-22` 383,2 MB, `2026-09-21` 310,5 MB, `2026-09-20` 308,9 MB) |
| `Desktop\barbersaas-local-review` | `2,97 GB` (`3038,24 MB`) | Cópia local sem `.git` com `13.769` arquivos |
| `.cache\huggingface` | `3,14 GB` | Modelos/cache HuggingFace |
| `.cache\codex-runtimes` | `2,06 GB` | Runtimes em cache |
| `.cache\puppeteer` | `1,40 GB` | Browsers em cache do Puppeteer |
| `.rustup` | `2,88 GB` | Inclui `stable-x86_64-pc-windows-gnu` além da ativa `msvc` |
| `Downloads` | `2,03 GB` | Instaladores antigos e duplicados |

---

## 2. Comparação de Projetos Locais × GitHub × Google Drive

> **Critério usado:** Inspeção de `.git` (`HEAD`, branch, `rev-list --left-right --count HEAD...@{u}`, `git status --short`), `package.json`, contagem de arquivos e datas reais, confrontados com a lista de repositórios `Raphahel30/*` no GitHub e pastas em `G:\Meu Drive`.

| Caminho local | Tamanho | Repositório / Origem | Branch e `HEAD` | Sincronização Git / Sujeira | Presença no Drive | Classificação e risco |
|---|---:|---|---|---|---|---|
| `Desktop\Sites em produção\Site saas barbeiaria` | `1,18 GB` (`node_modules` `417,58 MB`) | `Raphahel30/barbersaas-platform` | `main` (`c61258d`, `2026-09-16`) | **5 commits à frente** + **56 arquivos sujos** | Não identificado em `Projetos Code` | **NÃO APAGAR** — possui trabalho local não enviado |
| `Desktop\Sites em produção\Site saas barbeiaria - integracao segura` | `0,77 GB` (`node_modules` `417,58 MB`) | `Raphahel30/barbersaas-platform` | `codex/integracao-segura-pr2` (`3e48ab9`, `2026-10-12`) | **6 commits à frente**, `0` sujos | Não | **NÃO APAGAR** — commits locais não enviados |
| `Desktop\barbersaas-local-review` | `2,97 GB` (`13.769` arq.) | Sem `.git` (`barbersaas-platform@1.0.0`) | N/A | Último arq. `2026-09-15` | Não | **REVISAR** — cópia antiga de revisão; comparar conteúdo antes de remover |
| `Desktop\barbersaas-review-lite` | `2,38 MB` (`66` arq.) | Sem `.git` (`barbersaas-platform@1.0.0`) | N/A | Último arq. `2026-09-14` | Não | **REVISAR** — subconjunto antigo de revisão |
| `Desktop\SaaS barbearia` | `0,51 GB` (`node_modules` `288,82 MB`) | Sem `.git` (`barber-saas-whitelabel@1.0.0`) | N/A | Último arq. `2026-09-07` | Não | **REVISAR** — versão antiga anterior aos commits de out/2026 |
| `Desktop\Sites em produção\Barbearia Emaus\barbearia-app` | `0,64 GB` (`node_modules` `403,07 MB`) | `Raphahel30/barbearia-app` | `main` (`f30efe9`, `2026-10-30`) | `0/0` vs remoto, **9 arquivos sujos** | Não | **REVISAR alterações locais** antes de limpar |
| `Desktop\Sites em produção\Barbearia Emaus\barbearia-app-main` | `6,65 MB` (`43` arq.) | Sem `.git` (`emaus-barbearia@1.0.0`) | N/A | Último arq. `2026-08-31` | Não | **DUPLICATA ANTIGA** (anterior ao repo `barbearia-app` de 30/10) |
| `Desktop\Sites em produção\SaaS pet shop\saas-pet-shop` | `0,25 GB` (`node_modules` `208,43 MB`) | `Raphahel30/saas-pet-shop` | `fix/petsistore-hero-mobile` (`7ba6f4e`, `2026-10-27`) | Sem tracking remoto + **11 arquivos sujos** | Não | **NÃO APAGAR** — preserva trabalho/branch local |
| `ChatGPT-Antigravity-Orquestrador\workspace\saas-pet-shop` | `0,32 GB` (`node_modules` `208,48 MB`) | `Raphahel30/saas-pet-shop` | `orquestrador/etapa2-scaffold-20261029` (`8eba288`, `2026-11-05`) | Sem tracking remoto, `0` sujos | Não | **REVISAR** (commit `8eba288` de 05/11) |
| `ChatGPT-Antigravity-Orquestrador\workspace\petsistore-et2-audit-review` | `12,02 MB` | `Raphahel30/saas-pet-shop` | `feature/petsistore-et2-audit-review-20261031` (`8eba288`, `2026-11-05`) | Sem tracking remoto, `0` sujos | Não | Mesmo commit `8eba288` em branch diferente |
| `Documents\ChatGPT\Sebastião Freitas - Quiropraxia` | `1,00 GB` (`node_modules` `675,78 MB`) | `Raphahel30/sebastiao-freitas-quiropraxia` | `main` (`e474de0`, `2026-10-03`) | **`0/0` sincronizado**, `0` sujos | `Documents` no backup Drive | **`node_modules` (`675,78 MB`) recuperável** sem risco ao código |
| `Desktop\Sites em produção\app venda doce` | `0,85 GB` (`node_modules` `635,16 MB`) | `Raphahel30/controle-vendas-pessoal` | `master` (`e98245e`, `2026-09-20`) | **`0/0` sincronizado**, `0` sujos | `Desktop` no backup Drive | **`node_modules` (`635,16 MB`) recuperável** (último push no GitHub `2026-11-11` — verificar se há branch mais nova no GitHub) |
| `Desktop\WedoFeast` | `0,38 GB` (`node_modules` `116,27 MB`) | `Raphahel30/WeDoFeast-Teste` | `main` (`dffbb3a`, `2026-09-04`) | `0/0` vs remoto, **53 arquivos sujos** | `Desktop` no backup Drive | **REVISAR 53 arquivos sujos** antes de mexer |
| `Desktop\NiftyVid-Teste` | `1,21 GB` | `IgorCSIS/nifty-vid` | `main` (`63ea9e4`, `2026-09-29`) | `0/0` vs remoto, **2 arquivos sujos** | `Desktop` no backup Drive | **REVISAR** — repo de terceiros/teste |
| `actions-runner-optigrill\_work\controle-estoque-optigrill\...` | `0,31 GB` (`node_modules` `305,37 MB`) | `Raphahel30/controle-estoque-optigrill` | `main` (`f524929`, `2026-09-24`) | `0/0` sincronizado, `0` sujos | Não | Workspace de runner local |
| `Desktop\Optigrill-IA-AWS-Setup\github-optigrill-ia` | `2,28 MB` | `Raphahel30/optigrill-ia` | `main` (`19957bd`, `2026-11-06`) | `0/0` sincronizado, `0` sujos | `Desktop` no backup Drive | Sincronizado e pequeno |
| `Desktop\erp-wellpar-crm` | `0,43 MB` | `Raphahel30/erp-wellpar-crm` | `main` (`3372d38`, `2026-10-13`) | `0/0` sincronizado, `0` sujos | Export Supabase no Drive (`2026-10-14`) | Sincronizado e pequeno |
| `C:\github-runner-teclado\_work\teclado-backup-escrita\...` | `12,99 MB` | `Raphahel30/teclado-backup-escrita` | `build/a54-shared-storage-apk-20261017` (`e4f6cfc`) | `0/0` vs remoto, `2` sujos | Não | Runner Android |
| `antigravity-orchestrator-mcp` | `1,00 GB` (`node_modules` `13,87 MB`) | Sem `.git` | N/A | — | Não | **PRESERVAR** — ferramenta Orquestrador em uso |
| `Projetos\cloud-workspace-ia` | `0,12 GB` (`node_modules` `85,16 MB`) | `Raphahel30/cloud-workspace-ia` | `agent/antigravity/setup` | Sincronizado com `main` | `Projetos Code\01 - Projetos\cloud-workspace-ia` | **PRESERVAR** — ambiente oficial atual |

---

## 3. Detalhamento de Espaço Potencialmente Recuperável (Estimativa Conservadora)

### Faixa A — Caches e Temporários Seguros para Limpeza (sem apagar projetos)
| Alvo | Espaço recuperável | Motivo |
|---|---:|---|
| `AppData\Local\Temp` (destaques: `DockerDesktopUpdates` 3,68 GB, `DockerDesktop` 1,77 GB, `Docker Desktop Installer.exe` + `DockerDesktopInstaller.exe` 1,19 GB, `codex-optigrill-browser` 0,85 GB, `docesdale-dep-audit` 0,65 GB, `WinGet` 0,50 GB, `7z46B06AE4` 0,32 GB, `wsl.2.7.12.0.x64.msi` 0,25 GB, `vscode-stable-user-x64` 0,23 GB + demais temporários) | **~19,80 GB** | Arquivos temporários e instaladores já extraídos/executados |
| `AppData\Local\npm-cache` (`npm cache clean --force`) | **~11,01 GB** | Cache rebaixável sob demanda |
| `AppData\Local\uv` (cache Python `uv cache clean`) | **~10,56 GB** | Cache de wheels/ambientes reconstruível |
| `.cache\puppeteer` + `.cache\huggingface` (se não estiverem em uso ativo) | **~4,54 GB** | Cache de modelos e Chromium antigo do Puppeteer (`1,40 GB` + `3,14 GB`) |
| `Downloads` (instaladores duplicados/antigos: `Antigravity IDE*.exe`, `GitHubDesktopSetup-x64.exe`, `opencode-desktop`, `codex-web`, `Software_Fix`) | **~1,29 GB** | Instaladores antigos já instalados ou duplicados |
| `AppData\Local\SquirrelTemp` | **~0,95 GB** | Restos temporários de atualização |
| **Subtotal Faixa A (Limpeza de caches/temporários)** | **~48,15 GB** | Baixíssimo risco; nenhum código-fonte é afetado |

### Faixa B — Dependências Reinstaláveis e Duplicatas Após Revisão/Backup
| Alvo | Espaço recuperável | Condição prévia obrigatória |
|---|---:|---|
| `node_modules` de projetos locais parados/sincronizados (ex.: `Sebastião Freitas` 675 MB, `app venda doce` 635 MB, `barbearia-app` 403 MB, `Site saas barbeiaria*` 835 MB, `saas-pet-shop` x2 417 MB, `SaaS barbearia` 289 MB, `Revisao_20min` 284 MB, `WedoFeast` 116 MB) | **~3,65 GB** | Só após confirmar que o projeto não está em uso imediato e, nos que têm alterações locais, preservar o código-fonte |
| `Desktop\barbersaas-local-review` (`2,97 GB`) + `barbersaas-review-lite` (`2,38 MB`) + `SaaS barbearia` (`0,51 GB`) + `barbearia-app-main` (`6,65 MB`) | **~3,49 GB** | **Somente após diff/backup** para confirmar que nada exclusivo existe além do GitHub |
| `Documents\Codex` snapshots antigos (`2026-09-01` a `2026-10-27`) | **~3,12 GB** | Confirmar se já estão no Google Drive ou se não são mais necessários |
| `.rustup` toolchain não padrão (`stable-x86_64-pc-windows-gnu`) | **~1,0–1,4 GB** | Apenas se nenhum projeto usar `pc-windows-gnu` (Tauri usa `msvc`) |
| `C:\mingw64` vs `C:\mingw64_real` (`0,89 GB` duplicado) | **~0,89 GB** | Verificar qual dos dois está no `PATH`/uso antes de remover a cópia |
| **Subtotal Faixa B (Requer aprovação e verificação item a item)** | **~12,15 GB** | — |

### Faixa C — Consumo Estrutural de Grande Porte (Informativo)
- `AppData\Local\Docker` (`26,95 GB`): imagens/containers/VHDX do Docker Desktop (`docker system df` / `prune` apenas se aprovado).
- `C:\Riot Games` (`51,29 GB`) e `C:\MoveInteractive` (`23,48 GB`): jogos.
- `AppData\Local\Google\Play Games` (`512,32 GB` lógico em imagem esparsa).

**Resumo do ganho potencial imediato sem apagar projetos:**
- **Limpeza segura de caches e temporários (Faixa A):** até **~48,15 GB** recuperáveis.
- **Com revisão de `node_modules` e duplicatas antigas (Faixa A + Faixa B):** até **~60,30 GB** recuperáveis (sem contar eventual limpeza de `Docker` `26,95 GB`).

> **Nenhuma exclusão, movimentação ou substituição foi executada.** Aguardando sua aprovação explícita por item ou faixa.
