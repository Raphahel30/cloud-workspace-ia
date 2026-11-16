# R03 — proveniência, estado e critérios de aprovação

Estado: duas PROPOSTAS ESTÁTICAS NÃO APROVADAS, geradas para esta tarefa com a ferramenta image_gen. Não são capturas de aplicativo, spritesheets, arquivos em camadas ou comprovação de desempenho.

## Fontes e método

- Referência fornecida no próprio projeto: `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png`. É a direção aprovada e permanece como tal; não foi substituída por outro estilo.
- Prédio inteiro: geração ilustrada guiada pela referência, exportada em 1536×1024. Prompt completo em `PROMPT_01_PREDIO.md`.
- Andar 03: geração ilustrada guiada pela proposta do prédio e pela referência, exportada em 1536×1024. Prompt completo em `PROMPT_02_ANDAR_03.md`.
- Não foram baixados/incorporados pacotes de assets externos, bancos de imagens ou obras de outros artistas. Não atribuímos licença CC0 ou similar a materiais de terceiros. A origem de cada imagem é discriminada no manifesto.
- As capturas reais copiadas para comparação são da rodada técnica anterior, commit `5c23397`. Nada foi recapturado como se as propostas estivessem implementadas.
- A comparação HTML exibe os arquivos de imagem separadamente e sem retoques. O PNG/PDF da comparação são exportações dessa página documental.

## O que avaliar agora

1. Composição do prédio inteiro, cinco níveis, integração da fachada, elevador e cenário noturno; aproveitamento da área.
2. Proximidade do estilo pixel art ilustrado, riqueza dos materiais, reflexos, luz âmbar/ciano e vegetação em relação à referência original.
3. Expressividade/roupas dos personagens e mobiliário no andar ampliado; consistência entre as duas propostas.
4. Aceitabilidade da direção como alvo de produção de peças independentes, em vez de tentar atingir o resultado só com primitivas SVG do protótipo.

## Limites explícitos e etapa seguinte

Estes PNGs são pinturas conceituais planas. Não fornecem automaticamente camadas ocultas, perspectiva/escala exata de atlas, alpha limpo, pivôs ou quadros animados coerentes. Uma aprovação artística não equivalerá a aprovação de implementação ou de desempenho.

Somente após aprovação explícita: fechar paleta/proporções; redesenhar ou gerar famílias pequenas de peças independentes (arquitetura, móveis, vidro/luz, personagens, equipamentos); revisar consistência e limpeza de alpha/pivôs; produzir arquivos-fonte editáveis e atlas; animar uma seção no PixiJS existente; validar no navegador antes de expandir. Não recortar automaticamente o prédio inteiro para fingir cenário funcional e não carregar estas propostas como fundo do runtime.

O protótipo React/PixiJS, zoom, teclado, DEMO, testes, contratos e integração de estados permanecem intactos. Nenhuma expansão de sprites foi realizada nesta rodada. A aprovação humana de AMBAS as propostas continua pendente.
