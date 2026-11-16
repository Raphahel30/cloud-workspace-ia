# Cloud Workspace IA — protótipo de desenvolvimento v0.4.0-alpha.1

Aplicativo Windows planejado em Tauri + React/TypeScript, com sede de cinco andares em pixel art isométrico 16 bits.

## Implementado nesta fase
- Prédio de 5 andares: recepção, chefe, IAs, MCP/testes, servidores/integrações.
- Animações vetoriais independentes (sem GIF): digitação, caminhada, servidores, plantas e elevador.
- Botões de foco/zoom por andar, cena demonstrativa e botão Pausar/Retomar.
- Componente de detalhes por andar, personagens demonstrativos e avisos de telemetria não verificada.
- Política `scenePolicy.ts` com checagens de segurança para o chefe e os rótulos de status.

**Atenção:** As cenas são demonstrativas, não provam funcionamento de IA, Windows, MCP ou hospedagem.

## Como executar quando as dependências estiverem disponíveis

```bash
npm install
npm run test:policy
npm run build
npm run dev
```

Para instalar a versão Tauri no Windows, use o ambiente Windows configurado com Rust e WebView2 depois da auditoria autorizada.

## Prévia sem bibliotecas
`preview/index.html` com `public/building-{idle,active,alert}.svg` pode ser servido por um servidor HTTP local. A prévia HTML contém os mesmos ativos SVG e simula seleção de andar, zoom, pausa e estado visual.

## Testes reais desta etapa
- 3 testes Node de política: PASSOU.
- SVG XML: 3 de 3 válidos, com cinco andares cada.
- 5 arquivos TS/TSX: sintaxe válida via `typescript.transpileModule`.
- Prévia HTML: JavaScript válido via `node --check`.
- **PENDENTE:** build npm/Vite/Tauri, testes React completos e validação browser. O registry npm estava inacessível (`EAI_AGAIN`) e a navegação do Chromium local foi bloqueada por política de ambiente.

## Limitações de visual
O SVG vetorial atual é uma **estrutura interativa provisória**, inferior ao detalhamento da arte de referência aprovada. As próximas fases substituirão peças e personagens por spritesets de qualidade superior sem recorrer a GIF de cena inteira.

O Google Drive mantém o código-fonte e o registro da fase. Nenhum repositório Github foi criado, nenhum site publicado, e nenhuma alteração em outros projetos foi feita.