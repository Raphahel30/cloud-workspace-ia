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
