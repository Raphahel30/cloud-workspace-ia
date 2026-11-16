# C0 — diagnóstico Tarefa 03 (16/11/2026)

Base verificada: `48100ed`, mesma base de main e da branch remota `agent/codex/visual-5-floors`. Checkout obtido exclusivamente de Raphahel30/cloud-workspace-ia. Não havia checkout no workspace inicial. Nenhum workflow `.github` foi encontrado na base.

Lidos AGENTS, README, prompts 01/02, guia visual, Plano Mestre integral, registro 1D e PNG aprovado. Inspecionados App, Office, FloorDetails, dados, políticas, contratos e configuração Tauri (Vite 1420, janela 1250×800 mínimo 940×620, bundle desabilitado). Não modificar configurações de segurança ou integrações neste fluxo.

Base: SVG carregado por fetch/innerHTML, sem atlas/Pixi, sem lockfile e sem validação browser registrada. Manter componentes/políticas existentes; substituir só o renderer e estender controles demonstrativos.

Ambiente: Linux, Node 24.22.1, npm 11.9.0, Chromium `/usr/bin/chromium`. Lock resolve React 19.3.1, TypeScript 5.9.3, Vite 6.4.6, Tauri 2.12.5, PixiJS 8.23.0, Vitest 3.2.7, Playwright 1.65.1 e sharp 0.35.5. `npm ci` concluído usando o lockfile gerado.

Problemas observados e tratados:

- Git no sandbox não alcançava o proxy local. Clone e operações de rede autorizadas funcionaram com a execução fora do sandbox; nenhuma credencial foi solicitada ou exposta.
- Servidor Vite no sandbox retornava EPERM no bind local. Servidor e Chromium foram executados fora desse limite para testes locais.
- `npm test` da base: seis testes Vitest passaram, mas dois arquivos node:test foram coletados indevidamente e causaram “No test suite found”. Configuração Vitest agora inclui somente `tests/**/*.test.ts`; testes Node originais executam nos comandos separados `test:policy` e `test:contracts`.
- Primeira captura: recorte vertical no notebook e oclusão de racks por lajes; corrigidos altura da cena, câmera, teto e posição dos objetos. Primeira navegação: foco perdido quando botões eram escondidos no zoom; controles passaram a permanecer disponíveis.
- Revisão independente: transições paradas deslizavam e falha de import assíncrono não chegava ao fallback. Ambos reproduzidos por testes antes da correção e corrigidos. Revisão posterior sem novos P1/P2.

Não são impedimentos resolvidos: validação nativa Windows e acabamento artístico final premium. Ver relatório final e capturas reais.
