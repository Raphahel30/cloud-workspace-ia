# Cloud Workspace IA — cena visual Tarefa 03

Aplicativo existente em Tauri 2, React 19, TypeScript e Vite. A interface agora renderiza um prédio de cinco andares com **PixiJS 8**, sprites originais e objetos independentes. Todos os andares cabem na visão geral em 1280×800 e 1440×900; seleção por clique, teclado 1–5 e retorno por Escape.

**DEMO permanente. Sem telemetria real ou integrações.** Estado inicial desconhecido; os controles simulam ausência, repouso, trabalho, aprovação e alerta. No painel do andar IA é possível simular estados individuais. Chefe só aparece no cenário de trabalho explicitamente DEMO. O contrato de evidências e seus testes permanecem intactos.

```sh
npm ci
npm run dev
# http://127.0.0.1:1420
npm run build
npm test
npm run test:policy
npm run test:contracts
```

Node 24 foi usado nesta validação. `test:policy` e `test:contracts` usam o suporte Node a strip-types. O lockfile deve ser preservado.

```sh
npm run art:build
# Chromium instalado em /usr/bin/chromium neste Cloud workspace
npm run test:e2e
# Em outro ambiente: CHROMIUM_PATH=/caminho/chromium npm run test:e2e
```

Iniciar `npm run dev` antes do Playwright. Para instalar um navegador dedicado quando necessário: `npx playwright install chromium`, ajustando CHROMIUM_PATH. Não usa perfil pessoal do Chrome. Fontes e atlas: [assets/README.md](assets/README.md).

A cena reduz a 10 FPS em repouso/desconhecido, limita a 30 FPS em atividade, pausa quando invisível e oferece movimento reduzido. O tempo visual não executa serviços de núcleo. Falha WebGL mostra mensagem acessível; não substitui a cena pela referência.

Resultados, capturas reais, métricas e pendências: [relatório visual](docs/codex/RELATORIO_VISUAL_CODEX.md). Comparação lado a lado: [HTML local](docs/codex/COMPARACAO_VISUAL.html).

O acabamento ainda difere da referência premium em sombreamento, vegetação, densidade e detalhes dos personagens. **Build web Linux não valida Tauri, instalador ou desempenho no Windows.** A configuração Tauri e módulos de integração não foram modificados. Sem merge ou deploy.
