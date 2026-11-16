# Padrões obrigatórios para futuras IAs

Fonte de verdade: Plano Mestre v2.0 e decisões 1–30 existentes em `Projetos Code/00 - Documentacao Cloud Workspace IA`.

- Não misturar PetSiStore, OptiGrill, Orquestrador nem outro produto.
- Não implementar MCP como terminal universal sem restrições.
- Não alterar estado do usuário baseado em mock como se fosse telemetria real.
- Não exibir tokens; KeePassXC fica criptografado e bloqueado por padrão.
- Git somente em branches `agent/<agente>/<tarefa>` autorizadas e não vinculadas a deploy.
- Sem GitHub Actions nem VPS obrigatórios.
- Testes locais headless nunca usam mouse/teclado da sessão do usuário.
- Drive é armazenamento, Git/compilação ocorrem em workspaces temporários gerenciados.
- Finalizar tarefa exige checksum/versão, resolução de conflito, validação de upload e aprovação antes da limpeza.
- Cada etapa entregue atualiza log no Drive contendo: objetivo, realizado, mudanças, arquivos, verificações, pendências e aprovações.
- Verificar autenticação/permissões server-side no futuro: tipos/frontend não constituem sandbox.