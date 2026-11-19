import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { canCleanup } from '../../lib/policy.ts';
import {
  inspectAgentsSnapshot,
  registerCustomAgent,
  validateAgentMcpConnection,
} from '../agents/agentRegistryService.ts';
import {
  DEFAULT_DRIVE_CODE_ROOT,
  DEFAULT_LOCAL_PROJECTS_ROOT,
  inspectDriveProjectsRoot,
} from '../catalog/driveCatalog.ts';
import { COMMAND_ALLOWLIST_BY_STACK, isAllowedHttpOrigin, LocalMcpGateway } from '../mcp/localMcpGateway.ts';
import {
  detectKeePassCli,
  FictitiousVaultProvider,
  KeePassAdapter,
} from '../security/keepassAdapter.ts';
import { redactSecrets, SqliteStore } from '../storage/sqliteStore.ts';
import { computeDirectoryManifest, WorkspaceManager } from '../workspaces/workspaceManager.ts';
import { resolveSidecarConfig, type SidecarRuntimeConfig } from './tauriSidecarRuntime.ts';

const execFileAsync = promisify(execFile);

export interface RecoverySummary {
  recoveredAt: string;
  recoveredTasks: string[];
  recoveredWorkspaces: string[];
}

export interface CoreSidecarOptions {
  localDataRootOverride?: string;
  dbPathOverride?: string;
  workspacesRootOverride?: string;
  snapshotsRootOverride?: string;
  driveRootOverride?: string;
  localProjectsRootOverride?: string;
  uiTokenOverride?: string;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  const limit = 1024 * 1024;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limit) {
      throw new Error('Payload too large');
    }
    chunks.push(buf);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function directoryByteSize(dirPath: string): number {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) total += fs.statSync(full).size;
    }
  };
  walk(dirPath);
  return total;
}

async function detectCommandQuick(cmd: string): Promise<{ installed: boolean; path: string | null }> {
  try {
    const { stdout } = await execFileAsync('where.exe', [cmd], { windowsHide: true, timeout: 2000 });
    const first = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
    return { installed: Boolean(first), path: first ? first.trim() : null };
  } catch {
    return { installed: false, path: null };
  }
}

export class CoreSidecarServer {
  readonly config: SidecarRuntimeConfig;
  readonly store: SqliteStore;
  readonly workspaces: WorkspaceManager;
  readonly gateway: LocalMcpGateway;
  readonly vaultProvider: FictitiousVaultProvider;
  readonly keepass: KeePassAdapter;
  readonly driveRoot: string;
  readonly localProjectsRoot: string;
  readonly uiToken: string;
  readonly sandboxRoot: string;
  readonly startedAt: string;
  readonly demoSnapshotKey: Buffer;
  lastRecovery: RecoverySummary;
  private httpServer: http.Server | null = null;
  private boundPort: number | null = null;
  private mcpHttpInfo: { host: string; port: number; url: string } | null = null;
  private closed = false;

  constructor(options: CoreSidecarOptions = {}) {
    const baseDataRoot = options.localDataRootOverride
      ? path.resolve(options.localDataRootOverride)
      : undefined;
    this.config = resolveSidecarConfig({
      dbPathOverride:
        options.dbPathOverride ??
        (baseDataRoot ? path.join(baseDataRoot, 'data', 'workspace.sqlite') : undefined),
      workspacesRootOverride:
        options.workspacesRootOverride ??
        (baseDataRoot ? path.join(baseDataRoot, 'Workspaces') : undefined),
      snapshotsRootOverride:
        options.snapshotsRootOverride ??
        (baseDataRoot ? path.join(baseDataRoot, 'Snapshots') : undefined),
    });

    this.driveRoot = options.driveRootOverride ?? DEFAULT_DRIVE_CODE_ROOT;
    this.localProjectsRoot = options.localProjectsRootOverride ?? DEFAULT_LOCAL_PROJECTS_ROOT;
    this.uiToken = options.uiTokenOverride ?? `cw_ui_${crypto.randomBytes(24).toString('hex')}`;
    this.sandboxRoot = path.join(path.dirname(this.config.workspacesRoot), 'SandboxFicticio');
    this.startedAt = new Date().toISOString();
    // Ephemeral per-process demo snapshot key for fictitious workspace encryption tests
    this.demoSnapshotKey = crypto.createHash('sha256').update(this.uiToken).digest();

    this.store = new SqliteStore(this.config.dbPath);
    this.workspaces = new WorkspaceManager({
      store: this.store,
      workspacesRoot: this.config.workspacesRoot,
    });
    this.gateway = new LocalMcpGateway({
      store: this.store,
      workspaces: this.workspaces,
    });
    this.vaultProvider = new FictitiousVaultProvider([
      {
        id: 'cred-staging-demo',
        title: 'Demo Staging API Token (Fictício)',
        service: 'staging-api',
        project: 'sandbox-demo-ia',
        environment: 'staging',
        fakeSecret: 'fictitious_staging_token_value_998877',
      },
      {
        id: 'cred-github-sandbox',
        title: 'Sandbox Agent Scope Token (Fictício)',
        service: 'github-sandbox',
        project: 'cloud-workspace-ia',
        environment: 'sandbox',
        fakeSecret: 'fictitious_github_scope_token_445566',
      },
    ]);
    this.keepass = new KeePassAdapter({
      store: this.store,
      provider: this.vaultProvider,
    });

    this.lastRecovery = this.recoverInterruptedState();
  }

