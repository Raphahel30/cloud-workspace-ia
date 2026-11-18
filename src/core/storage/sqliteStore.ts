import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { EvidenceOrigin, SourceTrust } from '../../core-contracts/agentState.ts';

export interface ProjectRecord {
  id: string;
  slug: string;
  name: string;
  stack: string;
  status: string;
  localPath: string | null;
  drivePath: string | null;
  githubRepo: string | null;
  reviewStatus: string;
  updatedAt: string;
}

export interface ManifestEntryRecord {
  projectId: string;
  relativePath: string;
  sizeBytes: number;
  checksum: string | null;
  sensitivity: 'public' | 'secret-name-only';
  lastSyncedAt: string | null;
}

export interface WorkspaceRecord {
  id: string;
  projectId: string;
  runId: string;
  agentId: string;
  localPath: string;
  branch: string;
  createdAt: string;
  state: string;
  bytesUsed: number;
}

export interface AgentRecord {
  name: string;
  kind: string;
  executable: string | null;
  version: string | null;
  mcpMethod: string | null;
  observedState: string;
  lastSignalAt: string | null;
}

export interface AgentEventRecord {
  id?: number;
  agentId: string;
  runId: string | null;
  origin: EvidenceOrigin;
  trust: SourceTrust;
  open: boolean | null;
  taskStatus: 'running' | 'waiting-approval' | 'failed' | 'completed' | null;
  taskId: string | null;
  observedAtMs: number;
}

