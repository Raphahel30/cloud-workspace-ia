/**
 * Cloud Workspace IA — contrato puro de estado de agentes (v0.1)
 * Não é um conector MCP nem telemetria Windows. Apenas valida e traduz evidências
 * recebidas de um futuro processo privilegiado. O frontend jamais deve inventar atividade.
 */
export type AgentVisualState = 'absent' | 'idle' | 'working' | 'waiting' | 'error' | 'unknown';
export type EvidenceOrigin = 'cloud-workspace-mcp' | 'authorized-cli' | 'process-observation' | 'manual';
export type SourceTrust = 'verified' | 'unverified';

export type AgentEvidence = Readonly<{
  agentId: string;
  origin: EvidenceOrigin;
  trust: SourceTrust;
  observedAtMs: number;
  open: boolean | null;
  taskStatus: 'running' | 'waiting-approval' | 'failed' | 'completed' | null;
  taskId?: string | null;
}>;

export type CloudWorkspaceTask = Readonly<{
  id: string;
  origin: 'cloud-workspace';
  trust: SourceTrust;
  status: 'running' | 'completed' | 'failed';
  observedAtMs: number;
}>;

/** O status visual 'working' só pode surgir de um evento de tarefa verificado. */
const CONFIRMED_TASK_ORIGINS: ReadonlySet<EvidenceOrigin> =
  new Set(['cloud-workspace-mcp', 'authorized-cli']);

export function agentVisualState(
  evidence: AgentEvidence | null | undefined,
  nowMs: number,
  ttlMs = 30_000,
): AgentVisualState {
  if (!evidence || !Number.isFinite(nowMs)) return 'unknown';
  if (!Number.isFinite(evidence.observedAtMs) || evidence.observedAtMs > nowMs + 2_000) return 'unknown';
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || nowMs - evidence.observedAtMs > ttlMs) return 'unknown';
  // Apenas uma observação confiável pode indicar que o processo está fechado.
  if (evidence.trust !== 'verified') return 'unknown';
  if (evidence.open === false) return 'absent';
  if (evidence.open !== true) return 'unknown';
  // Processos abertos são observação; não provar que trabalham ou que esperam aprovação.
  if (!CONFIRMED_TASK_ORIGINS.has(evidence.origin)) return 'unknown';
  if (evidence.taskStatus === 'running' && evidence.taskId) return 'working';
  if (evidence.taskStatus === 'waiting-approval' && evidence.taskId) return 'waiting';
  if (evidence.taskStatus === 'failed' && evidence.taskId) return 'error';
  if (evidence.taskStatus === 'completed') return 'idle';
  return 'unknown';
}

/** O chefe representa EXCLUSIVAMENTE tarefas confirmadas originadas pelo produto. */
export function chiefVisible(
  tasks: ReadonlyArray<CloudWorkspaceTask>,
  nowMs: number,
  ttlMs = 30_000,
): boolean {
  return tasks.some(t => t.origin === 'cloud-workspace' &&
    t.trust === 'verified' && t.status === 'running' &&
    Number.isFinite(t.observedAtMs) &&
    t.observedAtMs <= nowMs + 2_000 &&
    nowMs - t.observedAtMs <= ttlMs);
}

export function connectionLabel(
  verified: boolean,
  connected: boolean | null,
): 'connected' | 'disconnected' | 'unknown' {
  if (!verified || connected === null) return 'unknown';
  return connected ? 'connected' : 'disconnected';
}