  /** Reconciles interrupted tasks and persisted workspaces on boot without repeating unsafe writes. */
  recoverInterruptedState(nowMs: number = Date.now()): RecoverySummary {
    const recoveredAt = new Date(nowMs).toISOString();
    const recoveredTasks: string[] = [];
    const recoveredWorkspaces: string[] = [];

    for (const task of this.store.listTasks()) {
      if (task.status === 'running') {
        this.store.upsertTask({
          ...task,
          status: 'failed',
          resumable: true,
          observedAtMs: nowMs,
          finishedAtMs: nowMs,
          sanitizedLog: `${task.sanitizedLog}\n[RECOVERY ${recoveredAt}] Tarefa interrompida antes do encerramento; retomada automática bloqueada por segurança.`,
        });
        recoveredTasks.push(task.id);
      }
    }

    for (const ws of this.store.listWorkspaces()) {
      if (ws.state === 'LIBERADO') continue;
      const before = ws.state;
      const recovered = this.workspaces.recoverPersistedWorkspace(ws);
      if (recovered.state !== before || before !== 'LIBERADO') {
        recoveredWorkspaces.push(`${recovered.id}:${before}->${recovered.state}`);
      }
    }

    this.store.appendAuditEvent({
      subject: 'core.runtime.sidecar',
      action: 'startup_recovery',
      scope: 'sqlite+workspaces',
      occurredAt: recoveredAt,
      status: 'ok',
      safeDetails: `Recovery complete: ${recoveredTasks.length} interrupted task(s) reconciled, ${recoveredWorkspaces.length} workspace(s) rehydrated.`,
      origin: 'core-sidecar',
    });

    return { recoveredAt, recoveredTasks, recoveredWorkspaces };
  }

