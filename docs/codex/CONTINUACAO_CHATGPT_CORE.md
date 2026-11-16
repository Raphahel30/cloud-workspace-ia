# Cloud Workspace IA — Continuação do núcleo com ChatGPT (16/11/2026)

## Divisão explícita
- **Codex Cloud (branch `agent/codex/visual-5-floors`)**: prédio 5 andares 16 bits, sprites, renderer PixiJS/Canvas, câmera, UI, animações, screenshots, teste visual.
- **ChatGPT (arquivos e módulos separados; nenhuma tarefa automática em segundo plano)**: contratos de eventos e estados, serviço MCP local, gerenciador Drive, GitHub, cofres, Hostinger, Playwright, auditoria de projetos e segurança.

## Já iniciado no núcleo
- `src/core-contracts/agentState.ts`: estado derivado de evidência confirmada; não confunde processo aberto com tarefa real; chefe só visível em tarefa verificada.
- `tests/agentState.node.test.mjs`: 5 testes reais executados com Node 22; PASSARAM.
- **Não** foram conectados processos reais do Windows, MCP ou serviços da nuvem.

## Próximas entregas que NÃO devem modificar a cena do Codex
CORE-01: modelo de projetos, diretórios e snapshots; operações de leitura com permissões.
CORE-02: catálogo de tarefas / logs persistentes, estados `desconhecido`, `ocioso`, `trabalhando confirmado`, `aguardando`, `erro`.
CORE-03: protocolo de mensagens do serviço Windows e adaptador MCP (sem disponibilizar comando arbitrário); autorização por projeto, allowlist, auditoria de logs.
CORE-04: Drive desktop streaming + workspaces temporários locais + hashing, conflitos e sincronização checkpoint.
CORE-05: KeePassXC sob demanda, sem credenciais no navegador, proteções contra gravações simultâneas, rotinas de redaction.
CORE-06: GitHub branches isoladas; push somente em branches não ligadas a deploy; verificação antes de merge.
CORE-07: Hostinger publicação condicionada a aprovação + backup/verificação/rollback assistido.
CORE-08: monitoramento de agentes, Playwright headless e recursos CPU/RAM (sem interferência mouse).
CORE-09: instalador Windows, bandeja, serviço MCP persistente, recuperação segura e backups.

## Integração frontend/core
Contrato proposto:
1. O core emite snapshots e eventos verificados assinados/validados para UI.
2. Frontend transforma evidência em estado de animação; não envia comandos privilegiados diretamente.
3. UI suporta DEMO independente, com selo sempre visível.
4. Contratos `src/core-contracts` não devem ser alterados por Codex sem acordo entre branches; codex pode consumir.
5. Antes de merge, revisar compatibilidade do frontend com estados reais, segurança, CPU/RAM e GitHub/Drive.

## Limites atuais e autorização
- Nenhum acesso ao Windows ou MCP real neste trabalho.
- Sem GitHub repo criado, sem PR aberto, sem Codex Cloud executado automaticamente.
- Nenhum merge, publicação Hostinger, exclusão ou migração sem autorização explícita.
- Toda etapa concluída deve atualizar `03_STATUS_E_REGISTRO_DE_ETAPAS.txt` com concluído, testes, mudança, pendências e necessidade do usuário.