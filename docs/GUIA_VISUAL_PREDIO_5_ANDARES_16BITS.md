# CLOUD WORKSPACE IA — GUIA VISUAL APROVADO (13/11/2026)

## Referência de qualidade
Imagem aprovada pelo usuário: painel isométrico da SEDE CLOUD WORKSPACE IA, cinco andares em 16-bit pixel art, fachada e elevador visíveis, personagens e status por andar. É uma referência visual estática, não a aplicação em execução.

## Composição
- Uma única tela de prédio inteiro em corte isométrico, com 5 pisos empilhados, acessíveis por clique.
- Painel lateral com os cinco setores, estados visuais e ações de acesso rápido.
- Interface escura em azul marinho, iluminação âmbar/ciano, estilo pixel art 16 bits.
- Detalhes de planta/mesas/janelas/elevador/racks, com perspectiva coerente e escala uniforme.
- Vista ampliada por andar com informações reais, alertas e controles; preservar retorno à vista geral.

## Setores
1 Recepção: projetos e visão geral.
2 Controle: personagem chefe apenas durante tarefas do Cloud Workspace.
3 Agentes IA: postos para aplicativos cadastrados, mesmo fora do Cloud Workspace.
4 Infraestrutura: MCP, processos, Playwright, recursos e testes.
5 Integrações: Drive, GitHub, Hostinger e sincronizações.

## Animações por evento
- Agente fechado: ausente; aberto sem trabalho confirmado: ocioso ou estado desconhecido com explicação.
- Agente trabalhando confirmado: entra/caminha/senta/digita conforme operação.
- Aguardando aprovação: movimento de espera discreto.
- Erro: personagem e setor sinalizam a ocorrência; nunca simular autorreparo sem evento real.
- Servidores: LEDs por conexão/atividade REAL, com cores verdes/amarelas/vermelhas/sem conexão onde aplicável.
- Chefe: só entra em cena se houver tarefa Cloud Workspace ativa confirmada; fica ausente em períodos sem atividade.
- Elevador: animação ambiental discreta, sem representar tarefas se não existirem.
- Recursos: economia de FPS e efeitos quando ocioso, pausa visual minimizado; serviço MCP permanece independente.

## Geometria de telas (obrigatória)
- Tela de cada monitor voltada fisicamente para a pessoa que o utiliza, com mesa e teclado orientados de maneira coerente.
- De ângulo isométrico do observador, muitas telas aparecerão de lado ou de costas.
- Se quiser destacar atividade no monitor, usar monitores laterais ou recortes de cena, não inverter fisicamente a tela para a câmera.

## Engenharia da cena
- Prédio dividido em pisos, fachada, elevador, estações de trabalho, personagens, dispositivos e efeitos.
- Spritesheets originais em pixel art de resolução base baixa, ampliação com nearest-neighbor; atalhos de zoom e pan.
- React para controles e status; PixiJS ou Canvas 2D leve para a cena; integração incremental ao Tauri.
- Tarefas do MCP não dependem do frame rate do escritório.

## Aceite visual
1. Visual geral comparável à referência aprovada, sem prometer reprodução pixel a pixel.
2. Cinco pisos legíveis em tela de notebook, sem texto minúsculo em modo ampliado.
3. Monitores orientados corretamente e personagens sem sobreposições incoerentes.
4. Animações demonstradas no aplicativo em execução, não GIF ilustrativo isolado.
5. Eventos e estados demonstrativos rotulados como DEMO.
6. Telemetria real introduzida somente após conectores verificados.

## Progresso
[Feito] Referência visual aprovada e regras documentadas.
[Pendente] Implementação da nova cena, sprites, animações, testes e compilação Windows.