  async start(port = 0): Promise<{ host: string; port: number; baseUrl: string; mcpUrl: string }> {
    if (this.httpServer && this.boundPort !== null && this.mcpHttpInfo) {
      return {
        host: '127.0.0.1',
        port: this.boundPort,
        baseUrl: `http://127.0.0.1:${this.boundPort}`,
        mcpUrl: this.mcpHttpInfo.url,
      };
    }

    this.mcpHttpInfo = await this.gateway.startHttpServer(0);
    this.httpServer = http.createServer((req, res) => {
      void this.handleNodeRequest(req, res);
    });

    await new Promise<void>((resolve) => {
      this.httpServer!.listen(port, '127.0.0.1', () => resolve());
    });
    const addr = this.httpServer.address();
    this.boundPort = addr && typeof addr !== 'string' ? addr.port : port;

    this.store.appendAuditEvent({
      subject: 'core.runtime.sidecar',
      action: 'sidecar_started',
      scope: '127.0.0.1',
      occurredAt: new Date().toISOString(),
      status: 'ok',
      safeDetails: `Loopback Core Sidecar bound to http://127.0.0.1:${this.boundPort} (PID=${process.pid}).`,
      origin: 'core-sidecar',
    });

    return {
      host: '127.0.0.1',
      port: this.boundPort,
      baseUrl: `http://127.0.0.1:${this.boundPort}`,
      mcpUrl: this.mcpHttpInfo.url,
    };
  }

  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.gateway.stopHttpServer();
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer!.close(() => resolve());
      });
      this.httpServer = null;
    }
    try {
      this.store.appendAuditEvent({
        subject: 'core.runtime.sidecar',
        action: 'sidecar_shutdown',
        scope: 'sqlite',
        occurredAt: new Date().toISOString(),
        status: 'ok',
        safeDetails: 'Graceful shutdown executed with SQLite WAL checkpoint.',
        origin: 'core-sidecar',
      });
      if (this.store.dbPath !== ':memory:') {
        this.store.db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      }
      this.store.close();
    } catch {
      // Already closed safely
    }
  }

  /**
   * Handles both `/api/core/*` and `/mcp` HTTP requests cleanly inside standalone sidecar
   * or Vite dev middleware, enforcing Origin allowlist and `X-CW-UI-Token` authentication.
   */
  async handleNodeRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const rawUrl = req.url ?? '/';
    const urlPath = rawUrl.split('?')[0];
    if (!urlPath.startsWith('/api/core') && urlPath !== '/mcp') {
      return false;
    }

    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (!isAllowedHttpOrigin(originHeader)) {
      this.store.appendAuditEvent({
        subject: 'http-client',
        action: 'origin_rejected',
        scope: urlPath,
        occurredAt: new Date().toISOString(),
        status: 'denied',
        safeDetails: `Rejected disallowed Origin: ${originHeader}`,
        origin: 'core-sidecar',
      });
      sendJson(res, 403, { error: 'Origem não autorizada pelo guardião local.' });
      return true;
    }

    if (originHeader) {
      res.setHeader('Access-Control-Allow-Origin', originHeader);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CW-UI-Token, Authorization');
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      res.end();
      return true;
    }

    if (urlPath === '/mcp') {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Somente POST /mcp é suportado.' });
        return true;
      }
      const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;
      try {
        const body = await readJsonBody(req);
        const rpcRes = await this.gateway.handleJsonRpcRequest(
          body as unknown as Parameters<LocalMcpGateway['handleJsonRpcRequest']>[0],
          bearer,
        );
        sendJson(res, rpcRes.error?.code === -32001 ? 401 : 200, rpcRes);
      } catch {
        sendJson(res, 400, { error: 'Corpo JSON-RPC inválido.' });
      }
      return true;
    }

    if (urlPath === '/api/core/bootstrap' && req.method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        uiToken: this.uiToken,
        sidecar: {
          pid: process.pid,
          port: this.boundPort,
          mcpUrl: this.mcpHttpInfo?.url ?? 'middleware:/mcp',
          startedAt: this.startedAt,
          packagingMode: this.config.packagingMode,
          requiresManualNodeInstall: this.config.requiresManualNodeInstall,
          requiresManualSqliteInstall: this.config.requiresManualSqliteInstall,
          dbPath: this.config.dbPath,
          workspacesRoot: this.config.workspacesRoot,
          snapshotsRoot: this.config.snapshotsRoot,
          lastRecovery: this.lastRecovery,
        },
      });
      return true;
    }

    if (urlPath === '/api/core/health' && req.method === 'GET') {
      const mem = process.memoryUsage();
      sendJson(res, 200, {
        ok: !this.closed,
        pid: process.pid,
        nodeVersion: process.versions.node,
        uptimeSec: Math.round(process.uptime()),
        journalMode: String(this.store.pragma('journal_mode') ?? ''),
        foreignKeys: Number(this.store.pragma('foreign_keys')) === 1,
        tablesCount: this.store.listTableNames().length,
        memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        lastRecovery: this.lastRecovery,
      });
      return true;
    }

    // Require X-CW-UI-Token on every operational endpoint beyond bootstrap/health
    const suppliedToken =
      typeof req.headers['x-cw-ui-token'] === 'string' ? req.headers['x-cw-ui-token'].trim() : '';
    if (!suppliedToken || suppliedToken !== this.uiToken) {
      this.store.appendAuditEvent({
        subject: 'ui-api',
        action: `unauthorized:${urlPath}`,
        scope: 'auth',
        occurredAt: new Date().toISOString(),
        status: 'denied',
        safeDetails: `Missing or invalid X-CW-UI-Token on ${urlPath}.`,
        origin: 'core-sidecar',
      });
      sendJson(res, 401, { error: 'Token de sessão local (X-CW-UI-Token) ausente ou inválido.' });
      return true;
    }

    try {
      return await this.dispatchAuthenticatedRoute(req, res, urlPath);
    } catch (err) {
      const safeErr = redactSecrets(err instanceof Error ? err.message : String(err));
      this.store.appendAuditEvent({
        subject: 'core.runtime.sidecar',
        action: `error:${urlPath}`,
        scope: 'api',
        occurredAt: new Date().toISOString(),
        status: 'error',
        safeDetails: safeErr,
        origin: 'core-sidecar',
      });
      sendJson(res, 400, { ok: false, error: safeErr });
      return true;
    }
  }

  private async dispatchAuthenticatedRoute(
    req: IncomingMessage,
    res: ServerResponse,
    urlPath: string,
  ): Promise<boolean> {
    if (urlPath === '/api/core/overview' && req.method === 'GET') {
      const catalog = inspectDriveProjectsRoot({
        driveRoot: this.driveRoot,
        localProjectsRoot: this.localProjectsRoot,
        store: this.store,
      });
      const agentSnap = await inspectAgentsSnapshot(this.store, Date.now(), 30_000, false);
      const mem = process.memoryUsage();
      sendJson(res, 200, {
        checkedAt: new Date().toISOString(),
        hardware: {
          cpuModel: os.cpus()[0]?.model ?? 'Desconhecido',
          cpuCores: os.cpus().length,
          totalRamGb: Math.round((os.totalmem() / 1024 ** 3) * 100) / 100,
          freeRamGb: Math.round((os.freemem() / 1024 ** 3) * 100) / 100,
          ssdFreeGb: Math.round((catalog.storage.ssdLocal.freeBytes / 1024 ** 3) * 100) / 100,
          ssdTotalGb: Math.round((catalog.storage.ssdLocal.totalBytes / 1024 ** 3) * 100) / 100,
          driveConnected: catalog.driveConnected,
          driveFreeGb: Math.round((catalog.storage.googleDrive.freeBytes / 1024 ** 3) * 100) / 100,
          sidecarRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
          sidecarPid: process.pid,
        },
        counts: {
          projects: catalog.projects.length,
          companionFolders: catalog.companionFolders.length,
          agentsRegistered: agentSnap.agents.length,
          agentsVerifiedActive: agentSnap.agents.filter((a) => a.visualState === 'working').length,
          workspaces: this.store.listWorkspaces().length,
          backups: this.store.listBackups().length,
          tasks: this.store.listTasks().length,
          approvalsPending: this.store.listApprovals().filter((a) => a.decision === 'pending').length,
        },
        chiefVisible: agentSnap.chiefVisible,
        lastRecovery: this.lastRecovery,
        recentAudit: this.store.listAuditEvents(8),
      });
      return true;
    }

    if (urlPath === '/api/core/projects' && req.method === 'GET') {
      const report = inspectDriveProjectsRoot({
        driveRoot: this.driveRoot,
        localProjectsRoot: this.localProjectsRoot,
        store: this.store,
      });
      sendJson(res, 200, report);
      return true;
    }

    if (urlPath === '/api/core/agents' && req.method === 'GET') {
      const snap = await inspectAgentsSnapshot(this.store, Date.now(), 30_000, true);
      sendJson(res, 200, snap);
      return true;
    }

    if (urlPath === '/api/core/agents/register' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const created = registerCustomAgent(this.store, {
        id: String(body.id ?? ''),
        roleTitle: String(body.roleTitle ?? 'Cliente MCP'),
        transport: String(body.transport ?? 'MCP HTTP loopback'),
      });
      const snap = await inspectAgentsSnapshot(this.store, Date.now(), 30_000, false);
      sendJson(res, 200, { ok: true, agent: created, ...snap });
      return true;
    }

    if (urlPath === '/api/core/agents/validate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const agentId = String(body.agentId ?? 'antigravity');
      const projectId = String(body.projectId ?? 'cloud-workspace-ia');
      inspectDriveProjectsRoot({
        driveRoot: this.driveRoot,
        localProjectsRoot: this.localProjectsRoot,
        store: this.store,
      });
      const report = await validateAgentMcpConnection(this.gateway, this.store, {
        agentId,
        projectId,
      });
      const snap = await inspectAgentsSnapshot(this.store, Date.now(), 30_000, false);
      sendJson(res, 200, { report, ...snap });
      return true;
    }

    if (urlPath === '/api/core/workspaces' && req.method === 'GET') {
      sendJson(res, 200, this.getWorkspacesPayload());
      return true;
    }

    if (urlPath === '/api/core/workspaces/action' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = await this.executeSandboxWorkspaceAction(body);
      sendJson(res, 200, { result, ...this.getWorkspacesPayload() });
      return true;
    }

    if (urlPath === '/api/core/integrations' && req.method === 'GET') {
      const payload = await this.getIntegrationsStatus();
      sendJson(res, 200, payload);
      return true;
    }

    if (urlPath === '/api/core/tests-logs' && req.method === 'GET') {
      sendJson(res, 200, {
        commandAllowlist: Object.values(COMMAND_ALLOWLIST_BY_STACK),
        tasks: this.store.listTasks(),
        auditEvents: this.store.listAuditEvents(80),
        lastRecovery: this.lastRecovery,
      });
      return true;
    }

    if (urlPath === '/api/core/tests/run' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const profileId = String(body.commandProfile ?? 'node-policy');
      const spec = COMMAND_ALLOWLIST_BY_STACK[profileId];
      if (!spec) {
        throw new Error(`Perfil '${profileId}' não está na allowlist segura.`);
      }
      const cwd = fs.existsSync(path.join(process.cwd(), 'package.json'))
        ? process.cwd()
        : this.localProjectsRoot && fs.existsSync(path.join(this.localProjectsRoot, 'cloud-workspace-ia'))
          ? path.join(this.localProjectsRoot, 'cloud-workspace-ia')
          : process.cwd();
      const startedAt = Date.now();
      const taskId = `ui-test-${profileId}-${startedAt}`;
      this.store.upsertTask({
        id: taskId,
        projectId: 'cloud-workspace-ia',
        origin: 'cloud-workspace',
        trust: 'verified',
        executor: 'core-sidecar',
        commandProfile: profileId,
        status: 'running',
        resumable: true,
        startedAtMs: startedAt,
        observedAtMs: startedAt,
        finishedAtMs: null,
        sanitizedLog: `Iniciando perfil allowlisted: ${spec.executable} ${spec.args.join(' ')}`,
      });
      let exitCode = 0;
      let combinedLog = '';
      const stripAnsi = (raw: string) => raw.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
      const useWinCmd = process.platform === 'win32' && (spec.executable === 'npm' || spec.executable === 'npx');
      const runExe = useWinCmd ? 'cmd.exe' : spec.executable;
      const runArgs = useWinCmd ? ['/d', '/s', '/c', spec.executable, ...spec.args] : [...spec.args];
      try {
        const { stdout, stderr } = await execFileAsync(runExe, runArgs, {
          cwd,
          shell: false,
          timeout: 30_000,
          windowsHide: true,
        });
        combinedLog = redactSecrets(stripAnsi(`${stdout}\n${stderr}`.trim()));
      } catch (err) {
        const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
        exitCode = typeof e.code === 'number' ? e.code : 1;
        combinedLog = redactSecrets(stripAnsi(`${e.stdout ?? ''}\n${e.stderr ?? ''}\n${e.message ?? ''}`.trim()));
      }
      const finishedAt = Date.now();
      const status = exitCode === 0 ? 'completed' : 'failed';
      this.store.upsertTask({
        id: taskId,
        projectId: 'cloud-workspace-ia',
        origin: 'cloud-workspace',
        trust: 'verified',
        executor: 'core-sidecar',
        commandProfile: profileId,
        status,
        resumable: false,
        startedAtMs: startedAt,
        observedAtMs: finishedAt,
        finishedAtMs: finishedAt,
        sanitizedLog: combinedLog,
      });
      this.store.appendAuditEvent({
        subject: 'core-sidecar',
        action: `test_run:${profileId}`,
        scope: 'cloud-workspace-ia',
        occurredAt: new Date(finishedAt).toISOString(),
        status: exitCode === 0 ? 'ok' : 'error',
        safeDetails: `Allowlisted test '${profileId}' exited with ${exitCode}.`,
        origin: 'core-sidecar',
      });
      sendJson(res, 200, {
        run: { taskId, profileId, exitCode, status, sanitizedLog: combinedLog },
        tasks: this.store.listTasks(),
        auditEvents: this.store.listAuditEvents(80),
      });
      return true;
    }

    if (urlPath === '/api/core/security' && req.method === 'GET') {
      const metadata = await this.keepass.listMetadata();
      sendJson(res, 200, {
        keepassCli: detectKeePassCli(),
        vaultMode: 'fictitious-provider-until-explicit-user-unlock',
        credentialMetadata: metadata,
        approvals: this.store.listApprovals(),
        protectedContracts: [
          'src/core-contracts/agentState.ts',
          'tests/agentState.node.test.mjs',
          'src/lib/policy.ts',
          'tests/policy.test.ts',
        ],
        frozenPixelArtPending: [
          'Encaixe personagem-cadeira e oclusão de braço/mesa na vista definitiva de 5 andares',
          'Mãos sobre a mesa e teclado em todas as estações',
          'Posição e proporção do mobiliário por andar',
          'Perspectiva, profundidade e oclusão entre os 5 andares',
          'Acabamento e expansão da biblioteca de sprites para os andares 01, 02, 04 e 05',
        ],
      });
      return true;
    }

    if (urlPath === '/api/core/security/approval' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const id = String(body.id ?? `apr-${Date.now()}`);
      const decision = String(body.decision ?? 'approved') as 'pending' | 'approved' | 'rejected';
      const actionType = String(body.actionType ?? 'unlock_vault');
      const scope = String(body.scope ?? 'sandbox-demo-ia');
      const target = String(body.target ?? 'cred-staging-demo');
      const expiresAt =
        body.expiresAt === null
          ? null
          : String(body.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString());
      this.store.recordApproval({
        id,
        actionType,
        scope,
        target,
        decision,
        author: 'operador-local',
        expiresAt,
        planHash: crypto.createHash('sha256').update(`${id}:${actionType}:${scope}:${target}`).digest('hex').slice(0, 16),
        createdAt: new Date().toISOString(),
      });
      this.store.appendAuditEvent({
        subject: 'operador-local',
        action: `approval:${decision}`,
        scope,
        occurredAt: new Date().toISOString(),
        status: 'ok',
        safeDetails: `Recorded approval ${id} (${actionType} on ${target}) -> ${decision}.`,
        origin: 'core-05',
      });
      sendJson(res, 200, { approvals: this.store.listApprovals() });
      return true;
    }

    if (urlPath === '/api/core/security/keepass-test' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const credentialId = String(body.credentialId ?? 'cred-staging-demo');
      const projectId = String(body.projectId ?? 'sandbox-demo-ia');
      let approvalId = body.approvalId ? String(body.approvalId) : '';
      if (!approvalId && Boolean(body.grantEphemeralApproval)) {
        approvalId = `apr-keepass-${Date.now()}`;
        this.store.recordApproval({
          id: approvalId,
          actionType: 'unlock_vault',
          scope: projectId,
          target: credentialId,
          decision: 'approved',
          author: 'operador-local',
          expiresAt: new Date(Date.now() + 120_000).toISOString(),
          planHash: crypto.createHash('sha256').update(`${approvalId}:${projectId}`).digest('hex').slice(0, 16),
          createdAt: new Date().toISOString(),
        });
      }
      const outcome = await this.keepass.useSecretScoped(
        {
          credentialId,
          projectId,
          approvalId: approvalId || 'missing-approval',
          branch: 'agent/antigravity/keepass-test',
          subject: 'ui-security-test',
        },
        (secretBuf, meta) => ({
          injectedBytes: secretBuf.length,
          service: meta.service,
          environment: meta.environment,
          zeroizedAfterUse: true,
        }),
      );
      sendJson(res, 200, {
        outcome,
        approvals: this.store.listApprovals(),
        auditEvents: this.store.listAuditEvents(15),
      });
      return true;
    }

    if (urlPath === '/api/core/runtime/recover' && req.method === 'POST') {
      this.lastRecovery = this.recoverInterruptedState();
      sendJson(res, 200, { lastRecovery: this.lastRecovery, ...this.getWorkspacesPayload() });
      return true;
    }

    sendJson(res, 404, { error: `Rota desconhecida: ${urlPath}` });
    return true;
  }

  private getWorkspacesPayload() {
    const records = this.store.listWorkspaces();
    const backups = this.store.listBackups();
    const syncJobs = this.store.listSyncJobs();
    let recoverableBytes = 0;
    const items = records.map((ws) => {
      const runtime = this.workspaces.getState(ws.id);
      const diskBytes = ws.state === 'LIBERADO' ? 0 : directoryByteSize(ws.localPath) || ws.bytesUsed;
      recoverableBytes += diskBytes;
      return {
        ...ws,
        diskBytes,
        conflictFiles: runtime?.conflictFiles ?? [],
        dirtyFiles: runtime?.dirtyFiles ?? [],
        uploadsVerified: runtime?.uploadsVerified ?? (ws.state === 'AGUARDANDO_APROVACAO_DE_LIMPEZA'),
        baseManifestHash: runtime?.baseManifestHash ?? null,
        cleanupEligible: canCleanup({
          approved: true,
          uploadsVerified: runtime?.uploadsVerified ?? false,
          filesOpen: false,
          conflicts: (runtime?.conflictFiles.length ?? 0) > 0 || ws.state === 'CONFLITO',
          pendingChanges: (runtime?.dirtyFiles.length ?? 0) > 0,
        }),
      };
    });
    return {
      workspacesRoot: this.config.workspacesRoot,
      snapshotsRoot: this.config.snapshotsRoot,
      recoverableBytes,
      workspaces: items,
      backups,
      syncJobs,
    };
  }

  private ensureSandboxFixture(projectId = 'sandbox-demo-ia'): { sourceDir: string; targetDir: string } {
    const sourceDir = path.join(this.sandboxRoot, projectId, 'source');
    const targetDir = path.join(this.sandboxRoot, projectId, 'sync-target');
    this.store.upsertProject({
      id: projectId,
      slug: projectId,
      name: `Sandbox Fictício (${projectId})`,
      stack: 'typescript+sandbox',
      status: 'sandbox',
      localPath: sourceDir,
      drivePath: null,
      githubRepo: null,
      reviewStatus: 'sandbox-isolated',
      updatedAt: new Date().toISOString(),
    });
    if (!fs.existsSync(path.join(sourceDir, 'README.md'))) {
      fs.mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(sourceDir, 'README.md'), '# Sandbox Fictício Cloud Workspace\nProjeto isolado de teste.\n', 'utf8');
      fs.writeFileSync(path.join(sourceDir, 'src', 'index.ts'), 'export const sandboxVersion = 1;\n', 'utf8');
    }
    if (!fs.existsSync(path.join(targetDir, 'README.md'))) {
      fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'README.md'), '# Sandbox Fictício Cloud Workspace\nProjeto isolado de teste.\n', 'utf8');
      fs.writeFileSync(path.join(targetDir, 'src', 'index.ts'), 'export const sandboxVersion = 1;\n', 'utf8');
    }
    return { sourceDir, targetDir };
  }

  private async executeSandboxWorkspaceAction(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const action = String(body.action ?? '');
    const projectId = String(body.projectId ?? 'sandbox-demo-ia');
    const agentId = String(body.agentId ?? 'antigravity');
    const { sourceDir, targetDir } = this.ensureSandboxFixture(projectId);

    if (action === 'prepare_sandbox') {
      const runId = `run-${Date.now()}`;
      const branch = `agent/${agentId}/${runId}`;
      const ws = this.workspaces.prepareWorkspace({
        projectId,
        sourceDir,
        agentId,
        branch,
        runId,
      });
      // Initialize isolated git repository inside sandbox copy so git diff/commit tests are real
      try {
        await execFileAsync('git', ['init', '-b', 'sandbox-base'], { cwd: ws.localPath, windowsHide: true });
        await execFileAsync('git', ['config', 'user.name', 'Cloud Workspace Sandbox'], { cwd: ws.localPath, windowsHide: true });
        await execFileAsync('git', ['config', 'user.email', 'sandbox@cloudworkspace.local'], { cwd: ws.localPath, windowsHide: true });
        await execFileAsync('git', ['add', '.'], { cwd: ws.localPath, windowsHide: true });
        await execFileAsync('git', ['commit', '-m', 'chore: initial sandbox baseline'], { cwd: ws.localPath, windowsHide: true });
        await execFileAsync('git', ['checkout', '-b', branch], { cwd: ws.localPath, windowsHide: true });
      } catch {
        // Git CLI initialization is optional; file hashing/snapshots remain operational
      }
      return { action, ok: true, workspaceId: ws.id, message: `Workspace isolado preparado fora do Drive: ${ws.localPath}` };
    }

    const workspaceId = String(body.workspaceId ?? '');
    if (!workspaceId) {
      throw new Error('Selecione ou prepare um workspace fictício primeiro.');
    }

    if (action === 'patch_file') {
      const content = String(body.content ?? `export const sandboxVersion = ${Date.now()};\n`);
      const entry = this.workspaces.applyWorkspacePatch(workspaceId, 'src/index.ts', content);
      return {
        action,
        ok: true,
        file: entry.relativePath,
        sha256: entry.sha256,
        message: `Arquivo src/index.ts alterado no sandbox (SHA-256: ${entry.sha256.slice(0, 12)}).`,
      };
    }

    if (action === 'git_commit_branch') {
      const ws = this.workspaces.getState(workspaceId);
      if (!ws) throw new Error(`Workspace não encontrado: ${workspaceId}`);
      await execFileAsync('git', ['add', '.'], { cwd: ws.localPath, windowsHide: true });
      const { stdout } = await execFileAsync('git', ['commit', '-m', `feat(sandbox): checkpoint ${ws.runId}`], {
        cwd: ws.localPath,
        windowsHide: true,
      });
      const { stdout: logOut } = await execFileAsync('git', ['log', '-n', '2', '--oneline'], {
        cwd: ws.localPath,
        windowsHide: true,
      });
      return { action, ok: true, output: `${stdout}\n${logOut}`.trim(), message: `Commit isolado em '${ws.branch}'.` };
    }

    if (action === 'simulate_conflict') {
      this.workspaces.applyWorkspacePatch(workspaceId, 'src/index.ts', `export const localAgentEdit = ${Date.now()};\n`);
      fs.writeFileSync(path.join(targetDir, 'src', 'index.ts'), `export const remoteConcurrentEdit = ${Date.now() + 1};\n`, 'utf8');
      const syncRes = this.workspaces.syncCheckpoint({ workspaceId, targetDir });
      return {
        action,
        ok: true,
        syncRes,
        message: `Conflito detectado em ${syncRes.conflictFiles.join(', ')} e preservado sem sobrescrever o destino.`,
      };
    }

    if (action === 'sync_checkpoint') {
      // Align clean target base to match workspace's base before clean checkpoint test if previous simulated conflict existed
      const ws = this.workspaces.getState(workspaceId);
      if (ws) {
        const cleanFile = fs.existsSync(path.join(sourceDir, 'src', 'index.ts'))
          ? fs.readFileSync(path.join(sourceDir, 'src', 'index.ts'), 'utf8')
          : 'export const sandboxVersion = 1;\n';
        if (ws.conflictFiles.length === 0) {
          // Ensure base file in target matches base hash unless genuine conflict exists
          const manifestTarget = computeDirectoryManifest(targetDir);
          if (manifestTarget.files['src/index.ts']?.sha256 !== ws.baseFileHashes['src/index.ts']?.sha256) {
            fs.writeFileSync(path.join(targetDir, 'src', 'index.ts'), cleanFile, 'utf8');
          }
        }
      }
      const syncRes = this.workspaces.syncCheckpoint({ workspaceId, targetDir });
      return {
        action,
        ok: syncRes.verified,
        syncRes,
        message: syncRes.verified
          ? `Checkpoint verificado (${syncRes.syncedFiles.length} arquivo(s) com SHA-256 conferido).`
          : `Sincronização bloqueada no estado ${syncRes.state}.`,
      };
    }

    if (action === 'create_backup') {
      const bkp = this.workspaces.createEncryptedSnapshot({
        workspaceId,
        snapshotDir: this.config.snapshotsRoot,
        encryptionKey: this.demoSnapshotKey,
        retentionGroup: 'sandbox-checkpoint',
      });
      return {
        action,
        ok: true,
        backup: bkp,
        message: `Backup AES-256-GCM criado fora do Drive (SHA-256: ${bkp.encryptedSha256.slice(0, 12)}).`,
      };
    }

    if (action === 'restore_backup') {
      const backups = this.store.listBackups(projectId);
      if (backups.length === 0) throw new Error('Nenhum snapshot criptografado disponível para restauração.');
      const restoreTarget = path.join(this.sandboxRoot, projectId, `restored-${Date.now()}`);
      const res = this.workspaces.restoreEncryptedSnapshot({
        backupId: backups[0].id,
        targetDir: restoreTarget,
        encryptionKey: this.demoSnapshotKey,
      });
      return {
        action,
        ok: true,
        ...res,
        restoreTarget,
        message: `Backup restaurado (${res.restoredFiles} arquivos, SHA-256 validado) em ${restoreTarget}.`,
      };
    }

    if (action === 'simulate_interruption') {
      const nowMs = Date.now();
      this.store.upsertTask({
        id: `interrupted-${nowMs}`,
        projectId,
        origin: 'cloud-workspace',
        trust: 'verified',
        executor: agentId,
        commandProfile: 'sandbox-sync',
        status: 'running',
        resumable: true,
        startedAtMs: nowMs - 5000,
        observedAtMs: nowMs - 2000,
        finishedAtMs: null,
        sanitizedLog: 'Simulação de queda antes de concluir escrita.',
      });
      this.workspaces.transitionState(workspaceId, 'ENVIANDO');
      this.lastRecovery = this.recoverInterruptedState(nowMs);
      return {
        action,
        ok: true,
        lastRecovery: this.lastRecovery,
        message: `Recuperação segura concluída: ${this.lastRecovery.recoveredTasks.length} tarefa(s) e ${this.lastRecovery.recoveredWorkspaces.length} workspace(s) reconciliados.`,
      };
    }

    if (action === 'cleanup_preview') {
      const ws = this.workspaces.getState(workspaceId);
      if (!ws) throw new Error(`Workspace não encontrado: ${workspaceId}`);
      const bytes = directoryByteSize(ws.localPath);
      const res = this.workspaces.requestCleanup(workspaceId, { approved: false, filesOpen: false });
      const canWithApproval = canCleanup({
        approved: true,
        uploadsVerified: ws.uploadsVerified,
        filesOpen: false,
        conflicts: ws.conflictFiles.length > 0 || ws.state === 'CONFLITO',
        pendingChanges: ws.dirtyFiles.length > 0,
      });
      return {
        action,
        ok: true,
        recoverableBytes: bytes,
        canCleanupWithApproval: canWithApproval,
        blockedWithoutApproval: !res.cleaned,
        message: canWithApproval
          ? `Prévia: ${(bytes / 1024).toFixed(1)} KB liberáveis com segurança após aprovação.`
          : `Prévia bloqueada: estado='${ws.state}', uploadsVerified=${ws.uploadsVerified}, pendências=${ws.dirtyFiles.length}, conflitos=${ws.conflictFiles.length}.`,
      };
    }

    if (action === 'cleanup_execute') {
      const res = this.workspaces.requestCleanup(workspaceId, { approved: true, filesOpen: false });
      return {
        action,
        ok: res.cleaned,
        ...res,
        message: res.cleaned
          ? 'Área temporária de teste liberada após sincronização verificada e aprovação.'
          : res.reason,
      };
    }

    throw new Error(`Ação de workspace desconhecida: ${action}`);
  }

  private async getIntegrationsStatus() {
    const driveConnected = fs.existsSync(this.driveRoot);
    const gitCheck = await detectCommandQuick('git');
    const ghCheck = await detectCommandQuick('gh');
    const kpCheck = detectKeePassCli();

    let pwBrowserInstalled = false;
    let pwPath: string | null = null;
    const msPwDir = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
    if (fs.existsSync(msPwDir)) {
      const dirs = fs.readdirSync(msPwDir).filter((d) => d.startsWith('chromium-')).sort().reverse();
      for (const dir of dirs) {
        const exe = path.join(msPwDir, dir, 'chrome-win64', 'chrome.exe');
        if (fs.existsSync(exe)) {
          pwBrowserInstalled = true;
          pwPath = exe;
          break;
        }
      }
    }

    return {
      checkedAt: new Date().toISOString(),
      integrations: [
        {
          id: 'google-drive',
          name: 'Google Drive (Streaming G:\\)',
          status: driveConnected ? 'connected' : 'disconnected',
          verified: true,
          detail: driveConnected
            ? `Unidade em streaming conectada em ${this.driveRoot} (leitura segura verificada).`
            : `Raiz ${this.driveRoot} não encontrada neste momento.`,
        },
        {
          id: 'github',
          name: 'Git / GitHub CLI',
          status: gitCheck.installed ? 'connected' : 'disconnected',
          verified: true,
          detail: gitCheck.installed
            ? `Git em ${gitCheck.path}${ghCheck.installed ? ` · gh CLI ativo` : ''}`
            : 'Git não localizado no PATH.',
        },
        {
          id: 'mcp-gateway',
          name: 'Gateway MCP Local (CORE-03)',
          status: !this.closed ? 'connected' : 'disconnected',
          verified: true,
          detail: `Loopback 127.0.0.1 (${this.mcpHttpInfo?.url ?? 'middleware ativo'}) · Origin allowlist + Bearer token curto.`,
        },
        {
          id: 'keepassxc',
          name: 'KeePassXC + Adaptador CORE-05',
          status: kpCheck.installed ? 'connected' : 'unknown',
          verified: true,
          detail: kpCheck.installed
            ? `CLI localizado em ${kpCheck.path} · Cofre real permanece fechado; testes usam FictitiousVaultProvider.`
            : 'Executável KeePassXC não localizado; modo fictício disponível.',
        },
        {
          id: 'playwright',
          name: 'Playwright Chromium Isolado',
          status: pwBrowserInstalled ? 'connected' : 'unknown',
          verified: true,
          detail: pwBrowserInstalled
            ? `Chromium headless isolado em ${pwPath}`
            : 'Chromium do Playwright não detectado no cache local.',
        },
        {
          id: 'tauri-sidecar',
          name: 'Tauri 2 + Núcleo Node/SQLite',
          status: !this.closed ? 'connected' : 'disconnected',
          verified: true,
          detail: `SQLite WAL em ${this.config.dbPath} (Node ${process.versions.node}, PID ${process.pid}).`,
        },
        {
          id: 'desktop-commander',
          name: 'Desktop Commander (Ponte Remota)',
          status: 'unknown',
          verified: false,
          detail: 'DESCONHECIDO · ponte celular ainda não conectada nem verificada nesta etapa.',
        },
        {
          id: 'hostinger',
          name: 'Hostinger (Publicação / API)',
          status: 'unknown',
          verified: false,
          detail: 'DESCONHECIDO · integração de deploy permanece desativada e exige aprovação futura.',
        },
      ],
    };
  }
}
