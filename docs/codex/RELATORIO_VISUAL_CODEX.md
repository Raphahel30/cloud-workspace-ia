# Relatório visual Codex — Tarefa 03

Data: 16/11/2026. Repositório: Raphahel30/cloud-workspace-ia.
Branch: `agent/codex/visual-5-floors`, base `48100ed`.

**Resultado: incremento funcional validado no navegador. O acabamento premium da referência ainda não foi atingido. Windows/Tauri e hardware alvo não foram validados.** Sem merge, deploy ou integração real.

## Implementação e etapas

| Etapa | Resultado |
| --- | --- |
| C0 | Inspeção dos documentos/código/Tauri, dependências instaladas, lockfile e `npm ci` verificado. Diagnóstico em [C0_DIAGNOSTICO.md](C0_DIAGNOSTICO.md). |
| C1 | SVG de prédio inteiro substituído por cena PixiJS 8: cinco setores simultâneos, objetos separados, seleção pela geometria ou controles React, câmera suave, zoom e retorno. |
| C2 | Atlas original com 106 regiões, fontes editáveis e cenário noturno. Corrigidos teto, escala, oclusão de racks, monitores e enquadramento notebook a partir de capturas reais. Acabamento artístico final parcial. |
| C3 | Animações individuais, roupas, seis estados, transições de caminhada/mesa/saída, LEDs e elevador independentes; controles DEMO por agente. Pausa e movimento reduzido. |
| C4 | Build web, 30 testes automatizados no total, seis capturas reais e medições de renderização. PR para revisão humana; validação nativa Windows pendente. |

React permanece responsável por navegação, controles, foco, acessibilidade e informações. `Office.tsx` inicia o renderer assincronamente; `OfficeRenderer.ts` organiza geometria, camadas de arquitetura, móveis ordenados por profundidade, avatares, iluminação, elevador e cidade. Não foi criado outro aplicativo, nem alterada a arquitetura Tauri.

A referência PNG não é textura, tela de funcionamento ou asset de runtime. As peças vêm de `scripts/generate-assets.mjs`, com SVGs editáveis em `assets/source/`, PNG transparente e atlas JSON em `public/art/`. Regeneração executada e comparada com Git sem diferenças. Consulte [documentação da arte](../../assets/README.md).

O atlas tem quatro quadros de caminhada, quatro de digitação e dois de repouso, espera e alerta, além de pose desconhecida e cinco paletas de roupa. O teste raster verifica que os quadros obrigatórios têm pixels distintos. Personagens e equipamentos têm tempo/estado próprios; a simulação global pode ser sobrescrita individualmente no painel IA.

Nos postos reutilizados, personagem fica à esquerda olhando para a direita, teclado no tampo antes do monitor; a face estreita iluminada olha para o personagem e a placa larga traseira mostra ventilação. Não viramos a tela para o observador. A pose digitando alcança o teclado; há cadeira separada e pernas dobradas. A caminhada usa trajetos curtos no corredor frontal, ainda sem navegação completa com obstáculos.

## Estados e segurança

- Estado inicial **desconhecido**, sem conexões, tarefas reais ou importação de projetos.
- Indicador DEMO na barra fixa e na cena; ações globais/individuais explicitamente demonstrativas.
- Chefe aparece apenas no cenário de trabalho DEMO; nenhum estado recebido de produção é inventado.
- `ActorStates` é uma entrada visual por personagem. `fromEvidence` é um adaptador puro para uso futuro, baseado nas funções existentes de confiança/TTL; não abre conexão nem executa polling. Testes rejeitam trabalho inferido de processo aberto e atividade expirada.
- `src/core-contracts/agentState.ts` e `tests/agentState.node.test.mjs` estão idênticos à base, confirmado por `git diff --exit-code`.
- Não modificados `src-tauri/`, segurança de credenciais, MCP, Drive, GitHub de produto, KeePassXC ou Hostinger. Nenhum outro projeto acessado.
- Documento histórico dizia que GitHub ainda não existia. A autorização atual nomeia este repositório existente e permite branch/PR. Essa autorização não foi interpretada como permissão para integrações, merge ou deploy.

## Testes executados

Execução final após `npm ci`, em Linux, Node 24.22.1, npm 11.9.0, Chromium headless dedicado com ANGLE/SwiftShader. O Chrome pessoal não foi utilizado.

| Comando/check | Resultado final |
| --- | --- |
| `npm ci` | PASSOU: 135 pacotes, lockfile reproduzível no ambiente |
| `npm run build` | PASSOU: TypeScript sem emissão + Vite, 789 módulos |
| `npm test` | PASSOU: 15 testes Vitest em quatro arquivos |
| `npm run test:policy` | PASSOU: 3 testes Node originais |
| `npm run test:contracts` | PASSOU: 5 testes Node protegidos |
| `npm run test:e2e` | PASSOU: 7 testes, 0 falhas, 0 flaky, cerca de 41,5 s |
| `git diff --check` e diff dos dois arquivos protegidos | PASSOU |
| `npm run art:build` + diff de fontes/atlas | PASSOU: mesmos arquivos gerados |
| Instalador/execução Tauri Windows | NÃO EXECUTADO |

Playwright verifica cinco andares nas duas resoluções; limites da cena dentro do viewport; clique, seleção pela própria geometria, Enter, teclas 1–5, Escape, foco, zoom/retorno, estados individuais e globais, entrada/caminhada/digitação/ausência, pausa sem avanço de frames/tempo, preferência do sistema por movimento reduzido, suspensão com elemento invisível, ciclo Chromium frozen/active, resize notebook, desmontagem/remontagem com um único canvas e fallback acessível quando o chunk gráfico falha.

