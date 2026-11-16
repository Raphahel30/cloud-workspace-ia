# TAREFA CODEX CLOUD — CLOUD WORKSPACE IA — REPRODUÇÃO VISUAL DO PRÉDIO 16 BITS

Você atuará como desenvolvedor principal **somente da interface visual e das animações** do projeto existente Cloud Workspace IA. Execute no repositório privado já carregado no ambiente Codex; não presuma acesso ao meu Google Drive ou computador.

**Leia antes de alterar qualquer arquivo:**
1. `AGENTS.md`
2. `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png` — imagem aprovada e padrão visual-alvo.
3. `docs/codex/GUIA_VISUAL_APROVADO.md`
4. `docs/codex/PLANO_MESTRE_v2_0_REFERENCIA.txt` — decisões vinculantes.
5. `README.md`, `docs/FASE_1D_REGISTRO.md`, `src/App.tsx`, `src/components/Office.tsx`, `src/components/FloorDetails.tsx`, `src/data/floors.ts`, `src/lib/scenePolicy.ts`, `public/building-*.svg`, `src-tauri/`.

## Objetivo visual inegociável
Transformar o protótipo atual, feito de SVGs simples, em um **prédio 16 bits isométrico PREMIUM, interativo, com 5 andares empilhados, o mais próximo possível da referência aprovada**, sem fingir que o PNG é um aplicativo funcional. O prédio inteiro precisa caber em uma tela; cada andar deve ser clicável e ampliável. Não modificar o conceito de prédio para três salas horizontais. Conservar o layout geral: prédio recortado por fachada, cidade noturna, iluminação âmbar/ciano, painel lateral, elevador à direita, 5 pisos, elementos de escritório, servidores.

## Cinco andares (mesma ordem e significado da referência)
01 — RECEPÇÃO / VISÃO GERAL: entrada, recepção, projetos, fila e aprovações; não importar projetos automaticamente.
02 — CHEFE / CONTROLE: sala do chefe e dashboards; o personagem do chefe SÓ aparece durante tarefas reais confirmadas pelo Cloud Workspace (em modo demo simulado, rotulado explicitamente).
03 — FUNCIONÁRIOS IA: mesas dos agentes ChatGPT, Antigravity, Codex, Claude Code e futuros agentes, com postos e personagens individualizados; closed=ausente, aberto sem atividade=ocioso/desconhecido, atividade confirmada=trabalhando, aprovação pendente=aguardando, falha=alerta.
04 — INFRAESTRUTURA / MCP / TESTES: instrumentos de execução local, Playwright headless, testes e recursos CPU/RAM. Não simular execução real.
05 — SERVIDORES / INTEGRAÇÕES: racks e representações Drive, GitHub, Hostinger e sincronização. LEDs apenas ambientação DEMO ou estados verdadeiros quando conectores existirem.

## Regra geométrica OBRIGATÓRIA
Em TODOS os postos, **a tela do computador deve olhar para a pessoa sentada, e não para a câmera**. Em perspectiva isométrica alguns monitores terão o painel traseiro visível ao usuário, e isso está correto. Arrumar mesas, cadeiras, teclados e braços com orientação coerente. Não contornar invertendo o monitor.

## Implementação desejada
- Preservar Tauri 2 + React + TypeScript + Vite e os contratos de segurança; criar um renderer visual modular usando PixiJS estável compatível, ou Canvas 2D caso o ambiente imponha bloqueios justificados. Evitar 3D real/pesado.
- NÃO usar GIF, vídeo animado, PNG de screenshot única nem imagem gerada como **fundo integral do prédio**. A referência PNG é especificação visual, não asset final plug-and-play.
- Criar sprites originais estilo 16 bits em camadas reutilizáveis, com nearest-neighbor e atlas quando fizer sentido: prédios/fachada, pisos, paredes, janelas, mesas, monitores, personagens, decoração, racks, elevador, luzes/partículas. Pode gerar SVG/pixel art por código inicialmente se necessário, mas o resultado deve ser mais elaborado que o protótipo atual. Não afirmar fidelidade total se ela ainda não foi alcançada.
- Uma cena por piso ou grupo de renderização; z-index/oclusão corretos; hitboxes coerentes e clique/teclado para entrar no andar, animação de câmera com zoom e retorno.
- Personagens originais com animações independentes (mínimo para um agente: 4 quadros caminhar, 4 digitar, 2 dormir/ocioso, 2 aguardar, 2 alerta). Elevator percorre shaft sem atravessar lajes indevidamente; LEDs piscam por rack; monitores exibem conteúdo sem alterar a orientação.
- Estados tipados separados de renderização. **DEMO** sempre identificado. Telemetria não confirmada = `unknown`/indisponível. Processos abertos não bastam para inferir atividade. Manter `scenePolicy.ts`, protegendo o contrato do chefe e de integrações.
- Otimização: alvo inicial de 30 FPS quando aberto/ativo, reduzir FPS no modo ocioso, pausar ao ocultar/minimizar, oferecer reduced-motion, escala apropriada ao notebook Ryzen 5600G / 16GB / GPU integrada.
- UI: visão geral com 5 setores, legenda real/demonstrativa, painéis de detalhe, menu lateral, alertas localizados, controles de animação, texto legível a 1250x800; uso de teclado/foco visível.
- Tratar acessibilidade e não usar `dangerouslySetInnerHTML` para SVGs não confiáveis; preferir assets estáticos próprios, módulos de componentes ou texturas e evitar XSS.

