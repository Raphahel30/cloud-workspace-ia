# Histórico do desenvolvimento

## 0.2.0-alpha.1 — 2026-11-13 · Fase 1B (prévia visual)
- Reformulada a tela principal React: sidebar, status, escritório, salas clicáveis e eventos.
- Criadas cenas em pixel art isométrico leve: repouso, trabalho e alerta.
- Adicionadas animações CSS locais para sono, digitação e LEDs.
- Criada prévia HTML que compartilha CSS e assets do app React.
- Regras de segurança e telemetria não foram flexibilizadas.
- **Mudança provisória de implementação:** PixiJS primitivo foi substituído por SVG/CSS para a cena inicial, visando menor custo de recursos. A aprovação visual e os testes de desempenho definirão a tecnologia final.
- Build Windows e testes Vitest: pendentes, dependências não instaladas neste ambiente.

## 0.1.0-alpha.1 — 2026-11-13 · Fase 1A
- Criado scaffold Tauri/React e primeiros contratos de telemetria e política.
- Criado escritório isométrico primitivo via PixiJS (provisório).

## 0.3.0-alpha.1 — Fase 1C (2026-11-13)
- Prédio de 5 andares, scene assets individualizados (`building-*.svg`) e interatividade preliminar.
- Estados demonstrativos por CSS, sem GIF e sem conexão real com agentes.
- Escopo da etapa: estrutura, não sprites finais nem telemetria.


## 2026-11-16 — 0.4.0-alpha.1 · Fase 1D (protótipo, sem GIF)
- Cena SVG original com 5 andares e grupos independentes preservada; assets de estados recriados.
- Animações programáticas separadas: caminhar na recepção, digitar, respirar/esperar, plantas, LEDs e elevador.
- Controle para pausar/retomar movimentos com opção para reduzir movimento do sistema.
- SVG do projeto embutido na composição React: evita GIF e permite controle de reprodução.
- Painel novo FloorDetails com personagens demonstrativos e lista dos componentes previstos.
- Simulação explicitamente sinalizada; nenhuma integração real ativada ou declarada operacional.
- Testes unitários de política passaram; validação de estrutura SVG e sintaxe TS/TSX passou.
- Bloqueador: instalação npm e compilação Tauri/React não executadas por falta de acesso ao registro de pacotes.
- Bloqueador: automação Chromium desta sessão bloqueou navegação da prévia local; cliques não confirmados em execução real.