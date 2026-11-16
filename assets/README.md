# Arte original — Cloud Workspace IA

Todas as formas e personagens em `source/*.svg` foram desenhados por código para este projeto em `scripts/generate-assets.mjs`, sem material gráfico de terceiros. Nenhuma região da imagem de referência foi recortada, rasterizada ou usada como textura. A referência permanece somente em docs/referencias.

`npm run art:build` recria SVGs editáveis, `public/art/office.png` (106 regiões transparentes 128×128) e atlas PixiJS JSON. Editar o gerador é o caminho canônico para alterações reproduzíveis; SVGs podem ser abertos em editores vetoriais. Células mantêm a origem no canto inferior esquerdo e escala-base consistente. Texturas usam nearest-neighbor. Fontes da UI e placas usam monospace/system-ui do sistema, sem downloads externos.

Quadros por paleta: walk=4, type=4, idle=2, wait=2, error=2, unknown=2; cinco paletas de roupa além da base. Pele não recebe tint de roupa. Equipamentos são sprites separados, LEDs/luz/elevador são objetos Pixi independentes. Piso, paredes, fachadas, cidade e telhado são geometria editável no renderer, não uma imagem do prédio.

Geometria da estação: personagem à esquerda da mesa, olhando para a direita; teclado no tampo, antes do monitor. A face estreita iluminada do monitor olha à esquerda para o personagem; a placa larga visível ao observador é o verso com ventilação. O mesmo objeto reutilizado preserva a regra em todos os postos.

Limitações: perspectiva dimétrica rasa com construção pixelada, sem textura artesanal final; sprites humanos ainda simplificados. Não declarar qualidade idêntica à referência. Os SVGs antigos de `public/building-*` permanecem como histórico da prévia anterior, mas não são usados pela cena PixiJS.
