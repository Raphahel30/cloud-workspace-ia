# AGENTS.md — Cloud Workspace IA (diretrizes obrigatórias do repositório)

## Produto
Aplicativo Windows (Tauri 2 + React/TypeScript + Vite) para organizar projetos no Google Drive, integrar agentes de IA via MCP e GitHub/Hostinger, com interface de **prédio isométrico pixel art 16 bits** de cinco andares.

## Escopo deste fluxo Codex
Você é o agente encarregado **somente do FRONTEND VISUAL E ANIMAÇÕES**. Leia:
- `docs/codex/CODEX_PROMPT_01_VISUAL.md` (tarefa)
- `docs/codex/GUIA_VISUAL_APROVADO.md` (regras de arte)
- `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png` (referência principal)
- `docs/codex/PLANO_MESTRE_v2_0_REFERENCIA.txt` (regras vinculantes)
- `docs/FASE_1D_REGISTRO.md` e `README.md` (base atual)

## Proibições
- Não criar outro produto nem reescrever o software do zero. Refatorar por módulos conservando os contratos.
- Não alterar projetos externos; este repositório é EXCLUSIVO do Cloud Workspace IA.
- Não modificar código de credenciais, MCP, Hostinger, GitHub, integração de produção ou limpeza sem solicitação posterior.
- Não modificar `src/core-contracts/agentState.ts` e `tests/agentState.node.test.mjs`: esses arquivos são de outro fluxo de trabalho e só devem ser consumidos como contrato.
- Não acessar credenciais; nunca registrar `.env`, tokens, `.kdbx`, chaves, senhas ou usuários reais nos logs.
- Não fazer merge, publicar ou executar deploy; exigir autorização explícita.
- Trabalhar apenas em branch isolada `agent/codex/visual-5-floors` ou outra `agent/codex/*` autorizada, nunca em branch ligada à produção.
- Não usar GIF, vídeo, WebP animado nem PNG única como mecanismo da cena. A referência é SOMENTE design. Renderizar camadas/sprites e animações controladas por estados reais ou por DEMO claramente sinalizada.
- Não fingir telemetria. Se o backend não estiver conectado, mostrar DESCONHECIDO ou DEMO.
- Não marcar teste como passado se não executado. Diferenciar build web, teste visual no navegador e build Windows/Tauri.

## Regras de implementação visual
- Cinco pisos na mesma vista geral: 01 Recepção, 02 Chefe/Controle, 03 Agentes IA, 04 MCP/Testes, 05 Servidores/Integrações.
- Monitores **com a tela de frente para o personagem**, mesmo quando a câmera vê o verso do monitor; evitar monitores olhando para o usuário.
- Personagens são próprios do projeto e ficam ausentes, ociosos, trabalhando, aguardando ou em alerta conforme dados confirmados; estado de desconhecido explicitado.
- Chefe só aparece em tarefa confirmada do Cloud Workspace; em DEMO, a simulação precisa estar sinalizada.
- Cena com camadas independentes: fachada, fundo, piso, paredes, móveis, monitores, avatares, luz, elevador, LEDs e partículas. Profundidade e oclusão coerentes.
- Usar pixelated/nearest-neighbor, resolução interna adaptativa, zoom por piso, animações de sprites não GIFs.
- Respeitar `prefers-reduced-motion`, navegação por teclado e pausa de renderização quando janela/aba não visível.
- Priorizar computador Ryzen 5 5600G, 16GB RAM, vídeo integrado; sem WebGL pesado desnecessário.
- Não editar diretamente o Drive em streaming como Git worktree; GitHub é o repositório de trabalho e Drive é arquivo principal e backup, sincronizado em etapa aprovada.

## Qualidade e entrega
- Antes de codificar, conferir `npm`/`node`, dependências e testes da base.
- Adicionar/ajustar testes; executar `npm run build`, `npm run test`, `npm run test:policy` onde configurados e relatar falhas reais.
- Capturar screenshots da aplicação **executando**, em 1280x800 e 1440x900; se não for possível, explicar e não substituí-las por conceito gerado.
- Escrever ao fim `docs/codex/RELATORIO_VISUAL_CODEX.md`: o que fez, o que mudou, testes, capturas, pendências e indicação clara do que é DEMO.
- Manter alterações em commits/PR da branch de agente; nenhuma publicação ou merge.