A suspensão por `document.visibilitychange` também está implementada. O teste de invisibilidade usa IntersectionObserver; o teste de congelamento usa o ciclo de vida Chromium. Isso **não comprova** minimização ou restauração da janela Tauri no Windows.

Falhas encontradas durante o trabalho não foram contadas como sucesso: coleta indevida de testes Node pelo Vitest, cena cortada, racks ocultos, controles escondidos perdendo foco, seleção acessível dos menus, transições paradas deslizando, import gráfico sem tratamento e corrida de foco por callback adiado. Foram reproduzidas e corrigidas antes da execução final. Revisão independente identificou os problemas de transição e import; releitura posterior sem novos P1/P2. Não foi realizada uma auditoria geral do produto.

Saída estruturada da execução: [e2e-results.json](e2e-results.json). Fontes dos testes em `tests/e2e/office.spec.ts`, `tests/visualBehavior.test.ts`, `tests/visualInputs.test.ts` e `tests/art.test.ts`.

## Capturas reais e comparação

Todas as imagens abaixo foram capturadas da aplicação React/PixiJS executando no Chromium, sem montagem sobre o PNG aprovado:

- [Visão geral 1280×800](screenshots/overview-1280x800.png).
- [Visão geral 1440×900](screenshots/overview-1440x900.png).
- [Setor IA ampliado 1280×800](screenshots/agents-zoom-1280x800.png).
- [Setor IA ampliado 1440×900](screenshots/agents-zoom-1440x900.png).
- [Trabalho DEMO 1440×900, reprodução pausada](screenshots/demo-working-1440x900.png).
- [Estados individuais DEMO 1440×900](screenshots/demo-independent-1440x900.png).

[Comparação lado a lado em HTML](COMPARACAO_VISUAL.html) distingue explicitamente referência estática e capturas do software.

Mantidos: prédio único em corte, ordem dos cinco pisos, fachada oeste, elevador leste, cidade noturna, pisos/móveis/equipamentos separados, luzes âmbar e ciano. A composição usa projeção rasa para legibilidade; não é reprodução pixel a pixel da imagem aprovada.

Diferenças restantes: vegetação pouco variada, sombras/reflexos simplificados, fachada com menos detalhes, interiores menos densos e personagens mais simples. Os painéis React mantêm textos legíveis no notebook; placas internas são pequenas na visão geral e exigem zoom. A identidade dos avatares e acabamento artesanal devem passar por nova revisão visual. Essas diferenças são visíveis nas capturas e impedem declarar o visual premium final concluído.

## Desempenho observado

Medições curtas, instrumentação do próprio renderer e `performance.memory`; números completos em [METRICAS_VISUAIS.json](METRICAS_VISUAIS.json).

| Amostra | Resultado |
| --- | --- |
| Atividade DEMO | 29 frames em 1273 ms: **22,78 FPS efetivos** |
| Repouso | 20 frames em 2022 ms: **9,89 FPS efetivos** |
| Heap JS no repouso | 26.824.622 bytes, aproximadamente **25,6 MiB** |
| Pausa / movimento reduzido | Contagem de frames e tempo visual permaneceram constantes após acomodação da câmera |
| Cena invisível | Contagem de frames permaneceu constante |

O limite configurado é 30 FPS em atividade e 10 FPS em repouso/desconhecido. O custo de desenho é descontado do intervalo. Em SwiftShader o alvo de 30 FPS não foi atingido nesta amostra; não extrapolar os resultados para GPU integrada Ryzen 5600G. Heap JS não é RAM total do processo, GPU, CPU ou energia. Não foram medidos consumo nativo Windows, VRAM, comportamento com duas IAs abertas ou build concorrente no hardware alvo.

Sem filtros pesados, renderização automática/ticker permanente ou serviço de núcleo vinculado a frames. Resolução interna acompanha o contêiner sem multiplicar por DPR; nearest-neighbor; atlas compartilhado em cache. Ao desmontar, timers/listeners/observers e aplicação/contexto Pixi são liberados; o cache de assets é reutilizado em novas montagens. Há renderizações pontuais para controles, resize e câmera, inclusive quando o movimento está pausado.

## Pendências e revisão humana

1. Rodada artística adicional para atingir a riqueza da referência, especialmente materiais, profundidade, sombras e vegetação. O atlas programático é um incremento original funcional, ainda inferior ao acabamento ilustrado aprovado.
2. Expandir as rotas curtas para entradas/saídas completas e colisões com mobiliário, preservando estados e posições quando interrompidas.
3. Medir FPS, CPU/RAM/energia e minimizar/restaurar em Windows no Ryzen 5600G; validar Tauri/WebView2, empacotamento e instalador no fluxo apropriado. Nada disso foi comprovado pelo build web.
4. Conexões reais permanecem responsabilidade do outro fluxo; esta entrega somente define a fronteira visual para eventos futuros.
5. Aprovação artística e revisão do PR antes de qualquer integração na main. Nenhum merge ou deploy efetuado.

Histórico de implementação: commits desta branch em relação a `origin/main` (`git log --oneline origin/main..HEAD`), incluindo preparação `cd5a9be` e renderer/atlas `0c3c3b6`.

PR de revisão: URL registrada após abertura na entrega desta branch.
