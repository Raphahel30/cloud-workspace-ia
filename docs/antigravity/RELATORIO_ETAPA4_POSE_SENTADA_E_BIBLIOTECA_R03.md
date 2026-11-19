# Relatório Etapa 4 — Correção da Pose Sentada, Oclusão Real Cadeira-Personagem e Biblioteca Modular Expandida do Andar 03

- **Data:** 2026-11-18 (UTC-3)
- **Branch de execução:** `agent/antigravity/floor03-pilot` (`43243f5`) em `C:\Users\PC NOVO\Projetos\worktrees\floor03-pilot`
- **Branch de coordenação/documentação:** `agent/antigravity/setup` em `C:\Users\PC NOVO\Projetos\cloud-workspace-ia`
- **Referência preservada:** PR #1 (`agent/codex/visual-5-floors`) e `main` intactos; nenhum merge ou deploy realizado; arquivos protegidos (`src/core-contracts/agentState.ts`, `tests/agentState.node.test.mjs`, `src/lib/policy.ts`, `tests/policy.test.ts`) intocados.

---

## 1. Objetivo desta Rodada

Antes de expandir a produção artística definitiva para os demais andares (`01`, `02`, `04` e `05`), resolver os dois problemas apontados pelo usuário na avaliação da etapa anterior:

1. **Pose sentada e encaixe físico personagem-cadeira:** evitar aparência de personagem "colado" por cima ou abaixo da cadeira, ajustando altura de assento, ponto de ancoragem, quadril/coxas, tronco/braços, sombra de contato e oclusão real do apoio de braço frontal sobre o tronco/quadril.
2. **Ampliação da biblioteca modular de sprites e riqueza ambiental do Andar 03:** expandir variações de personagens (`ChatGPT`, `Codex`, `Antigravity`, `Claude Code` + `Bot IA`), poses dedicadas, cadeiras (variante A/B), mesas (variante A/B), monitores (padrão e ultrawide), objetos de mesa (`accessories`, `pens_book`, `tablet_mug`, `stacked_books`), luminárias, vegetação (trepadeiras pendentes e floreiras frontais), credenza com abajur, letreiro `EQUIPE IA`, hologramas (`map`, `chart`, `chip`), quadros de blueprint e Elevador `03`.

---

## 2. O Que Foi Executado

### 2.1 Refinamento da Cena Vetorial 5 Andares (`src/scene/OfficeRenderer.ts`, `scripts/art/premium.mjs`, `scripts/art/floor03Pilot.mjs`)
- **Pose sentada alinhada ao assento (`scripts/art/premium.mjs`):** quadril e coxas alinhados horizontalmente à altura real da almofada (`y=86..92`, cabeça em `headY=39`) em vez de pairarem abaixo do encosto.
- **Oclusão real em cadeiras do Andar 03 (`scripts/art/floor03Pilot.mjs` + `src/scene/OfficeRenderer.ts`):** criado `f3-chair-arm` como camada frontal independente renderizada com `zIndex = p.y + 0.4` quando o personagem está sentado (`type`, `seated-*`, ou quadro `sit:1`).
- **Expansão modular no Andar 03 (`floor03Pilot.mjs`):** adicionados 9 sprites modulares (`f3-hanging-vines`, `f3-credenza-lamp`, `f3-wall-blueprint`, `f3-pendant-spot`, `f3-elevator-door`, `f3-fg-planter`, `f3-props-pens`, `f3-props-tablet`, `f3-props-stack`), elevando o atlas para `239` sprites originais em `1024x1202` (`public/art/office.png` com `79.522` bytes em disco e `< 5 MB` em RGBA).

### 2.2 Pipeline Ilustrado RGBA R03_02 — 38 Assets Modulares e Oclusão em Sanduíche (`scripts/art/buildWorkstationProof.mjs`)
- **Correção física da altura do assento (`sprite_chair_back.png` e `sprite_chair_arm_front.png`):** redução do pistão alongado da cadeira original (`238x364` → `238x304`, mantendo encosto e rodízios proporcionais ao chibi R03), contorno limpo do apoio de braço frontal em camada separada + variação cromática escura (`_b`) e sombra de contato (`sprite_seat_shadow.png`).
- **Camada de antebraços e âncora de quadril:** criada folha dedicada `spritesheet_character_forearms_r03.{png,json}` renderizada em `z=78` (acima do teclado `z=74` e da mesa `z=70`), com o corpo sentado ancorado em `(0.45, 194/260)` diretamente sobre a almofada (`z=58`, atrás de `chairArmFront` em `z=64` e à frente de `chairBack` em `z=48` e `seatShadow` em `z=52`).
- **Equipe IA e cena completa do Andar 03 (`floor03-full`):**
  - 4 personagens sentados dedicados + variação `claude-think` + `Bot IA` (`spritesheet_agents_floor03.{png,json}` e recortes individuais).
  - 17 novos props/elementos modulares extraídos com transparência RGBA verificada (`sprite_neon_equipe_ia.png`, `sprite_holo_map.png`, `sprite_holo_chart.png`, `sprite_holo_chip.png`, `sprite_credenza_lamp.png`, `sprite_elevator_03.png`, `sprite_desk_variant_b.png`, `sprite_pendant_spot.png`, `sprite_monitor_back_b.png`, `sprite_hanging_vines.png`, `sprite_fg_planter_left.png`, `sprite_fg_planter_right.png`, `sprite_wall_blueprint_a.png`, `sprite_wall_blueprint_b.png`, `sprite_prop_pens_book.png`, `sprite_prop_tablet_mug.png`, `sprite_prop_stacked_books.png`).
  - Reconstrução limpa da arquitetura estendida (`1740x896`): `layer_floor03_full_wall.png` sem o letreiro chumbado `[bot | IA]` e sem bordas cianas duplicadas, `layer_floor03_full_floor.png` sem faixas/LEDs repetidos, ajuste fino de `roomSeamY(x)` para eliminar qualquer filete de rodapé no chão isolado, e alinhamento dos props sobre o tampo da mesa (`yFloor - 116`) e do letreiro `EQUIPE IA` entre as luminárias.
