import type { AgentVisualState, EvidenceOrigin, SourceTrust } from '../core-contracts/agentState';

export interface BootstrapResponse {
  ok: boolean;
  uiToken: string;
  baseUrl: string;
  sidecar: {
    pid: number;
    port: number | null;
    mcpUrl: string;
    startedAt: string;
    packagingMode: string;
    requiresManualNodeInstall: boolean;
    requiresManualSqliteInstall: boolean;
    dbPath: string;
    workspacesRoot: string;
    snapshotsRoot: string;
    lastRecovery: {
      recoveredAt: string;
      recoveredTasks: string[];
      recoveredWorkspaces: string[];
    };
  };
  tauriDesktop: boolean;
}

export interface CoreOverviewResponse {
  checkedAt: string;
  hardware: {
    cpuModel: string;
    cpuCores: number;
    totalRamGb: number;
    freeRamGb: number;
    ssdFreeGb: number;
    ssdTotalGb: number;
    driveConnected: boolean;
    driveFreeGb: number;
    sidecarRssMb: number;
    sidecarPid: number;
  };
  counts: {
    projects: number;
    companionFolders: number;
    agentsRegistered: number;
    agentsVerifiedActive: number;
    workspaces: number;
    backups: number;
    tasks: number;
    approvalsPending: number;
  };
  chiefVisible: boolean;
  lastRecovery: {
    recoveredAt: string;
    recoveredTasks: string[];
    recoveredWorkspaces: string[];
  };
  recentAudit: AuditEventDto[];
}

export interface DriveProjectDto {
  id: string;
  slug: string;
  name: string;
  drivePath: string;
  localRepoPath: string | null;
  subfolders: string[];
  topFiles: string[];
  fileCount: number;
  totalBytes: number;
  sensitiveCount: number;
  technologies: string[];
  githubRepo: string | null;
  currentBranch: string | null;
  headSha: string | null;
  dirtyFilesCount: number | null;
  dirtyFilesPreview: string[];
  worktrees: Array<{ path: string; branch: string | null; head: string | null }>;
  packages: Array<{ name: string; sizeBytes: number; modifiedAt: string }>;
  backupsCount: number;
  conflictsDetected: string[];
  lastConfirmedSyncAt: string | null;
  projectState: 'ativo-desenvolvimento' | 'catalogado' | 'requer-revisao';
  reviewStatus: string;
}

export interface DriveProjectsResponse {
  checkedAt: string;
  driveRoot: string;
  projectsRoot: string;
  driveConnected: boolean;
  readOnlyVerified: true;
  projects: DriveProjectDto[];
  companionFolders: Array<{
    name: string;
    fullPath: string;
    fileCount: number;
    totalBytes: number;
    lastModifiedAt: string | null;
  }>;
  storage: {
    ssdLocal: { path: string; available: boolean; totalBytes: number; freeBytes: number; usedBytes: number };
    googleDrive: { path: string; available: boolean; totalBytes: number; freeBytes: number; usedBytes: number };
  };
}

export interface AgentStatusDto {
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

export interface AgentMcpValidationDto {
  agentId: string;
  projectId: string;
  branch: string;
  ok: boolean;
  checkedAt: string;
  tokenPreview: string;
  steps: Array<{ step: string; passed: boolean; detail: string }>;
  resultingState: AgentVisualState;
}

export interface WorkspacesResponse {
  workspacesRoot: string;
  snapshotsRoot: string;
  recoverableBytes: number;
  workspaces: Array<{
    id: string;
    projectId: string;
    runId: string;
    agentId: string;
    localPath: string;
    branch: string;
    createdAt: string;
    state: string;
    bytesUsed: number;
    diskBytes: number;
    conflictFiles: string[];
    dirtyFiles: string[];
    uploadsVerified: boolean;
    baseManifestHash: string | null;
    cleanupEligible: boolean;
  }>;
  backups: Array<{
    id: string;
    projectId: string;
    target: string;
    snapshotPath: string;
    sha256: string | null;
    restoreState: string;
    retentionGroup: string;
    createdAt: string;
  }>;
  syncJobs: Array<{
    id: string;
    sourcePath: string;
    targetPath: string;
    baseManifestHash: string | null;
    state: string;
    attempts: number;
    lastError: string | null;
    verified: boolean;
    updatedAt: string;
  }>;
}

export interface IntegrationItemDto {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'unknown';
  verified: boolean;
  detail: string;
}

export interface TaskDto {
  id: string;
  projectId: string;
  origin: 'cloud-workspace' | 'external';
  trust: SourceTrust;
  executor: string;
  commandProfile: string;
  status: 'running' | 'completed' | 'failed';
  resumable: boolean;
  startedAtMs: number;
  observedAtMs: number;
  finishedAtMs: number | null;
  sanitizedLog: string;
}

export interface AuditEventDto {
  id?: number;
  subject: string;
  action: string;
  scope: string;
  occurredAt: string;
  status: 'ok' | 'denied' | 'error';
  safeDetails: string;
  origin?: string | null;
}

export interface SecurityResponse {
  keepassCli: { installed: boolean; path: string };
  vaultMode: string;
  credentialMetadata: Array<{
    id: string;
    title: string;
    service: string;
    project: string;
    environment: string;
  }>;
  approvals: Array<{
    id: string;
    actionType: string;
    scope: string;
    target: string;
    decision: 'pending' | 'approved' | 'rejected';
    author: string;
    expiresAt: string | null;
    planHash: string;
    createdAt: string;
  }>;
  protectedContracts: string[];
  frozenPixelArtPending: string[];
}

interface TauriGlobal {
  __TAURI_INTERNALS__?: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  };
}

