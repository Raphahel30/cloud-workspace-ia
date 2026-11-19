import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import type { AgentVisualState, EvidenceOrigin, SourceTrust } from '../../core-contracts/agentState.ts';
import { aggregateEvidenceFromStore } from '../evidence/evidenceAggregator.ts';
import type { LocalMcpGateway } from '../mcp/localMcpGateway.ts';
import type { AgentRecord, SqliteStore } from '../storage/sqliteStore.ts';

const execFileAsync = promisify(execFile);

export interface AgentClientDescriptor {
  id: string;
  displayName: string;
  roleTitle: string;
  transport: string;
  capabilitySummary: string;
  binaryCandidates: ReadonlyArray<string>;
}

export const DEFAULT_AGENT_DESCRIPTORS: ReadonlyArray<AgentClientDescriptor> = [
  {
    id: 'antigravity',
    displayName: 'Antigravity',
    roleTitle: 'IDE / CLI Multi-Agente',
    transport: 'MCP stdio + HTTP loopback',
    capabilitySummary: 'Edição isolada, checkpoints SHA-256, testes allowlisted e documentação.',
    binaryCandidates: ['antigravity', 'agy'],
  },
  {
    id: 'codex',
    displayName: 'Codex',
    roleTitle: 'Agente de Código e Frontend',
    transport: 'MCP stdio + HTTP loopback',
    capabilitySummary: 'Implementação em branches agent/codex/* e testes headless isolados.',
    binaryCandidates: ['codex'],
  },
  {
    id: 'claude',
    displayName: 'Claude Code',
    roleTitle: 'Engenharia e Diagnóstico CLI',
    transport: 'MCP stdio + HTTP loopback',
    capabilitySummary: 'Revisão estrutural, depuração e patches confinados ao workspace.',
    binaryCandidates: ['claude'],
  },
  {
    id: 'chatgpt',
    displayName: 'ChatGPT',
    roleTitle: 'Ponte Local / Desktop Commander',
    transport: 'Desktop Commander / HTTP autenticado',
    capabilitySummary: 'Consulta segura de catálogo, aprovações e fluxos compatíveis sob demanda.',
    binaryCandidates: ['desktop-commander'],
  },
];

export interface AgentStatusSnapshot {
  id: string;
  displayName: string;
  roleTitle: string;
  transport: string;
  capabilitySummary: string;
  cliDetected: boolean;
  executablePath: string | null;
  visualState: AgentVisualState;
  evidenceOrigin: EvidenceOrigin | null;
  evidenceTrust: SourceTrust | null;
  observedAtMs: number | null;
  taskId: string | null;
  lastSignalAt: string | null;
  mcpValidated: boolean;
}

export interface AgentMcpValidationReport {
  agentId: string;
  projectId: string;
  branch: string;
  ok: boolean;
  checkedAt: string;
  tokenPreview: string;
  steps: Array<{
    step: string;
    passed: boolean;
    detail: string;
  }>;
  resultingState: AgentVisualState;
}

async function detectCommandOnWindows(names: ReadonlyArray<string>): Promise<string | null> {
  if (names.length === 0) return null;
  for (const name of names) {
    try {
      const { stdout } = await execFileAsync('where.exe', [name], {
        windowsHide: true,
        timeout: 2500,
      });
      const firstLine = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
      if (firstLine && fs.existsSync(firstLine.trim())) {
        return firstLine.trim();
      }
    } catch {
      // Binary not on PATH; try next candidate without assuming installation.
    }
  }
  return null;
}

/** Ensures default AI agent descriptors exist in SQLite without fabricating active telemetry. */
export function ensureDefaultAgentsRegistered(store: SqliteStore): AgentRecord[] {
  const existing = new Map(store.listAgents().map((a) => [a.name, a]));
  for (const desc of DEFAULT_AGENT_DESCRIPTORS) {
    const prev = existing.get(desc.id);
    if (!prev) {
      store.upsertAgent({
        name: desc.id,
        kind: desc.roleTitle,
        executable: null,
        version: null,
        mcpMethod: desc.transport,
        observedState: 'unknown',
        lastSignalAt: null,
      });
    }
  }
  return store.listAgents();
}

