# Arte original — Cloud Workspace IA, rodada premium 2

Fontes canônicas: `scripts/art/premium.mjs` (desenho) e `scripts/generate-assets.mjs` (exportação/packing). `npm run art:build` gera 215 SVGs editáveis em `assets/source/`, PNG transparente e atlas JSON PixiJS em `public/art/`. Todas as formas são originais deste projeto. A referência aprovada nunca foi recortada, convertida ou usada como textura.

As fontes mantêm uma tela 128×128, com pés dos personagens em (32,120). O exportador recorta margens transparentes e preserva `sourceSize` e `spriteSourceSize`: poses continuam alinhadas apesar de tamanhos empacotados diferentes. Atlas atual: 1024×964, aproximadamente 3,77 MiB de pixels RGBA sem compressão, comparados aos 7 MiB da primeira rodada. Isso não mede RAM ou VRAM totais. Teste verifica origem, limites, ausência de sobreposição, quadros distintos e orçamento de textura.

Personagens têm cabelo em camadas, rosto, ouvido/headset, lapela, dobras de roupa, pernas e calçados. Cinco paletas preservam a pele. Há quatro quadros de caminhada lateral, quatro posteriores, quatro de digitação e dois para sentar/levantar, repouso, espera, alerta e desconhecido; poses sentadas de repouso/espera/alerta/desconhecido são independentes. Piscada de repouso é breve; posição dos pés não acompanha a animação do corpo.

Mesa, teclado, monitor e cadeira agora são objetos distintos. Teclado fica sobre o tampo, antes do monitor. O personagem está à esquerda, olhando à direita: face estreita iluminada do monitor olha para ele; placa larga com ventilação é o verso. Mãos da pose de digitação foram ajustadas ao teclado na captura ampliada.

Árvores, palmeiras/folhagens, cercas vivas, recepção, café, armários, materiais, painéis e luzes pré-renderizadas são reutilizáveis. Luzes não precisam de filtros/shaders dinâmicos. Arquitetura usa oito caches seletivos densos; atores, cadeiras, teclados, monitores, LEDs e elevador continuam separados. Fachadas finas e vegetação esparsa permanecem geometria/sprites para evitar caches com grandes áreas transparentes.

A cena é uma evolução da arte programática original. Difere da referência ilustrada em densidade, sombras e expressividade; aprovação artística final permanece humana. Os SVGs históricos `public/building-*` não são usados no runtime PixiJS.
