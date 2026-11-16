import type { AgentState, AgentTelemetry, Snapshot } from './types';
/** Nunca inferir "working" simplesmente porque um processo está aberto. */
export function visibleAgentState(agent: AgentTelemetry): AgentState {
  if (agent.state === 'closed') return 'closed';
  if (agent.state === 'working' && (!agent.verified || agent.source === 'process' || !agent.observedAt)) return 'unknown';
  return agent.state;
}
export function bossIsWorking(snapshot: Snapshot): boolean {
  // Apenas tarefas registradas e ainda em execução pelo Cloud Workspace.
  return snapshot.source === 'local-service' && snapshot.tasks.some(t => t.state === 'running');
}
export const statusLabel: Record<AgentState, string> = {
  closed: 'Fechado', idle: 'Ocioso', working: 'Trabalhando',
  awaiting_approval: 'Aguardando aprovação', error: 'Falha', unknown: 'Não verificado'
};