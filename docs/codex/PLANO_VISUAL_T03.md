# Tarefa 03 — plano de execução

Especificação: pedido Tarefa 03, GUIA_VISUAL_APROVADO.md e referência PNG.
Execução já autorizada pelo usuário; decisões visuais fechadas no Plano Mestre.

Arquitetura: preservar App, FloorDetails, Tauri e contratos. Substituir somente Office por host React de renderer PixiJS 8. Objetos de arquitetura, móveis, personagens, luzes e elevador independentes. Atlas PNG nearest-neighbor gerado de fontes SVG originais editáveis. Não usar a referência como textura.

- C0: branch isolada; inventário Node/npm/Tauri; instalar PixiJS e ferramentas de arte/teste; lockfile; executar testes base.
- C1: `src/scene/OfficeRenderer.ts`, host `Office.tsx`: cinco Containers, câmera e seleção acessível React. Verificar clique, teclado, Escape e retorno.
- C2: `scripts/generate-assets.mjs`, `assets/source/`, `public/art/`: fachada, pisos, monitores de costas voltados ao personagem, mobiliário, plantas, personagens com roupa consistente. Comparar capturas reais com referência e corrigir composição.
- C3: `src/scene/behavior.ts`: consumir AgentVisualState sem modificar contrato; DEMO com seis estados, rotas curtas até cadeira, quadros walk/type/idle/wait/error. Separar tempo visual de dados. Testar ausência, desconhecido, ida/retorno e pausa.
- C4: Vitest, testes Node originais, Playwright Chromium, screenshots 1280×800 e 1440×900, métricas de frames/objetos e pausa; relatório, commits e PR sem merge/deploy.

Riscos a verificar: desmontagem durante init assíncrono; contexto WebGL indisponível; zoom após resize; aba oculta/intersection; redução de movimento; conteúdo fora da tela em notebook. Testes cobrem estados, câmera, pause/visibilidade e desmontagem/remontagem. Falha gráfica deve apresentar mensagem acessível, nunca trocar pela referência.

Conflito histórico: Plano Mestre menciona repositório ainda não criado e proibição anterior de criar GitHub. A autorização atual nomeia o repositório existente e pede branch/PR; não autoriza integrações de produto, merge nem deploy. Sem mudança das decisões funcionais.

## Continuação autorizada — PR #1, rodada premium 2

Hardware de referência: Ryzen 5 5600G / Radeon integrada / 16 GB RAM / NVMe 512 GB. Arquitetura permanece PixiJS 8 + React/Tauri, sem depender de ensaio prévio no Windows.

Executado: materiais/luz rasterizada, personagens e mobiliário detalhados; atlas recortado com origem preservada; interiores ampliados, fachada e vegetação; máquina visual de trajetos pelo corredor, aproximação, sentar/levantar e saída; elevador com paradas/portas; cache seletivo avaliado no Cloud; testes de regressão, novas capturas, benchmark e relatório. Manter as metas 30/10/0 FPS e registrar desempenho efetivo sem prometer resultado no hardware alvo. Nenhuma integração, contrato protegido, merge ou deploy autorizado nesta continuação.

## R03 — correção artística obrigatória (2026-11-16 23:43 UTC)

A aparência das rodadas anteriores foi REJEITADA. Preservar tudo como protótipo técnico; não seguir com refinamentos geométricos ou expansão de sprites. A referência aprovada é o alvo principal, sem substituição de estilo.

- [ ] 1. Produzir conceito estático ilustrado do prédio inteiro, fiel a composição/proporção/materiais/luz da referência.
- [ ] 2. Produzir conceito ampliado de um andar com personagens e mobiliário na mesma qualidade.
- [ ] 3. Comparar referência / versão atual / propostas e exportar para APROVAÇÃO HUMANA.
- [ ] Backup: manter arte, prompts, comparação e registros no repositório e no Drive quando a gravação for verificada.
- [!] 4. Implementação e expansão de sprites BLOQUEADAS até aprovação explícita; depois planejar arte original independente por camadas e animações PixiJS, preservando sistemas existentes.

Registro contínuo obrigatório: `docs/codex/STATUS_CONTINUO_CODEX.md`. Diretório da rodada: `docs/codex/direcao-artistica/R03/`. Propostas estáticas são conceitos, nunca capturas de funcionamento.
