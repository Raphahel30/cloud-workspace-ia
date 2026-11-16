# Preparação do Codex Cloud — Cloud Workspace IA

Repositório privado: https://github.com/Raphahel30/cloud-workspace-ia

## Configuração mínima
1. Na web ou aplicativo de computador do Codex, crie/publique um ambiente e selecione o repositório `Raphahel30/cloud-workspace-ia` e a branch principal `main` como origem.
2. Use uma imagem Linux com Node.js 22+ e npm. Confirme `node --version` e `npm --version`.
3. Com acesso à rede permitido **somente durante a instalação se necessário**, execute `npm install`. O repositório ainda não possui `package-lock.json`; após instalar, mantenha um lockfile no PR para builds reproduzíveis.
4. Faça `npm run build && npm run test && npm run test:policy`. Se algum comando falhar, documente a causa em vez de declarar sucesso.
5. Na tarefa visual, Codex poderá instalar `pixi.js` (renderer) e `@playwright/test` (testes/capturas); rode `npx playwright install chromium` após instalar a dependência. Bibliotecas opcionais: `sharp` e `pixelmatch` para imagem; LibreSprite para exportar spritesheets originais. **Não instale todas sem necessidade**.
6. Testes Tauri/Windows precisam de executor Windows separado; um build web Linux não comprova o funcionamento do instalador Windows.
7. A imagem aprovada já está no repositório em `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png`; não depender de Google Drive.
8. Adote branches separadas para trabalhos Codex e ChatGPT. Proibido merge/deploy automático.

## Recomendação de ferramentas
**Essenciais** — Git/GitHub, Node 22+, npm, React/TypeScript/Vite, PixiJS 8, Playwright + Chromium, Vitest; Tauri 2 mantido na base.

**Opcional para qualidade artística** — LibreSprite (software livre) ou editor pixel art equivalente para spritesheets, `sharp` para processar imagens e `pixelmatch` para análise técnica. Materiais precisam ser originais ou com licença compatível. Não exigir pagamento de ferramenta de arte para começar.

**Critério objetivo de revisão** — screenshot real do app em 1280×800 e 1440×900, imagem lado a lado com a referência, teste de clique/zoom, testes dos estados e relato medido de desempenho. O PixiJS constrói as animações; a qualidade do desenho exige produção/revisão de sprites, não só biblioteca.

## Primeira mensagem para Codex
Leia `AGENTS.md` e `docs/codex/CODEX_PROMPT_02_GITHUB.md`. Implemente a tarefa descrita neste último, na sua branch isolada, sem merge nem deploy. Capture screenshots reais do app e atualize o relatório.