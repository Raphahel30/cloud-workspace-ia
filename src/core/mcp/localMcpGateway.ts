import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { authorize, canCleanup, isAgentBranch, type Operation } from '../../lib/policy.ts';
import { isSensitiveFileName } from '../catalog/driveCatalog.ts';
import { ALLOWED_TAURI_ORIGINS } from '../runtime/tauriSidecarRuntime.ts';
import { redactSecrets, type SqliteStore } from '../storage/sqliteStore.ts';
import { resolveConfinedWorkspacePath, type WorkspaceManager } from '../workspaces/workspaceManager.ts';

const execFileAsync = promisify(execFile);

export interface AllowedCommandSpec {
  id: string;
  stack: string;
  executable: string;
  args: ReadonlyArray<string>;
  description: string;
}

export const COMMAND_ALLOWLIST_BY_STACK: Readonly<Record<string, AllowedCommandSpec>> = {
  'node-vitest': {
    id: 'node-vitest',
    stack: 'node',
    executable: 'npm',
    args: ['run', 'test'],
    description: 'Run isolated Vitest suite',
  },
  'node-tsc': {
    id: 'node-tsc',
    stack: 'node',
    executable: 'npx',
    args: ['tsc', '--noEmit'],
    description: 'Type-check TypeScript project',
  },
  'node-policy': {
    id: 'node-policy',
    stack: 'node',
    executable: 'npm',
    args: ['run', 'test:policy'],
    description: 'Run policy contract tests',
  },
  'rust-cargo-check': {
    id: 'rust-cargo-check',
    stack: 'rust',
    executable: 'cargo',
    args: ['check'],
    description: 'Check Tauri Rust crate compilation',
  },
  'python-pytest': {
    id: 'python-pytest',
    stack: 'python',
    executable: 'python',
    args: ['-m', 'pytest', '-q'],
    description: 'Run Python unit test suite',
  },
};

export interface McpSessionContext {
  tokenHash: string;
  agentId: string;
  allowedProjects: ReadonlyArray<string>;
  allowedOperations: ReadonlyArray<Operation>;
  branch: string;
  connectedToProduction: boolean;
  explicitApprovals: ReadonlyArray<Operation>;
  commandAllowlisted: ReadonlyArray<string>;
  expiresAtMs: number;
}

export interface CommandRunnerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type CommandRunnerFn = (
  spec: AllowedCommandSpec,
  cwd: string,
) => Promise<CommandRunnerResult>;

export type GitRunnerFn = (
  action: 'diff' | 'commit' | 'push',
  workspaceDir: string,
  options: { branch: string; message?: string },
) => Promise<{ ok: boolean; output: string }>;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export const MCP_TOOL_NAMES = [
  'projects_list',
  'project_get',
  'workspace_prepare',
  'workspace_status',
  'files_read',
  'files_patch',
  'tests_run',
  'tests_status',
  'tests_logs',
  'git_diff',
  'git_commit_branch',
  'git_push_branch',
  'sync_checkpoint',
  'cleanup_preview',
] as const;

export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

const SHELL_METACHARS = /[;&|><$`\r\n]/;

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function defaultCommandRunner(spec: AllowedCommandSpec, cwd: string): Promise<CommandRunnerResult> {
  return execFileAsync(spec.executable, [...spec.args], {
    cwd,
    shell: false,
    timeout: 60_000,
    windowsHide: true,
  })
    .then(({ stdout, stderr }) => ({ exitCode: 0, stdout, stderr }))
    .catch((err: unknown) => {
      const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
      return {
        exitCode: typeof e.code === 'number' ? e.code : 1,
        stdout: e.stdout ?? '',
        stderr: e.stderr ?? e.message ?? 'Command execution failed',
      };
    });
}

function defaultGitRunner(
  action: 'diff' | 'commit' | 'push',
  workspaceDir: string,
  options: { branch: string; message?: string },
): Promise<{ ok: boolean; output: string }> {
  const args =
    action === 'diff'
      ? ['diff', '--stat']
      : action === 'commit'
        ? ['commit', '-am', options.message ?? 'agent checkpoint']
        : ['push', 'origin', options.branch];
  return execFileAsync('git', args, {
    cwd: workspaceDir,
    shell: false,
    timeout: 20_000,
    windowsHide: true,
  })
    .then(({ stdout, stderr }) => ({ ok: true, output: `${stdout}${stderr}`.trim() }))
    .catch((err: unknown) => {
      const e = err as { stdout?: string; stderr?: string; message?: string };
      return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}${e.message ?? ''}`.trim() };
    });
}

