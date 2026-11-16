# Codex Cloud — Tarefa 02 | Recriação premium do prédio 16 bits

**Repositório:** `Raphahel30/cloud-workspace-ia` (privado)  
**Base:** `main`, importar/salvar trabalho exclusivamente na branch `agent/codex/visual-5-floors` ou na branch isolada que o próprio Codex criar.  
**Produto:** Cloud Workspace IA, desktop Windows em Tauri 2 + React 19 + TypeScript + Vite.

Você está responsável **somente pelo frontend visual, arte pixel art original e animações**. Eu, ChatGPT, continuarei os módulos de MCP, armazenamento, credenciais, segurança, integrações e testes de núcleo. Não misture esses trabalhos.

## Inspecione antes de programar
Leia `AGENTS.md`, `docs/codex/CODEX_PROMPT_01_VISUAL.md`, `docs/codex/GUIA_VISUAL_APROVADO.md`, `docs/codex/PLANO_MESTRE_v2_0_REFERENCIA.txt`, `README.md`, `docs/FASE_1D_REGISTRO.md` e o arquivo de imagem **presente neste repositório** em `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png`. Inspecione `src/App.tsx`, `src/components/Office.tsx`, `src/components/FloorDetails.tsx`, `src/lib/scenePolicy.ts`, `src/core-contracts/agentState.ts`, `public/building-*.svg` e `src-tauri/`.

Não assuma acesso ao meu Google Drive, ao Windows, ao Desktop Commander ou a outras contas. Trabalhe apenas com o repositório e suas ferramentas autorizadas.

## Objetivo de produto e design
Quero uma **única fachada de prédio isométrico 16 bits premium com 5 andares visíveis na mesma cena**, inspirada diretamente na imagem aprovada, com acabamento consistente, cidade noturna, iluminação suave âmbar/ciano, móveis, personagens, monitores, elevador e servidores. O prédio deverá ser um escritório vivo controlado por estados; não uma animação/vídeo de plano de fundo. Preservar a escala e a leitura em notebook. O protótipo SVG atual é ponto de partida funcional, **não a referência de qualidade**.

Pisos (de baixo para cima): 01 Recepção / projetos; 02 Chefe / controle; 03 Funcionários IA; 04 Infraestrutura / MCP / testes; 05 Servidores / integrações. Cada piso é clicável, navegável por teclado, tem zoom/retorno, status contextual e conteúdo legível.

**Geometria obrigatória:** todos os monitores com a TELA VOLTADA PARA O PERSONAGEM usuário, nunca para a câmera. É correto que o espectador veja o verso do monitor. Conferir mesa/teclado/cadeira/posição dos braços e isometria de todos os postos.

## Engenharia visual
- Implementar o renderer como módulos React + `pixi.js` versão atual compatível com o projeto (PixiJS 8 usa `new Application()` e `await app.init(...)`), ou justificar fallback Canvas 2D. React continua responsável pelos controles, acessibilidade, dados e overlays. Evitar dependências desnecessárias ou 3D pesado.
- Criar spritesheets e assets **originais editáveis** (PNG transparente em grade pixel art, JSON do atlas, scripts de geração e fontes quando possível) para piso, fachada, móveis, racks, LED, personagens, elevador e efeitos. Nunca use a imagem de referência inteira como fundo, e nunca dependa de GIF ou vídeo para as animações.
- Usar nearest-neighbor, escala por múltiplos inteiros sempre que possível, câmera, camadas ordenadas por profundidade, hitboxes por piso, oclusão coerente, layout responsivo.
- Personagens com animações individuais em loops: caminhar (mín. 4 quadros), digitar (mín. 4), ocioso (mín. 2), aguardar (mín. 2), alerta (mín. 2). Animar elevador, iluminação e LEDs separadamente. Executar apenas movimentos correspondentes ao estado atual.
- Separar a lógica de animação de telemetria. **Ausência de conexão/execução real = DESCONHECIDO**, e simulações devem mostrar o selo **DEMO**. Não fingir tarefa, erro, autorização ou sincronização real. O personagem-chefe só aparece numa tarefa real confirmada do Cloud Workspace; em demo, rotular claramente a simulação. Respeite `src/core-contracts/agentState.ts` como contrato somente de leitura.
- Priorizar Ryzen 5 5600G, 16 GB RAM e GPU integrada: pausa total da renderização quando a interface está oculta/minimizada, reduz o FPS em idle, movimento reduzido, recursos liberados no unmount, sem impacto no serviço MCP em background.

## Processo obrigatório, em incrementos verificáveis
**C0 Inventário:** instale dependências, rode os testes atuais, documente impedimentos e confirme a árvore de arquivos. Não reescreva toda a base desnecessariamente.
**C1 Estrutura:** implemente cena por camadas de cinco pisos, seleção e zoom; mantenha a interface React funcional. Execute build/testes e capture telas.
**C2 Alta fidelidade:** crie os assets originais, melhore a geometria, monitores e iluminação; compare captura real lado a lado com `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png` e corrija as discrepâncias.
**C3 Movimento:** instale animações separadas por estado, controles de pausa/reduced-motion, animação ao clicar e testes de eventos.
**C4 Qualidade:** testes unitários, screenshots reais em 1280×800 e 1440×900 com Playwright/Chromium, verificações de zoom/teclado e regressão visual; relatório de desempenho medido, sem inventar números.

Trabalhe em commits pequenos, retome etapas incompletas na mesma branch e mostre provas verificáveis. Você pode usar `@playwright/test` para capturas e comparações; `pixelmatch` ou `sharp` para auxiliares de análise de imagem; LibreSprite (opcional) para exportar sprite sheets. Não baixe bibliotecas/assets de origem desconhecida nem incorpore material de terceiros sem licença compatível documentada. Não são necessárias ferramentas pagas, tokens externos ou acesso aos meus serviços para esta tarefa.

## Testes e aceite
Execute o que estiver configurado e reporte saídas: `npm install` (ou `npm ci` quando houver lockfile), `npm run build`, `npm run test`, `npm run test:policy`. Quando `@playwright/test` estiver disponível, adicione e execute testes de clique, zoom, estados DEMO e screenshots; grave capturas em `docs/codex/screenshots/` com nomes inequívocos. Testes Windows/Tauri só podem ser declarados aprovados após execução real em Windows.

Critérios de aceite: (1) cinco pisos reais e interativos; (2) visual significativamente mais fiel à referência; (3) os monitores voltados aos personagens; (4) animações individuais por estado; (5) telemetria não inventada; (6) build web/testes; (7) screenshots capturadas da interface executando; (8) uso moderado de recursos; (9) documentação das diferenças remanescentes. Se o visual ainda estiver provisório, seja explícito.

**Restrições:** sem merge em `main`, deploy, alteração da produção ou modificação de outro projeto; sem leitura, edição ou vazamento de credenciais; não alterar `src/core-contracts/agentState.ts` e `tests/agentState.node.test.mjs`; não implementar MCP, GitHub/Drive/Hostinger reais neste PR. Preparar PR para revisão, não mesclar sozinho.

**Entrega:** código + fontes dos assets + testes + capturas reais + relatório `docs/codex/RELATORIO_VISUAL_CODEX.md` com o que foi feito, testes executados, performance observada, lacunas e URLs de PR. Priorize progresso concreto sobre textos/planos. Se não conseguir completar todo o acabamento em uma tarefa, entregue o melhor incremento compilando e deixe as próximas etapas detalhadas no relatório.