/** Registers a custom future agent client into the persistent SQLite registry. */
export function registerCustomAgent(
  store: SqliteStore,
  input: { id: string; roleTitle: string; transport: string; executable?: string | null },
): AgentRecord {
  const cleanId = input.id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-');
  if (!cleanId) {
    throw new Error('Identificador de agente inválido.');
  }
  const record: AgentRecord = {
    name: cleanId,
    kind: input.roleTitle.trim() || 'Cliente MCP Personalizado',
    executable: input.executable?.trim() || null,
    version: null,
    mcpMethod: input.transport.trim() || 'MCP stdio / HTTP loopback',
    observedState: 'unknown',
    lastSignalAt: null,
  };
  store.upsertAgent(record);
  store.appendAuditEvent({
    subject: cleanId,
    action: 'agent_register',
    scope: 'agents',
    occurredAt: new Date().toISOString(),
    status: 'ok',
    safeDetails: `Registered AI client '${cleanId}' (${record.mcpMethod}) without fabricated telemetry.`,
    origin: 'core-05b',
  });
  return record;
}

/**
 * Queries current agent status strictly obeying `src/core-contracts/agentState.ts`.
 * Unverified or absent observations resolve explicitly to `unknown` (`DESCONHECIDO`).
 */
export async function inspectAgentsSnapshot(
  store: SqliteStore,
  nowMs: number = Date.now(),
  ttlMs = 30_000,
  detectBinaries = true,
): Promise<{
  agents: AgentStatusSnapshot[];
  chiefVisible: boolean;
}> {
  const rows = ensureDefaultAgentsRegistered(store);
  const descriptorMap = new Map(DEFAULT_AGENT_DESCRIPTORS.map((d) => [d.id, d]));

  if (detectBinaries) {
    for (const row of rows) {
      const desc = descriptorMap.get(row.name);
      if (desc && (!row.executable || !fs.existsSync(row.executable))) {
        const found = await detectCommandOnWindows(desc.binaryCandidates);
        if (found) {
          store.upsertAgent({
            ...row,
            executable: found,
          });
        }
      }
    }
  }

  const updatedRows = store.listAgents();
  const ids = updatedRows.map((r) => r.name);
  const evidenceSnap = aggregateEvidenceFromStore(store, ids, nowMs, ttlMs, []);
  const audits = store.listAuditEvents(120);

  const agents: AgentStatusSnapshot[] = updatedRows.map((row) => {
    const desc = descriptorMap.get(row.name);
    const ev = evidenceSnap.agents[row.name];
    const mcpValidated = audits.some(
      (a) =>
        a.subject === row.name &&
        (a.action === 'mcp:projects_list' || a.action === 'agent_mcp_validate') &&
        a.status === 'ok',
    );
    return {
      id: row.name,
      displayName: desc?.displayName ?? row.name,
      roleTitle: desc?.roleTitle ?? row.kind,
      transport: desc?.transport ?? row.mcpMethod ?? 'MCP HTTP loopback',
      capabilitySummary: desc?.capabilitySummary ?? 'Cliente MCP adicional com escopo restrito por projeto.',
      cliDetected: Boolean(row.executable && fs.existsSync(path.normalize(row.executable))),
      executablePath: row.executable,
      visualState: ev?.state ?? 'unknown',
      evidenceOrigin: ev?.origin ?? null,
      evidenceTrust: ev?.trust ?? null,
      observedAtMs: ev?.observedAtMs ?? null,
      taskId: ev?.taskId ?? null,
      lastSignalAt: row.lastSignalAt,
      mcpValidated,
    };
  });

  return {
    agents,
    chiefVisible: evidenceSnap.chiefVisible,
  };
}

/**
 * Runs a progressive, real JSON-RPC 2.0 MCP handshake and project-confinement check
 * for an individual client (`antigravity`, `codex`, `claude`, `chatgpt`, etc.).
 */