export function isAllowedHttpOrigin(originHeader: string | undefined): boolean {
  if (!originHeader || originHeader.trim() === '') {
    // Non-browser local CLI / IPC calls do not send Origin; authenticated still via Bearer token.
    return true;
  }
  return ALLOWED_TAURI_ORIGINS.includes(originHeader.trim().toLowerCase());
}

/**
 * CORE-03: Local MCP Gateway supporting JSON-RPC 2.0 over `stdio` and loopback HTTP (`127.0.0.1`),
 * bearer session authentication, `Origin` validation, strict path confinement, command allowlisting,
 * policy enforcement, and verified evidence emission to SQLite.
 */
export class LocalMcpGateway {
  readonly store: SqliteStore;
  readonly workspaces: WorkspaceManager;
  private readonly runCommand: CommandRunnerFn;
  private readonly runGit: GitRunnerFn;
  private readonly sessions = new Map<string, McpSessionContext>();
  private readonly testRuns = new Map<
    string,
    { taskId: string; projectId: string; status: 'running' | 'completed' | 'failed'; sanitizedLog: string }
  >();
  private httpServer: http.Server | null = null;

  constructor(options: {
    store: SqliteStore;
    workspaces: WorkspaceManager;
    commandRunner?: CommandRunnerFn;
    gitRunner?: GitRunnerFn;
  }) {
    this.store = options.store;
    this.workspaces = options.workspaces;
    this.runCommand = options.commandRunner ?? defaultCommandRunner;
    this.runGit = options.gitRunner ?? defaultGitRunner;
  }

  /** Issues a short-lived project/operation/branch-scoped Bearer token for an agent session. */
  issueSessionToken(params: {
    agentId: string;
    allowedProjects: ReadonlyArray<string>;
    allowedOperations: ReadonlyArray<Operation>;
    branch: string;
    connectedToProduction?: boolean;
    explicitApprovals?: ReadonlyArray<Operation>;
    commandAllowlisted?: ReadonlyArray<string>;
    ttlMs?: number;
    nowMs?: number;
  }): { token: string; expiresAtMs: number } {
    const token = `cw_mcp_${crypto.randomBytes(24).toString('hex')}`;
    const nowMs = params.nowMs ?? Date.now();
    const ttlMs = params.ttlMs ?? 15 * 60 * 1000;
    const expiresAtMs = nowMs + ttlMs;
    const tokenHash = hashToken(token);
    this.sessions.set(tokenHash, {
      tokenHash,
      agentId: params.agentId,
      allowedProjects: [...params.allowedProjects],
      allowedOperations: [...params.allowedOperations],
      branch: params.branch,
      connectedToProduction: params.connectedToProduction ?? false,
      explicitApprovals: [...(params.explicitApprovals ?? [])],
      commandAllowlisted: [...(params.commandAllowlisted ?? [])],
      expiresAtMs,
    });
    return { token, expiresAtMs };
  }

  authenticateToken(rawToken: string | undefined, nowMs: number = Date.now()): McpSessionContext | null {
    if (!rawToken) return null;
    const session = this.sessions.get(hashToken(rawToken));
    if (!session) return null;
    if (nowMs >= session.expiresAtMs) {
      this.sessions.delete(session.tokenHash);
      return null;
    }
    return session;
  }

