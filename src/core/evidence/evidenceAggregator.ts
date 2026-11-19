import {
  agentVisualState,
  chiefVisible,
  connectionLabel,
  type AgentEvidence,
  type AgentVisualState,
  type CloudWorkspaceTask,
  type EvidenceOrigin,
  type SourceTrust,
} from '../../core-contracts/agentState.ts';
import type { SqliteStore } from '../storage/sqliteStore.ts';

export interface AggregatedActorSnapshot {
  state: AgentVisualState;
  origin: EvidenceOrigin | null;
  trust: SourceTrust | null;
  observedAtMs: number | null;
  taskId: string | null;
}

export interface ServiceConnectionInput {
  id: string;
  verified: boolean;
  connected: boolean | null;
}

export interface EvidenceSnapshot {
  observedAtMs: number;
  agents: Record<string, AggregatedActorSnapshot>;
  chiefVisible: boolean;
  connections: Record<string, 'connected' | 'disconnected' | 'unknown'>;
}

/**
 * Pure aggregator reading stored agent events and Cloud Workspace tasks,
 * delegating every visual-state decision to the immutable contract in `src/core-contracts/agentState.ts`.
 */
export function aggregateEvidenceFromStore(
  store: SqliteStore,
  agentIds: ReadonlyArray<string>,
  nowMs: number,
  ttlMs = 30_000,
  services: ReadonlyArray<ServiceConnectionInput> = [],
): EvidenceSnapshot {
  const latestEvents = store.getLatestAgentEvents();
  const byAgent = new Map(latestEvents.map((e) => [e.agentId, e]));

  const agents: Record<string, AggregatedActorSnapshot> = {};
  for (const agentId of agentIds) {
    const row = byAgent.get(agentId);
    if (!row) {
      agents[agentId] = {
        state: agentVisualState(null, nowMs, ttlMs),
        origin: null,
        trust: null,
        observedAtMs: null,
        taskId: null,
      };
      continue;
    }

    const evidence: AgentEvidence = {
      agentId: row.agentId,
      origin: row.origin,
      trust: row.trust,
      observedAtMs: row.observedAtMs,
      open: row.open,
      taskStatus: row.taskStatus,
      taskId: row.taskId,
    };

    agents[agentId] = {
      state: agentVisualState(evidence, nowMs, ttlMs),
      origin: row.origin,
      trust: row.trust,
      observedAtMs: row.observedAtMs,
      taskId: row.taskId,
    };
  }

  const tasks: CloudWorkspaceTask[] = store
    .listTasks()
    .filter((t): t is typeof t & { origin: 'cloud-workspace' } => t.origin === 'cloud-workspace')
    .map((t) => ({
      id: t.id,
      origin: 'cloud-workspace',
      trust: t.trust,
      status: t.status,
      observedAtMs: t.observedAtMs,
    }));

  const connections: Record<string, 'connected' | 'disconnected' | 'unknown'> = {};
  for (const svc of services) {
    connections[svc.id] = connectionLabel(svc.verified, svc.connected);
  }

  return {
    observedAtMs: nowMs,
    agents,
    chiefVisible: chiefVisible(tasks, nowMs, ttlMs),
    connections,
  };
}