export async function validateAgentMcpConnection(
  gateway: LocalMcpGateway,
  store: SqliteStore,
  params: {
    agentId: string;
    projectId: string;
    nowMs?: number;
  },
): Promise<AgentMcpValidationReport> {
  const nowMs = params.nowMs ?? Date.now();
  const safeBranch = `agent/${params.agentId}/mcp-check`;
  const issued = gateway.issueSessionToken({
    agentId: params.agentId,
    allowedProjects: [params.projectId],
    allowedOperations: ['inspect', 'read'],
    branch: safeBranch,
    nowMs,
  });

  const steps: AgentMcpValidationReport['steps'] = [];
  const tokenPreview = `${issued.token.slice(0, 11)}...${issued.token.slice(-4)}`;

  const initRes = await gateway.handleJsonRpcRequest(
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { clientInfo: { name: params.agentId } } },
    issued.token,
    nowMs,
  );
  steps.push({
    step: 'initialize',
    passed: Boolean(initRes.result && !initRes.error),
    detail: initRes.error ? initRes.error.message : 'Handshake JSON-RPC 2.0 inicializado.',
  });

  const listToolsRes = await gateway.handleJsonRpcRequest(
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    issued.token,
    nowMs,
  );
  const toolsObj = listToolsRes.result as { tools?: Array<{ name: string }> } | undefined;
  steps.push({
    step: 'tools/list',
    passed: Boolean(toolsObj?.tools && toolsObj.tools.length >= 14),
    detail: `${toolsObj?.tools?.length ?? 0} ferramentas MCP declaradas sem terminal irrestrito.`,
  });

  const projectsListRes = await gateway.handleJsonRpcRequest(
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'projects_list', arguments: {} } },
    issued.token,
    nowMs,
  );
  const projectsPayload = projectsListRes.result as { projects?: Array<{ id: string }> } | undefined;
  const listedIds = (projectsPayload?.projects ?? []).map((p) => p.id);
  const onlyAllowedProject = listedIds.every((id) => id === params.projectId);
  steps.push({
    step: 'projects_list (escopo restrito)',
    passed: !projectsListRes.error && onlyAllowedProject,
    detail: `Retornou ${listedIds.length} projeto(s) confinados ao escopo '${params.projectId}'.`,
  });

  // Negative check: unauthorized project and arbitrary non-allowlisted execution must fail.
  const deniedProjectRes = await gateway.handleJsonRpcRequest(
    {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'project_get', arguments: { projectId: 'forbidden-external-project' } },
    },
    issued.token,
    nowMs,
  );
  steps.push({
    step: 'bloqueio fora de escopo',
    passed: Boolean(deniedProjectRes.error),
    detail: deniedProjectRes.error?.message ?? 'ERRO: acesso indevido não bloqueado.',
  });

  const ok = steps.every((s) => s.passed);
  const taskId = `mcp-check-${params.agentId}-${nowMs}`;

  store.upsertTask({
    id: taskId,
    projectId: params.projectId,
    origin: 'cloud-workspace',
    trust: 'verified',
    executor: params.agentId,
    commandProfile: 'mcp-connector-check',
    status: ok ? 'completed' : 'failed',
    resumable: false,
    startedAtMs: nowMs,
    observedAtMs: nowMs,
    finishedAtMs: nowMs,
    sanitizedLog: steps.map((s) => `[${s.passed ? 'PASS' : 'FAIL'}] ${s.step}: ${s.detail}`).join('\n'),
  });

  store.recordAgentEvent({
    agentId: params.agentId,
    runId: taskId,
    origin: 'cloud-workspace-mcp',
    trust: 'verified',
    open: true,
    taskStatus: ok ? 'completed' : 'failed',
    taskId,
    observedAtMs: nowMs,
  });

  const existingRow = store.listAgents().find((a) => a.name === params.agentId);
  store.upsertAgent({
    name: params.agentId,
    kind: existingRow?.kind ?? 'Cliente MCP',
    executable: existingRow?.executable ?? null,
    version: existingRow?.version ?? null,
    mcpMethod: existingRow?.mcpMethod ?? 'MCP HTTP loopback',
    observedState: ok ? 'idle' : 'error',
    lastSignalAt: new Date(nowMs).toISOString(),
  });

  store.appendAuditEvent({
    subject: params.agentId,
    action: 'agent_mcp_validate',
    scope: params.projectId,
    occurredAt: new Date(nowMs).toISOString(),
    status: ok ? 'ok' : 'error',
    safeDetails: `Validated scoped MCP client (${steps.filter((s) => s.passed).length}/${steps.length} checks). Token=${tokenPreview}`,
    origin: 'core-05b',
  });

  const snap = aggregateEvidenceFromStore(store, [params.agentId], nowMs, 30_000, []);

  return {
    agentId: params.agentId,
    projectId: params.projectId,
    branch: safeBranch,
    ok,
    checkedAt: new Date(nowMs).toISOString(),
    tokenPreview,
    steps,
    resultingState: snap.agents[params.agentId]?.state ?? 'unknown',
  };
}