- **Editáveis preservados:** `workstation_r03_proof.tmx`, `public/art/workstation-proof/workstation_r03_map.json` e `workstation_r03_proof.pxo`.

---

## 3. Verificações Executadas e Resultados

Ordem estritamente sequencial respeitando o limite de carga do host (`AMD Ryzen 5 5600G` / `16 GB` RAM):

| Verificação | Comando / Origem | Resultado Observado |
| :--- | :--- | :--- |
| Atlas procedural 5 andares | `npm run art:build` | **PASS** — `239 original sprites packed in 1024×1202`, `office.png` = `79.522` bytes (`< 5 MB` RGBA verificado) |
| Pipeline prova R03 RGBA | `node scripts/art/buildWorkstationProof.mjs` | **PASS** — `Generated 38 layered RGBA assets and manifests cleanly.` (`30` sprites + `5` camadas de sala + `3` sheets; `6` agentes individuais) |
| TypeScript + Vite build | `npm run build` | **PASS** (`5.02s`) |
| Testes unitários / arte | `npm run test` (Vitest) | **PASS** — `5` arquivos, **`24/24`** testes |
| Políticas / Segurança | `npm run test:policy` | **PASS** — **`3/3`** testes |
| Contratos de estado | `npm run test:contracts` | **PASS** — **`5/5`** testes |
| Playwright E2E Windows | `npm run test:e2e` (`workers: 1`) | **PASS** — **`9/9`** testes (`1.1m`: 8 em `office.spec.ts` + 1 em `workstationProof.spec.ts`) |
| Prancha comparativa | `node scripts/art/buildWorkstationComparison.mjs` | **PASS** — `COMPARACAO_PROVA_ESTACAO_R03_02.png` (`2.029.450` bytes) |
| Rust / Tauri 2 check | `cargo check` (`src-tauri`) | **PASS** (`0.89s`) |
| Inspeção visual direta | `read_file` nas capturas PNG reais | **CONFIRMADO** — encaixe sentado com oclusão de braço em zoom e no prédio de 5 andares; Andar 03 completo sem letreiro duplicado/corte de luminária e sem filete flutuante no modo isolado |

---

## 4. Artefatos e Caminhos Sincronizados

- **Repositório `agent/antigravity/floor03-pilot` (`43243f5`):**
  - Scripts e código: `scripts/art/buildWorkstationProof.mjs`, `scripts/art/buildWorkstationComparison.mjs`, `scripts/art/floor03Pilot.mjs`, `scripts/art/premium.mjs`, `src/scene/OfficeRenderer.ts`, `src/scene/WorkstationProofRenderer.ts`, `src/scene/workstationProofTypes.ts`, `src/components/WorkstationProof.tsx`, `src/styles.css`, `tests/art.test.ts`, `tests/e2e/workstationProof.spec.ts`.
  - Capturas e pranchas: `assets/workstation-proof/COMPARACAO_PROVA_ESTACAO_R03_02.png`, `assets/workstation-proof/PROVA_ASSETS_SEPARADOS_TRANSPARENCIA.png`, `assets/workstation-proof/captures/PROVA_ANDAR03_COMPLETO_4_ESTACOES_PIXI.png`, `PROVA_ESTACAO_PIXI_TYPE.png`, `PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png`, `docs/codex/screenshots/premium-working-zoom-1440x900.png`.
- **Google Drive (`G:\Meu Drive\Projetos Code\01 - Projetos\cloud-workspace-ia\Relatorios Preparacao\`):**
  - Cópia deste relatório, `STATUS_CONTINUO_ANTIGRAVITY.md`, `COMPARACAO_PROVA_ESTACAO_R03_02.png`, capturas principais e atualização integral da subpasta `Prova Artistica Estacao R03_02\`.

---

## 5. Pendências que Exigem Aprovação Humana

- Aprovação visual do **Andar 03 refinado** (`PROVA_ANDAR03_COMPLETO_4_ESTACOES_PIXI.png`, `PROVA_ESTACAO_PIXI_TYPE.png`, `PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png` e `COMPARACAO_PROVA_ESTACAO_R03_02.png`) antes de expandir esta mesma metodologia para os andares `01`, `02`, `04` e `05`.
- Autorização futura para merges das branches isoladas ou integração final do sidecar Node/SQLite ao binário Tauri.