  /** Handles one line of JSON-RPC 2.0 `stdio` input using a session Bearer token. */
  async handleStdioLine(
    line: string,
    rawToken: string | undefined,
    nowMs: number = Date.now(),
  ): Promise<string> {
    const req = JSON.parse(line) as JsonRpcRequest;
    const response = await this.handleJsonRpcRequest(req, rawToken, nowMs);
    return JSON.stringify(response);
  }

  async handleJsonRpcRequest(
    req: JsonRpcRequest,
    rawToken: string | undefined,
    nowMs: number = Date.now(),
  ): Promise<JsonRpcResponse> {
    if (req.jsonrpc !== '2.0' || !req.method) {
      return { jsonrpc: '2.0', id: req.id ?? null, error: { code: -32600, message: 'Invalid JSON-RPC request' } };
    }

    const session = this.authenticateToken(rawToken, nowMs);
    if (!session) {
      this.store.appendAuditEvent({
        subject: 'unknown-client',
        action: `mcp:${req.method}`,
        scope: 'auth',
        occurredAt: new Date(nowMs).toISOString(),
        status: 'denied',
        safeDetails: 'Unauthorized or expired MCP session token.',
        origin: 'core-03',
      });
      return { jsonrpc: '2.0', id: req.id, error: { code: -32001, message: 'Unauthorized or expired MCP token' } };
    }

    if (req.method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          serverInfo: { name: 'cloud-workspace-mcp', version: '0.3.0' },
          capabilities: { tools: {} },
        },
      };
    }

    if (req.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          tools: MCP_TOOL_NAMES.map((name) => ({ name })),
        },
      };
    }

    if (req.method === 'tools/call') {
      const toolName = String(req.params?.name ?? '');
      const toolArgs = (req.params?.arguments as Record<string, unknown> | undefined) ?? {};
      try {
        const result = await this.executeTool(toolName, toolArgs, session, nowMs);
        return { jsonrpc: '2.0', id: req.id, result };
      } catch (err) {
        const message = redactSecrets(err instanceof Error ? err.message : String(err));
        return { jsonrpc: '2.0', id: req.id, error: { code: -32002, message } };
      }
    }

    return { jsonrpc: '2.0', id: req.id, error: { code: -32601, message: `Method not found: ${req.method}` } };
  }

  /** Starts the loopback-only HTTP MCP server on `127.0.0.1` with Origin + Bearer enforcement. */
  async startHttpServer(port = 0): Promise<{ host: string; port: number; url: string }> {
    if (this.httpServer) {
      const addr = this.httpServer.address();
      if (addr && typeof addr !== 'string') {
        return { host: '127.0.0.1', port: addr.port, url: `http://127.0.0.1:${addr.port}/mcp` };
      }
    }

    this.httpServer = http.createServer((req, res) => {
      const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
      if (!isAllowedHttpOrigin(originHeader)) {
        this.store.appendAuditEvent({
          subject: 'http-client',
          action: 'mcp_http_origin_check',
          scope: 'network',
          occurredAt: new Date().toISOString(),
          status: 'denied',
          safeDetails: `Rejected disallowed Origin header: ${originHeader}`,
          origin: 'core-03',
        });
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Origin not allowed (DNS rebinding guard).' }));
        return;
      }

      if (req.url !== '/mcp' || req.method !== 'POST') {
        res.writeHead(req.url !== '/mcp' ? 404 : 405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Only POST /mcp is supported.' }));
        return;
      }

      const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined;

      const chunks: Buffer[] = [];
      let totalSize = 0;
      const maxBodyBytes = 1024 * 1024;
      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > maxBodyBytes) {
          req.destroy(new Error('Payload too large'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let parsed: JsonRpcRequest;
        try {
          parsed = JSON.parse(raw) as JsonRpcRequest;
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Malformed JSON body' }));
          return;
        }
        void this.handleJsonRpcRequest(parsed, token).then((rpcRes) => {
          const status = rpcRes.error?.code === -32001 ? 401 : 200;
          res.writeHead(status, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(rpcRes));
        });
      });
    });

    await new Promise<void>((resolve) => {
      this.httpServer!.listen(port, '127.0.0.1', () => resolve());
    });
    const addr = this.httpServer.address();
    const boundPort = addr && typeof addr !== 'string' ? addr.port : port;
    return { host: '127.0.0.1', port: boundPort, url: `http://127.0.0.1:${boundPort}/mcp` };
  }

  async stopHttpServer(): Promise<void> {
    if (!this.httpServer) return;
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.close((err) => (err ? reject(err) : resolve()));
    });
    this.httpServer = null;
  }

  private assertPermission(
    session: McpSessionContext,
    projectId: string | undefined,
    operation: Operation,
    commandProfile?: string,
  ): void {
    const projectAuthorized = projectId ? session.allowedProjects.includes(projectId) : session.allowedProjects.length > 0;
    if (!session.allowedOperations.includes(operation)) {
      throw new Error(`Operation '${operation}' not granted in MCP session scope.`);
    }
    const decision = authorize(operation, {
      projectAuthorized,
      branch: session.branch,
      connectedToProduction: session.connectedToProduction,
      explicitApproval: session.explicitApprovals.includes(operation),
      commandAllowlisted: commandProfile ? session.commandAllowlisted.includes(commandProfile) : false,
    });
    if (!decision.allowed) {
      throw new Error(decision.reason);
    }
  }

  private async executeTool(
    toolName: string,
    args: Record<string, unknown>,
    session: McpSessionContext,
    nowMs: number,
  ): Promise<unknown> {
    const nowIso = new Date(nowMs).toISOString();
    const auditOk = (scope: string, details: string) => {
      this.store.appendAuditEvent({
        subject: session.agentId,
        action: `mcp:${toolName}`,
        scope,
        occurredAt: nowIso,
        status: 'ok',
        safeDetails: details,
        origin: 'core-03',
      });
    };

    try {
      switch (toolName) {
        case 'projects_list': {
          this.assertPermission(session, undefined, 'inspect');
          const projects = this.store.listProjects().filter((p) => session.allowedProjects.includes(p.id));
          auditOk('projects', `Listed ${projects.length} authorized project(s).`);
          return { projects };
        }
        case 'project_get': {
          const projectId = String(args.projectId ?? '');
          this.assertPermission(session, projectId, 'inspect');
          const project = this.store.getProject(projectId);
          if (!project) throw new Error(`Project not found: ${projectId}`);
          auditOk(projectId, `Fetched metadata for ${projectId}.`);
          return { project, manifestCount: this.store.listProjectManifest(project.id).length };
        }
        case 'workspace_prepare': {
          const projectId = String(args.projectId ?? '');
          const sourceDir = String(args.sourceDir ?? '');
          const runId = String(args.runId ?? `run-${nowMs}`);
          this.assertPermission(session, projectId, 'edit_sandbox');
          if (!sourceDir) throw new Error('sourceDir is required');
          const ws = this.workspaces.prepareWorkspace({
            projectId,
            sourceDir,
            agentId: session.agentId,
            branch: session.branch,
            runId,
          });
          auditOk(projectId, `Prepared workspace ${ws.id}`);
          return { workspaceId: ws.id, localPath: ws.localPath, state: ws.state, baseManifestHash: ws.baseManifestHash };
        }
        case 'workspace_status': {
          const workspaceId = String(args.workspaceId ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'read');
          auditOk(ws.projectId, `Read status for ${workspaceId}`);
          return ws;
        }
        case 'files_read': {
          const workspaceId = String(args.workspaceId ?? '');
          const relativePath = String(args.relativePath ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'read');
          if (isSensitiveFileName(path.basename(relativePath))) {
            throw new Error(`Sensitive file access blocked: ${relativePath}`);
          }
          const content = this.workspaces.readWorkspaceFile(workspaceId, relativePath);
          auditOk(ws.projectId, `Read confined file ${relativePath}`);
          return { relativePath, content };
        }
        case 'files_patch': {
          const workspaceId = String(args.workspaceId ?? '');
          const relativePath = String(args.relativePath ?? '');
          const content = String(args.content ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'edit_sandbox');
          if (isSensitiveFileName(path.basename(relativePath))) {
            throw new Error(`Sensitive file modification blocked: ${relativePath}`);
          }
          // Validate boundary strictly before patching
          resolveConfinedWorkspacePath(ws.localPath, relativePath);
          const updated = this.workspaces.applyWorkspacePatch(workspaceId, relativePath, content);
          auditOk(ws.projectId, `Patched ${relativePath} (sha256=${updated.sha256.slice(0, 12)})`);
          return updated;
        }
        case 'tests_run': {
          const workspaceId = String(args.workspaceId ?? '');
          const commandProfile = String(args.commandProfile ?? '');
          if (!commandProfile || SHELL_METACHARS.test(commandProfile)) {
            throw new Error(`Invalid or unsafe commandProfile: ${commandProfile}`);
          }
          const spec = COMMAND_ALLOWLIST_BY_STACK[commandProfile];
          if (!spec) {
            throw new Error(`Command profile not in allowlist: ${commandProfile}`);
          }
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'run_approved_test', commandProfile);

          const taskId = `task-${ws.runId}-${commandProfile}-${nowMs}`;
          this.workspaces.transitionState(workspaceId, 'TESTANDO');
          this.store.upsertTask({
            id: taskId,
            projectId: ws.projectId,
            origin: 'cloud-workspace',
            trust: 'verified',
            executor: session.agentId,
            commandProfile,
            status: 'running',
            resumable: true,
            startedAtMs: nowMs,
            observedAtMs: nowMs,
            finishedAtMs: null,
            sanitizedLog: `Started ${commandProfile}`,
          });
          this.store.recordAgentEvent({
            agentId: session.agentId,
            runId: ws.runId,
            origin: 'cloud-workspace-mcp',
            trust: 'verified',
            open: true,
            taskStatus: 'running',
            taskId,
            observedAtMs: nowMs,
          });

          const result = await this.runCommand(spec, ws.localPath);
          const sanitizedLog = redactSecrets(`${result.stdout}\n${result.stderr}`.trim());
          const status = result.exitCode === 0 ? 'completed' : 'failed';
          const finishMs = Date.now();
          this.testRuns.set(taskId, { taskId, projectId: ws.projectId, status, sanitizedLog });
          this.store.upsertTask({
            id: taskId,
            projectId: ws.projectId,
            origin: 'cloud-workspace',
            trust: 'verified',
            executor: session.agentId,
            commandProfile,
            status,
            resumable: true,
            startedAtMs: nowMs,
            observedAtMs: finishMs,
            finishedAtMs: finishMs,
            sanitizedLog,
          });
          this.store.recordAgentEvent({
            agentId: session.agentId,
            runId: ws.runId,
            origin: 'cloud-workspace-mcp',
            trust: 'verified',
            open: true,
            taskStatus: status === 'completed' ? 'completed' : 'failed',
            taskId,
            observedAtMs: finishMs,
          });
          if (status === 'completed') {
            this.workspaces.transitionState(workspaceId, 'AGUARDANDO_CHECKPOINT');
          }
          auditOk(ws.projectId, `Executed allowlisted test '${commandProfile}' -> ${status}`);
          return { taskId, exitCode: result.exitCode, status, sanitizedLog };
        }
        case 'tests_status': {
          const taskId = String(args.taskId ?? '');
          const run = this.testRuns.get(taskId);
          if (!run) throw new Error(`Test run not found: ${taskId}`);
          this.assertPermission(session, run.projectId, 'read');
          return { taskId: run.taskId, status: run.status };
        }
        case 'tests_logs': {
          const taskId = String(args.taskId ?? '');
          const run = this.testRuns.get(taskId);
          if (!run) throw new Error(`Test run not found: ${taskId}`);
          this.assertPermission(session, run.projectId, 'read');
          return { taskId: run.taskId, status: run.status, sanitizedLog: run.sanitizedLog };
        }
        case 'git_diff': {
          const workspaceId = String(args.workspaceId ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'read');
          const diff = await this.runGit('diff', ws.localPath, { branch: ws.branch });
          auditOk(ws.projectId, `Generated git diff on ${ws.branch}`);
          return { ok: diff.ok, output: redactSecrets(diff.output) };
        }
        case 'git_commit_branch': {
          const workspaceId = String(args.workspaceId ?? '');
          const message = String(args.message ?? 'agent checkpoint');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          if (!isAgentBranch(ws.branch)) throw new Error(`Refusing commit on non-agent branch: ${ws.branch}`);
          this.assertPermission(session, ws.projectId, 'commit_agent_branch');
          const res = await this.runGit('commit', ws.localPath, { branch: ws.branch, message });
          auditOk(ws.projectId, `Committed to agent branch ${ws.branch}`);
          return { ok: res.ok, branch: ws.branch, output: redactSecrets(res.output) };
        }
        case 'git_push_branch': {
          const workspaceId = String(args.workspaceId ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          if (!isAgentBranch(ws.branch)) throw new Error(`Refusing push on non-agent branch: ${ws.branch}`);
          this.assertPermission(session, ws.projectId, 'push_agent_branch');
          const res = await this.runGit('push', ws.localPath, { branch: ws.branch });
          auditOk(ws.projectId, `Pushed agent branch ${ws.branch}`);
          return { ok: res.ok, branch: ws.branch, output: redactSecrets(res.output) };
        }
        case 'sync_checkpoint': {
          const workspaceId = String(args.workspaceId ?? '');
          const targetDir = String(args.targetDir ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'edit_sandbox');
          if (!targetDir || !fs.existsSync(targetDir)) throw new Error('Valid targetDir is required');
          const syncRes = this.workspaces.syncCheckpoint({ workspaceId, targetDir });
          auditOk(ws.projectId, `Sync checkpoint ${syncRes.jobId} -> ${syncRes.state}`);
          return syncRes;
        }
        case 'cleanup_preview': {
          const workspaceId = String(args.workspaceId ?? '');
          const ws = this.workspaces.getState(workspaceId);
          if (!ws) throw new Error(`Workspace not found: ${workspaceId}`);
          this.assertPermission(session, ws.projectId, 'read');
          const approved = Boolean(args.approved ?? false);
          const filesOpen = Boolean(args.filesOpen ?? false);
          const eligible = canCleanup({
            approved,
            uploadsVerified: ws.uploadsVerified,
            filesOpen,
            conflicts: ws.conflictFiles.length > 0 || ws.state === 'CONFLITO',
            pendingChanges: ws.dirtyFiles.length > 0,
          });
          auditOk(ws.projectId, `Previewed cleanup eligibility=${eligible}`);
          return { workspaceId, eligible, uploadsVerified: ws.uploadsVerified, state: ws.state };
        }
        default:
          throw new Error(`Unknown MCP tool: ${toolName}`);
      }
    } catch (err) {
      const msg = redactSecrets(err instanceof Error ? err.message : String(err));
      this.store.appendAuditEvent({
        subject: session.agentId,
        action: `mcp:${toolName}`,
        scope: String(args.projectId ?? args.workspaceId ?? 'unknown'),
        occurredAt: nowIso,
        status: 'denied',
        safeDetails: msg,
        origin: 'core-03',
      });
      throw err;
    }
  }
}