## Plano de implementação (entregas incrementais, commits separados)
ETAPA C0 — Inventário: inspecionar código existente, instalar dependências, executar testes existentes, registrar problemas e plano sucinto. Não substituir/reformatar tudo desnecessariamente.
ETAPA C1 — Base de renderização e geometria: cena em camadas, câmera, cinco andares, hotspot e zoom, usando sprites ou primitivas pixeladas originais. Preservar navegabilidade React atual.
ETAPA C2 — Alta fidelidade: melhorar ambiente, fachada/cidade, móveis, monitores voltados aos personagens, iluminação 16-bit pixel, personagens e elevador com coerência de perspectiva. Fazer comparação lado a lado com referência.
ETAPA C3 — Animações por estado: loops individuais acionados por events/estado, com DEMO separado; não iniciar animação de trabalho sem evidência. Pausa e acessibilidade.
ETAPA C4 — Qualidade: testes, responsividade, perfis de consumo, capturas reais do navegador, documentação de limitações; garantir build web. Tauri/Windows só declarar validado se executado em Windows.

**Primeira rodada da sua tarefa:** começar pelo inventário, a configuração de build/testes e o menor incremento visual substancial: renderer em camadas e 5 pisos com navegação. Se o tempo da tarefa permitir, seguir para acabamento e animações. Não sacrificar qualidade, não criar simulações de sucesso e registrar claramente o que ficou pendente. É aceitável dividir em mais de um PR/turno do Codex.

## Critérios de aceite
1. `npm install`/`npm ci` concluído se o ambiente permitir; `npm run build`, `npm run test` e `npm run test:policy` executados com resultados reportados.
2. Cena composta **de verdade**, não screenshot como background; cinco pisos visíveis e acionáveis.
3. Monitores voltados para usuários (verificação de cada mesa).
4. Aplicação executada e capturas reais (p.ex. 1280x800 e 1440x900), incluindo vista geral e zoom; se browser não for disponível, explicitar e entregar testes alternativos, sem chamar imagem conceitual de captura.
5. Demonstração visual de idle/trabalhando/aguardando/erro/desconhecido; chefe fora de tarefas reais fica ausente.
6. Zoom e retorno pelo mouse e teclado; reduced motion e pausa ao ocultar.
7. Não tocar nos fluxos de autenticação, credenciais, MCP real, migração Drive, GitHub produção, Hostinger ou código de terceiros. Sem deploy, sem merge, sem exclusões externas.
8. Atualizar `docs/codex/RELATORIO_VISUAL_CODEX.md` com feito, alterado, testes, screenshots, pendências, artefatos e diferença visual restante frente à imagem aprovada.
9. Trabalhar na branch `agent/codex/visual-5-floors` ou equivalente isolada; concluir com commits/PR para revisão, **não mesclar em main**.

## Separação de responsabilidades
Eu (usuário) aprovo visuais, merge e publicação. Outro fluxo ChatGPT será responsável por MCP local, Drive, GitHub, Hostinger, KeePassXC, segurança e sincronização, em módulos separados. NÃO implemente essas áreas nesta tarefa, nem edite os arquivos centrais de autorização fora dos contratos exigidos para a cena.

Se algum arquivo do pacote estiver ausente, interrompa qualquer reescrita baseada em suposições e identifique exatamente o item faltante. Caso haja lacuna em uma ilustração, use um placeholder visual declaradamente provisório e continue as partes verificáveis.

**Saída esperada:** commits do frontend visual, relatório técnico em `docs/codex/RELATORIO_VISUAL_CODEX.md`, capturas do app executando e lista do que falta para aproximar a cena da referência 16 bits aprovada. Não afirmar conclusão até demonstrar visual real e testes.