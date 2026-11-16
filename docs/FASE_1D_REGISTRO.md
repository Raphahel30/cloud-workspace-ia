# Fase 1D — Movimentos independentes e inspeção de andares
Data: 16/11/2026
Estado: código preparado e testes estáticos aprovados; interface final e instalação PENDENTES.

## Implementado
1. ScenePolicy tipado, com chefe apenas em tarefa do Cloud Workspace e agentes sem conexão sinalizados como não verificados.
2. Animações CSS independentes em sprites SVG: digitação, caminhada na recepção, espera, plantas, rack LEDs, elevador, monitor edge.
3. Office.tsx: cenário SVG local inline, pausa das animações e hotspots por andar com zoom e retorno.
4. App.tsx: controles de cena e Pausar/Retomar; FloorDetails com detalhes por setor e personagens demonstrativos.
5. Prévia HTML de referência sem dependências, com controles de estado, navegação, zoom e pausa.
6. Regras `prefers-reduced-motion` e foco visível nos botões.

## Alterações de ideia
- Nenhuma mudança no visual aprovado do prédio cinco andares em 16 bits.
- Segue sem GIF de fundo; base vetorial animada por elemento e a posterior migração para sprites reais.
- As imagens renderizadas são PRÉVIAS do SVG atual, não capturas de aplicativo Windows compilado.

## Testes
- Node test de policy: 3 testes PASSARAM.
- Estrutura XML: 3 cenas válidas e 5 andares por cena.
- TS/TSX sintaxe: 5 arquivos verificados sem problemas de parse.
- JS da prévia: verificação de sintaxe passou.
- npm install/build: NÃO executáveis neste ambiente (`EAI_AGAIN` acesso registry).
- Chromium/Playwright: navegação a servidor local bloqueada com `ERR_BLOCKED_BY_ADMINISTRATOR`; sem validação visual interativa de clique aqui.

## Pendente
- Validar instalação e compilação Tauri/React, CSS e cliques em navegador real.
- Melhorar profundidade e pixel-art do prédio: chegar mais próximo da referência aprovada, ilustrar cada andar com spritesets consistentes.
- Verificar integração MCP, Drive para computador, GitHub e Hostinger no Windows com autorização.
- Implementar estados reais observáveis e transmissão segura de eventos, sem inferir trabalho por simples processo aberto.

## Regra de continuidade
Não marcar esta fase como concluída em produção antes da validação em runtime. Manter o ambiente demonstrativo totalmente isolado de serviços reais.