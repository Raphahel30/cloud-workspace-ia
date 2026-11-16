# FASE 1C — PRÉDIO DE CINCO ANDARES (base funcional)
Data: 13/11/2026. Status: **implementação visual inicial — avaliação pendente**.

## Feito
- Esqueleto visual renderizável 16 bits em SVG, com pisos e elementos independentes, criado por `generate_building.py`.
- Cinco camadas/setores: recepção, chefe/controle, IA, MCP/testes, servidores/integrações.
- Três estados DEMO (`idle`, `active`, `alert`), CSS para LEDs, movimentos leves e digitação, suporte a `prefers-reduced-motion`.
- Postos de trabalho desenhados exibindo o **verso** dos monitores para a câmera, com telas orientadas aos personagens.
- Seleção e ampliação por andar no componente React; navegação lateral; botão para voltar à visão geral.
- Prévia funcional independente em `preview/index.html`, testada com Chromium por `page.set_content`; imagens capturadas são da prévia, não build Tauri.
- Não há qualquer GIF ou IA externa acionada pelo aplicativo.

## Mudança autorizada
- Abandonado o uso de GIF. Arquitetura visual composta por elementos independentes e animações CSS, convertíveis para sprite sheets PixiJS.
- Nova arte substitui três salas horizontais por prédio vertical de cinco andares.

## Testes
- Parsing XML dos três SVG: **PASSOU**.
- Chromium renderizou os três estados por `set_content`, com imagem de largura natural 1360: **PASSOU**.
- Interação de seleção de estados na prévia HTML: **PASSOU**.
- Build React/Vite e executável Tauri Windows: **NÃO EXECUTADOS** (dependências NPM indisponíveis neste ambiente).
- Validação do clique/zoom React: **PENDENTE** até execução do aplicativo compilado.

## Limitações e próximos passos
- A arte atual é protótipo geométrico de baixa densidade, ainda muito aquém da referência ilustrada aprovada. É necessária arte definitiva por spritesheet 16 bits e animações por personagem.
- O cenário ainda usa SVG + CSS em vez de PixiJS; o motor de sprites seguirá após validação da qualidade visual.
- Implementar personagens identificados com logos dos agentes e ajustar colocação das cadeiras.
- Nenhum serviço, integração, credencial, auditoria ou ação no Windows foi executado.
- Sem GitHub, sem deploy Hostinger, sem exclusões; o plano continua válido.