let cachedSession: BootstrapResponse | null = null;

async function tryTauriInvoke<T>(cmd: string): Promise<T | null> {
  const g = window as unknown as TauriGlobal;
  if (!g.__TAURI_INTERNALS__?.invoke) return null;
  try {
    return await g.__TAURI_INTERNALS__.invoke<T>(cmd);
  } catch {
    return null;
  }
}

export async function ensureCoreSession(forceRefresh = false): Promise<BootstrapResponse> {
  if (cachedSession && !forceRefresh) return cachedSession;

  const tauriBoot = await tryTauriInvoke<{
    running: boolean;
    baseUrl: string;
    mcpUrl: string;
    uiToken: string;
    pid: number;
    port: number;
  }>('core_sidecar_bootstrap');

  if (tauriBoot?.running && tauriBoot.baseUrl && tauriBoot.uiToken) {
    const res = await fetch(`${tauriBoot.baseUrl}/api/core/bootstrap`);
    const data = (await res.json()) as BootstrapResponse;
    cachedSession = {
      ...data,
      uiToken: tauriBoot.uiToken,
      baseUrl: tauriBoot.baseUrl,
      tauriDesktop: true,
    };
    return cachedSession;
  }

  const res = await fetch('/api/core/bootstrap');
  if (!res.ok) {
    throw new Error(`Falha no bootstrap do núcleo local (${res.status}).`);
  }
  const data = (await res.json()) as BootstrapResponse;
  cachedSession = {
    ...data,
    baseUrl: '',
    tauriDesktop: false,
  };
  return cachedSession;
}

async function coreRequest<T>(
  endpoint: string,
  options: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T> {
  let session = await ensureCoreSession();
  const execute = async (baseUrl: string, tok: string) =>
    fetch(`${baseUrl}${endpoint}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CW-UI-Token': tok,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

  let res: Response;
  try {
    res = await execute(session.baseUrl || '', session.uiToken);
  } catch {
    session = await ensureCoreSession(true);
    res = await execute(session.baseUrl || '', session.uiToken);
  }

  if (res.status === 401) {
    session = await ensureCoreSession(true);
    res = await execute(session.baseUrl || '', session.uiToken);
  }
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Erro ${res.status} em ${endpoint}`);
  }
  return json;
}

export const coreApi = {
  bootstrap: ensureCoreSession,
  getOverview: () => coreRequest<CoreOverviewResponse>('/api/core/overview'),
  getProjects: () => coreRequest<DriveProjectsResponse>('/api/core/projects'),
  getAgents: () =>
    coreRequest<{ agents: AgentStatusDto[]; chiefVisible: boolean }>('/api/core/agents'),
  registerAgent: (input: { id: string; roleTitle: string; transport: string }) =>
    coreRequest<{ ok: boolean; agents: AgentStatusDto[]; chiefVisible: boolean }>(
      '/api/core/agents/register',
      { method: 'POST', body: input },
    ),
  validateAgentMcp: (agentId: string, projectId = 'cloud-workspace-ia') =>
    coreRequest<{ report: AgentMcpValidationDto; agents: AgentStatusDto[]; chiefVisible: boolean }>(
      '/api/core/agents/validate',
      { method: 'POST', body: { agentId, projectId } },
    ),
  getWorkspaces: () => coreRequest<WorkspacesResponse>('/api/core/workspaces'),
  runWorkspaceAction: (body: Record<string, unknown>) =>
    coreRequest<{ result: Record<string, unknown> } & WorkspacesResponse>(
      '/api/core/workspaces/action',
      { method: 'POST', body },
    ),
  getIntegrations: () =>
    coreRequest<{ checkedAt: string; integrations: IntegrationItemDto[] }>('/api/core/integrations'),
  getTestsLogs: () =>
    coreRequest<{
      commandAllowlist: Array<{ id: string; stack: string; executable: string; args: string[]; description: string }>;
      tasks: TaskDto[];
      auditEvents: AuditEventDto[];
      lastRecovery: BootstrapResponse['sidecar']['lastRecovery'];
    }>('/api/core/tests-logs'),
  runAllowlistedTest: (commandProfile: string) =>
    coreRequest<{
      run: { taskId: string; profileId: string; exitCode: number; status: string; sanitizedLog: string };
      tasks: TaskDto[];
      auditEvents: AuditEventDto[];
    }>('/api/core/tests/run', { method: 'POST', body: { commandProfile } }),
  getSecurity: () => coreRequest<SecurityResponse>('/api/core/security'),
  recordApproval: (input: {
    actionType: string;
    scope: string;
    target: string;
    decision: 'approved' | 'rejected';
  }) =>
    coreRequest<{ approvals: SecurityResponse['approvals'] }>('/api/core/security/approval', {
      method: 'POST',
      body: input,
    }),
  runKeePassTest: (input: { credentialId: string; projectId: string; grantEphemeralApproval: boolean }) =>
    coreRequest<{
      outcome: { ok: boolean; result?: unknown; error?: string };
      approvals: SecurityResponse['approvals'];
      auditEvents: AuditEventDto[];
    }>('/api/core/security/keepass-test', { method: 'POST', body: input }),
  triggerRecovery: () =>
    coreRequest<{ lastRecovery: BootstrapResponse['sidecar']['lastRecovery'] } & WorkspacesResponse>(
      '/api/core/runtime/recover',
      { method: 'POST', body: {} },
    ),
  restartSidecar: async () => {
    const restarted = await tryTauriInvoke('core_sidecar_restart');
    cachedSession = null;
    await ensureCoreSession(true);
    return restarted;
  },
};