export interface TaskRecord {
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

export interface ApprovalRecord {
  id: string;
  actionType: string;
  scope: string;
  target: string;
  decision: 'pending' | 'approved' | 'rejected';
  author: string;
  expiresAt: string | null;
  planHash: string;
  createdAt: string;
}

export interface SyncJobRecord {
  id: string;
  sourcePath: string;
  targetPath: string;
  baseManifestHash: string | null;
  state: string;
  attempts: number;
  lastError: string | null;
  verified: boolean;
  updatedAt: string;
}

export interface BackupRecord {
  id: string;
  projectId: string;
  target: string;
  snapshotPath: string;
  sha256: string | null;
  restoreState: string;
  retentionGroup: string;
  createdAt: string;
}

export interface AuditEventRecord {
  id?: number;
  subject: string;
  action: string;
  scope: string;
  occurredAt: string;
  status: 'ok' | 'denied' | 'error';
  safeDetails: string;
  version?: string | null;
  origin?: string | null;
}

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bgh[pousr]_[A-Za-z0-9_]{12,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
  [/\bgithub_pat_[A-Za-z0-9_]{16,}\b/g, '[REDACTED_GITHUB_PAT]'],
  [/\bAIza[0-9A-Za-z\-_]{20,}\b/g, '[REDACTED_GOOGLE_KEY]'],
  [/\bsk-[A-Za-z0-9\-_]{16,}\b/g, '[REDACTED_API_KEY]'],
  [/\b(Bearer)\s+[A-Za-z0-9\-._~+/]+=*/gi, '$1 [REDACTED_BEARER]'],
  [/\b(TOKEN|PASSWORD|PASS|SECRET|API_KEY|MASTER_KEY|KDBX_KEY)\s*[:=]\s*("[^"]*"|'[^']*'|\S+)/gi, '$1=[REDACTED]'],
];

/** Masks tokens, keys, and passwords before writing logs or audit records. */
export function redactSecrets(input: string): string {
  let out = input;
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stack TEXT NOT NULL,
  status TEXT NOT NULL,
  local_path TEXT,
  drive_path TEXT,
  github_repo TEXT,
  review_status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_files_manifest (
  project_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum TEXT,
  sensitivity TEXT NOT NULL,
  last_synced_at TEXT,
  PRIMARY KEY (project_id, relative_path),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  local_path TEXT NOT NULL,
  branch TEXT NOT NULL,
  created_at TEXT NOT NULL,
  state TEXT NOT NULL,
  bytes_used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agents (
  name TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  executable TEXT,
  version TEXT,
  mcp_method TEXT,
  observed_state TEXT NOT NULL,
  last_signal_at TEXT
);

CREATE TABLE IF NOT EXISTS agent_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  run_id TEXT,
  origin TEXT NOT NULL,
  trust TEXT NOT NULL,
  open INTEGER,
  task_status TEXT,
  task_id TEXT,
  observed_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_events_agent_time
  ON agent_events (agent_id, observed_at_ms DESC, id DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  origin TEXT NOT NULL,
  trust TEXT NOT NULL,
  executor TEXT NOT NULL,
  command_profile TEXT NOT NULL,
  status TEXT NOT NULL,
  resumable INTEGER NOT NULL DEFAULT 0,
  started_at_ms INTEGER NOT NULL,
  observed_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  sanitized_log TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  action_type TEXT NOT NULL,
  scope TEXT NOT NULL,
  target TEXT NOT NULL,
  decision TEXT NOT NULL,
  author TEXT NOT NULL,
  expires_at TEXT,
  plan_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  source_path TEXT NOT NULL,
  target_path TEXT NOT NULL,
  base_manifest_hash TEXT,
  state TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS backup_records (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  target TEXT NOT NULL,
  snapshot_path TEXT NOT NULL,
  sha256 TEXT,
  restore_state TEXT NOT NULL,
  retention_group TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  action TEXT NOT NULL,
  scope TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  status TEXT NOT NULL,
  safe_details TEXT NOT NULL,
  version TEXT,
  origin TEXT
);
`;

export class SqliteStore {
  readonly db: DatabaseSync;
  readonly dbPath: string;

  constructor(dbPath = ':memory:') {
    this.dbPath = dbPath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    this.db = new DatabaseSync(dbPath);
    if (dbPath !== ':memory:') {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }
    this.db.exec('PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON;');
    this.db.exec(SCHEMA_SQL);
  }

  pragma(name: 'journal_mode' | 'foreign_keys' | 'synchronous'): unknown {
    const row = this.db.prepare(`PRAGMA ${name};`).get() as Record<string, unknown> | undefined;
    return row ? Object.values(row)[0] : undefined;
  }

  upsertProject(project: ProjectRecord): void {
    this.db
      .prepare(`
        INSERT INTO projects (id, slug, name, stack, status, local_path, drive_path, github_repo, review_status, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          name = excluded.name,
          stack = excluded.stack,
          status = excluded.status,
          local_path = excluded.local_path,
          drive_path = excluded.drive_path,
          github_repo = excluded.github_repo,
          review_status = excluded.review_status,
          updated_at = excluded.updated_at
      `)
      .run(
        project.id,
        project.slug,
        project.name,
        project.stack,
        project.status,
        project.localPath,
        project.drivePath,
        project.githubRepo,
        project.reviewStatus,
        project.updatedAt,
      );
  }

  listProjects(): ProjectRecord[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY slug ASC').all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      name: String(r.name),
      stack: String(r.stack),
      status: String(r.status),
      localPath: r.local_path === null ? null : String(r.local_path),
      drivePath: r.drive_path === null ? null : String(r.drive_path),
      githubRepo: r.github_repo === null ? null : String(r.github_repo),
      reviewStatus: String(r.review_status),
      updatedAt: String(r.updated_at),
    }));
  }

  getProject(idOrSlug: string): ProjectRecord | null {
    const r = this.db
      .prepare('SELECT * FROM projects WHERE id = ? OR slug = ? LIMIT 1')
      .get(idOrSlug, idOrSlug) as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      slug: String(r.slug),
      name: String(r.name),
      stack: String(r.stack),
      status: String(r.status),
      localPath: r.local_path === null ? null : String(r.local_path),
      drivePath: r.drive_path === null ? null : String(r.drive_path),
      githubRepo: r.github_repo === null ? null : String(r.github_repo),
      reviewStatus: String(r.review_status),
      updatedAt: String(r.updated_at),
    };
  }

  replaceProjectManifest(projectId: string, entries: ReadonlyArray<ManifestEntryRecord>): void {
    this.db.exec('BEGIN IMMEDIATE;');
    try {
      this.db.prepare('DELETE FROM project_files_manifest WHERE project_id = ?').run(projectId);
      const insert = this.db.prepare(`
        INSERT INTO project_files_manifest (project_id, relative_path, size_bytes, checksum, sensitivity, last_synced_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const entry of entries) {
        insert.run(
          projectId,
          entry.relativePath,
          entry.sizeBytes,
          entry.checksum,
          entry.sensitivity,
          entry.lastSyncedAt,
        );
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  listProjectManifest(projectId: string): ManifestEntryRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM project_files_manifest WHERE project_id = ? ORDER BY relative_path ASC')
      .all(projectId) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      projectId: String(r.project_id),
      relativePath: String(r.relative_path),
      sizeBytes: Number(r.size_bytes),
      checksum: r.checksum === null ? null : String(r.checksum),
      sensitivity: r.sensitivity === 'secret-name-only' ? 'secret-name-only' : 'public',
      lastSyncedAt: r.last_synced_at === null ? null : String(r.last_synced_at),
    }));
  }

  upsertWorkspace(ws: WorkspaceRecord): void {
    this.db
      .prepare(`
        INSERT INTO workspaces (id, project_id, run_id, agent_id, local_path, branch, created_at, state, bytes_used)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          state = excluded.state,
          bytes_used = excluded.bytes_used
      `)
      .run(
        ws.id,
        ws.projectId,
        ws.runId,
        ws.agentId,
        ws.localPath,
        ws.branch,
        ws.createdAt,
        ws.state,
        ws.bytesUsed,
      );
  }

  getWorkspace(id: string): WorkspaceRecord | null {
    const r = this.db
      .prepare('SELECT * FROM workspaces WHERE id = ? LIMIT 1')
      .get(id) as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      projectId: String(r.project_id),
      runId: String(r.run_id),
      agentId: String(r.agent_id),
      localPath: String(r.local_path),
      branch: String(r.branch),
      createdAt: String(r.created_at),
      state: String(r.state),
      bytesUsed: Number(r.bytes_used),
    };
  }

  listWorkspaces(projectId?: string): WorkspaceRecord[] {
    const rows = (
      projectId
        ? this.db.prepare('SELECT * FROM workspaces WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
        : this.db.prepare('SELECT * FROM workspaces ORDER BY created_at DESC').all()
    ) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      runId: String(r.run_id),
      agentId: String(r.agent_id),
      localPath: String(r.local_path),
      branch: String(r.branch),
      createdAt: String(r.created_at),
      state: String(r.state),
      bytesUsed: Number(r.bytes_used),
    }));
  }

  upsertAgent(agent: AgentRecord): void {
    this.db
      .prepare(`
        INSERT INTO agents (name, kind, executable, version, mcp_method, observed_state, last_signal_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          kind = excluded.kind,
          executable = excluded.executable,
          version = excluded.version,
          mcp_method = excluded.mcp_method,
          observed_state = excluded.observed_state,
          last_signal_at = excluded.last_signal_at
      `)
      .run(
        agent.name,
        agent.kind,
        agent.executable,
        agent.version,
        agent.mcpMethod,
        agent.observedState,
        agent.lastSignalAt,
      );
  }

  recordAgentEvent(event: AgentEventRecord): number {
    const info = this.db
      .prepare(`
        INSERT INTO agent_events (agent_id, run_id, origin, trust, open, task_status, task_id, observed_at_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        event.agentId,
        event.runId,
        event.origin,
        event.trust,
        event.open === null ? null : event.open ? 1 : 0,
        event.taskStatus,
        event.taskId,
        event.observedAtMs,
      );
    return Number(info.lastInsertRowid);
  }

  getLatestAgentEvents(): AgentEventRecord[] {
    const rows = this.db
      .prepare(`
        SELECT e.*
        FROM agent_events e
        INNER JOIN (
          SELECT agent_id, MAX(id) AS max_id
          FROM agent_events
          GROUP BY agent_id
        ) latest ON e.id = latest.max_id
        ORDER BY e.agent_id ASC
      `)
      .all() as Array<Record<string, unknown>>;

    return rows.map((r) => ({
      id: Number(r.id),
      agentId: String(r.agent_id),
      runId: r.run_id === null ? null : String(r.run_id),
      origin: String(r.origin) as EvidenceOrigin,
      trust: String(r.trust) as SourceTrust,
      open: r.open === null ? null : Number(r.open) === 1,
      taskStatus:
        r.task_status === null
          ? null
          : (String(r.task_status) as AgentEventRecord['taskStatus']),
      taskId: r.task_id === null ? null : String(r.task_id),
      observedAtMs: Number(r.observed_at_ms),
    }));
  }

  upsertTask(task: TaskRecord): void {
    this.db
      .prepare(`
        INSERT INTO tasks (
          id, project_id, origin, trust, executor, command_profile, status,
          resumable, started_at_ms, observed_at_ms, finished_at_ms, sanitized_log
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          resumable = excluded.resumable,
          observed_at_ms = excluded.observed_at_ms,
          finished_at_ms = excluded.finished_at_ms,
          sanitized_log = excluded.sanitized_log
      `)
      .run(
        task.id,
        task.projectId,
        task.origin,
        task.trust,
        task.executor,
        task.commandProfile,
        task.status,
        task.resumable ? 1 : 0,
        task.startedAtMs,
        task.observedAtMs,
        task.finishedAtMs,
        redactSecrets(task.sanitizedLog),
      );
  }

  listTasks(): TaskRecord[] {
    const rows = this.db.prepare('SELECT * FROM tasks ORDER BY started_at_ms DESC').all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      projectId: String(r.project_id),
      origin: String(r.origin) as TaskRecord['origin'],
      trust: String(r.trust) as SourceTrust,
      executor: String(r.executor),
      commandProfile: String(r.command_profile),
      status: String(r.status) as TaskRecord['status'],
      resumable: Number(r.resumable) === 1,
      startedAtMs: Number(r.started_at_ms),
      observedAtMs: Number(r.observed_at_ms),
      finishedAtMs: r.finished_at_ms === null ? null : Number(r.finished_at_ms),
      sanitizedLog: String(r.sanitized_log),
    }));
  }

  recordApproval(approval: ApprovalRecord): void {
    this.db
      .prepare(`
        INSERT INTO approvals (id, action_type, scope, target, decision, author, expires_at, plan_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          decision = excluded.decision,
          author = excluded.author,
          expires_at = excluded.expires_at
      `)
      .run(
        approval.id,
        approval.actionType,
        approval.scope,
        approval.target,
        approval.decision,
        approval.author,
        approval.expiresAt,
        approval.planHash,
        approval.createdAt,
      );
  }

  listApprovals(): ApprovalRecord[] {
    const rows = this.db.prepare('SELECT * FROM approvals ORDER BY created_at DESC').all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      actionType: String(r.action_type),
      scope: String(r.scope),
      target: String(r.target),
      decision: String(r.decision) as ApprovalRecord['decision'],
      author: String(r.author),
      expiresAt: r.expires_at === null ? null : String(r.expires_at),
      planHash: String(r.plan_hash),
      createdAt: String(r.created_at),
    }));
  }

  upsertSyncJob(job: SyncJobRecord): void {
    this.db
      .prepare(`
        INSERT INTO sync_jobs (id, source_path, target_path, base_manifest_hash, state, attempts, last_error, verified, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          base_manifest_hash = excluded.base_manifest_hash,
          state = excluded.state,
          attempts = excluded.attempts,
          last_error = excluded.last_error,
          verified = excluded.verified,
          updated_at = excluded.updated_at
      `)
      .run(
        job.id,
        job.sourcePath,
        job.targetPath,
        job.baseManifestHash,
        job.state,
        job.attempts,
        job.lastError ? redactSecrets(job.lastError) : null,
        job.verified ? 1 : 0,
        job.updatedAt,
      );
  }

  listSyncJobs(): SyncJobRecord[] {
    const rows = this.db.prepare('SELECT * FROM sync_jobs ORDER BY updated_at DESC').all() as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: String(r.id),
      sourcePath: String(r.source_path),
      targetPath: String(r.target_path),
      baseManifestHash: r.base_manifest_hash === null ? null : String(r.base_manifest_hash),
      state: String(r.state),
      attempts: Number(r.attempts),
      lastError: r.last_error === null ? null : String(r.last_error),
      verified: Number(r.verified) === 1,
      updatedAt: String(r.updated_at),
    }));
  }

  recordBackup(backup: BackupRecord): void {
    this.db
      .prepare(`
        INSERT INTO backup_records (id, project_id, target, snapshot_path, sha256, restore_state, retention_group, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          restore_state = excluded.restore_state
      `)
      .run(
        backup.id,
        backup.projectId,
        backup.target,
        backup.snapshotPath,
        backup.sha256,
        backup.restoreState,
        backup.retentionGroup,
        backup.createdAt,
      );
  }

  getBackupRecord(id: string): BackupRecord | null {
    const r = this.db
      .prepare('SELECT * FROM backup_records WHERE id = ? LIMIT 1')
      .get(id) as Record<string, unknown> | undefined;
    if (!r) return null;
    return {
      id: String(r.id),
      projectId: String(r.project_id),
      target: String(r.target),
      snapshotPath: String(r.snapshot_path),
      sha256: r.sha256 === null ? null : String(r.sha256),
      restoreState: String(r.restore_state),
      retentionGroup: String(r.retention_group),
      createdAt: String(r.created_at),
    };
  }

  listTableNames(): string[] {
    const rows = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name ASC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((r) => String(r.name));
  }

  appendAuditEvent(event: AuditEventRecord): number {
    const info = this.db
      .prepare(`
        INSERT INTO audit_events (subject, action, scope, occurred_at, status, safe_details, version, origin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        event.subject,
        event.action,
        event.scope,
        event.occurredAt,
        event.status,
        redactSecrets(event.safeDetails),
        event.version ?? null,
        event.origin ?? null,
      );
    return Number(info.lastInsertRowid);
  }

  listAuditEvents(limit = 100): AuditEventRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM audit_events ORDER BY id DESC LIMIT ?')
      .all(limit) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      id: Number(r.id),
      subject: String(r.subject),
      action: String(r.action),
      scope: String(r.scope),
      occurredAt: String(r.occurred_at),
      status: String(r.status) as AuditEventRecord['status'],
      safeDetails: String(r.safe_details),
      version: r.version === null ? null : String(r.version),
      origin: r.origin === null ? null : String(r.origin),
    }));
  }

  close(): void {
    this.db.close();
  }
}
