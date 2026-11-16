# GUIA DE ENTREGA AO CODEX CLOUD — CLOUD WORKSPACE IA

## Situação real (16/11/2026)
- Código existente: Fase 1D, versão v0.4.0-alpha.1 (protótipo Tauri/React).
- Arte-alvo: referência do prédio com 5 andares e pixel art 16-bit, APROVADA pelo usuário.
- Implementação visual atual: SVG simples e animações CSS demonstrativas; qualidade final ainda NÃO atingida.
- Não há repositório GitHub confirmado para este projeto; este pacote não cria repositórios.
- Não há acesso presumido do Codex Cloud ao Google Drive nem ao computador Windows.
- Não há conectores reais de MCP, KeePassXC ou Hostinger em funcionamento no aplicativo.
- Este pacote contém as fontes e a imagem de referência para importar para repositório GitHub PRIVADO.

## Pastas do Google Drive já verificadas (nomes exatos)
- `Meu Drive/Projetos Code/`
  - https://drive.google.com/drive/folders/1Ks_TJljjq-p1JRsDUQ9OTSpDON_vPj5R
- `Meu Drive/Projetos Code/00 - Documentacao Cloud Workspace IA/`
  - `01_HISTORICO_DA_CONVERSA_E_CONTEXTO.txt`
  - `02_PLANO_MESTRE_E_REGRAS_v2_0.txt`
  - `03_STATUS_E_REGISTRO_DE_ETAPAS.txt`
  - `04_INSTRUCOES_PARA_NOVA_CONVERSA.txt`
- `Meu Drive/Projetos Code/01 - Projetos/cloud-workspace-ia/`
  - https://drive.google.com/drive/folders/113274Ty9gs3tHEPVtfEIXMZAt4Dm9J0X
  - `Arquivos Navegaveis/` = fonte mais recente (sem Git local ativo)
  - `Pacotes/Cloud_Workspace_IA_Fase1D_Fonte.zip` = snapshot do código original no início do handoff
  - `Previa Visual para Aprovacao/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png` = alvo artístico
  - https://drive.google.com/drive/folders/18RbrDIRyMolJjSs32BpXqP6EKep9r3ej
- `Arquivos Navegaveis/src/` = React/TypeScript.
- `Arquivos Navegaveis/src/components/` = `Office.tsx`, `FloorDetails.tsx`.
- `Arquivos Navegaveis/src/data/` = `floors.ts`, `demo.ts`.
- `Arquivos Navegaveis/src/lib/` = `scenePolicy.ts`, `policy.ts`, `telemetry.ts`, `types.ts`.
- `Arquivos Navegaveis/public/` = `building-idle.svg`, `building-active.svg`, `building-alert.svg`.
- `Arquivos Navegaveis/src-tauri/` = Rust, `tauri.conf.json`, capabilities.
- `Arquivos Navegaveis/docs/`, `tests/`, `preview/` = documentação, testes e prévia.
- `Arquivos Navegaveis/_historico_Fase1A`, `.../_historico_Fase1B`, `.../_historico_Fase1C` = versões anteriores.

## Estrutura do ZIP de passagem
O arquivo `Cloud_Workspace_IA_PARA_CODEX_CLOUD_2026-11-16.zip` contém uma pasta-raiz `cloud-workspace-ia/`.
É essa pasta que deve virar a raiz do repositório no GitHub; NÃO publicar uma pasta extra acima.
Além das fontes da Fase 1D, inclui:
- `AGENTS.md` (regras do Codex)
- `docs/codex/CODEX_PROMPT_01_VISUAL.md` (prompt pronto)
- `docs/codex/GUIA_VISUAL_APROVADO.md` (design)
- `docs/codex/PLANO_MESTRE_v2_0_REFERENCIA.txt` (decisões)
- `docs/codex/STATUS_PRE_HANDOFF_SNAPSHOT.txt` (status congelado no início)
- `docs/referencias/REFERENCIA_APROVADA_PREDIO_5_ANDARES_16BITS.png` (imagem embutida)
- `src/core-contracts/agentState.ts` + `tests/agentState.node.test.mjs` (contratos de estados preparados pelo ChatGPT; Codex NÃO deve alterá-los).

## Passo a passo para o Codex Cloud
1. Criar um **novo repositório PRIVADO** GitHub, somente depois de autorização do usuário; nome sugerido `cloud-workspace-ia`. Não conectar repositórios de PetSiStore, OptiGrill ou outros projetos.
2. Extrair o ZIP e enviar o **conteúdo interno** de `cloud-workspace-ia/` para a raiz do repositório; não enviar `.env`, node_modules, chaves nem `.kdbx`. O `.gitignore` está incluso.
3. No Codex Cloud, em desktop ou web, criar e publicar um ambiente para ESSE repositório e conceder acesso ao repositório privado. Não presuma que a pasta Drive esteja montada na máquina do Codex.
4. Para configuração, o projeto usa Node + npm. Executar `npm install` (não há `package-lock.json` na base atual; gerar lockfile). Depois `npm run build`, `npm run test`, `npm run test:policy`. Para os contratos isolados: `node --experimental-strip-types --test tests/agentState.node.test.mjs` em Node 22 compatível.
5. Ao criar a tarefa Codex, colar o texto completo de `docs/codex/CODEX_PROMPT_01_VISUAL.md` (também está no TXT separado). Selecionar branch de trabalho `agent/codex/visual-5-floors` ou equivalente.
6. Solicitar commit/PR para revisão. O Codex **não faz merge/deploy**. Ao terminar a etapa, trazer o link do PR para este ChatGPT revisar a integração e atualizar o Drive **após aprovação**.
7. Só fazer build instalável Windows quando houver ambiente Windows adequado; Codex Cloud Linux pode compilar frontend e tirar screenshots no Chromium, mas não provar instalador Windows.

## Rotina de coordenação
- Codex: visual, renderização, sprites, animação, zoom e capturas.
- ChatGPT: contratos de execução, MCP, armazenamento Drive, sincronização, cofre, GitHub/Hostinger, auditoria, status.
- Evitar ambos editarem `src/App.tsx` ao mesmo tempo sem combinar integração. O núcleo prepara módulos separados e fornece contratos; o Codex consome, não modifica.
- Drive = arquivo mestre persistente e backups; GitHub = código, branches e PRs; nenhum merge sem usuário.