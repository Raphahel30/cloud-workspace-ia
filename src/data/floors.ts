export const floors = {
  reception: {number: 1, title: 'Recepção / Visão geral', detail: 'Projetos, tarefas e visão geral. Sem importação automática de projetos.', glyph: '▥', focusY: '73%'},
  boss: {number: 2, title: 'Chefe / Controle', detail: 'Chefe aparece somente em tarefa confirmada do Cloud Workspace.', glyph: '♛', focusY: '60%'},
  agents: {number: 3, title: 'Funcionários IA', detail: 'ChatGPT, Antigravity, Codex e Claude Code. Estados somente com evidência real.', glyph: '▣', focusY: '48%'},
  infra: {number: 4, title: 'Infraestrutura / MCP / Testes', detail: 'Execução local, Playwright isolado, CPU/RAM e auditoria dos processos.', glyph: '⚙', focusY: '35%'},
  servers: {number: 5, title: 'Servidores / Integrações', detail: 'Google Drive, GitHub, Hostinger e serviços; nenhuma conexão real nesta prévia.', glyph: '▥', focusY: '23%'},
} as const;
export type FloorKey = keyof typeof floors;
export const floorOrder: FloorKey[] = ['reception', 'boss', 'agents', 'infra', 'servers'];