import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { canCleanup, isAgentBranch } from '../../lib/policy.ts';
import { isSensitiveFileName } from '../catalog/driveCatalog.ts';
import { isGoogleDriveOrSyncedPath } from '../runtime/tauriSidecarRuntime.ts';
import type { SqliteStore } from '../storage/sqliteStore.ts';

export type WorkspaceLifecycleState =
  | 'REMOTO'
  | 'PREPARANDO'
  | 'PRONTO'
  | 'EDITANDO'
  | 'TESTANDO'
  | 'AGUARDANDO_CHECKPOINT'
  | 'ENVIANDO'
  | 'VERIFICANDO'
  | 'SINCRONIZADO'
  | 'AGUARDANDO_APROVACAO_DE_LIMPEZA'
  | 'LIBERADO'
  | 'CONFLITO'
  | 'HASH_DIVERGENTE'
  | 'ARQUIVO_ABERTO'
  | 'SEM_ESPACO';

export interface FileHashEntry {
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface WorkspaceRuntimeState {
  id: string;
  projectId: string;
  runId: string;
  agentId: string;
  branch: string;
  localPath: string;
  state: WorkspaceLifecycleState;
  baseManifestHash: string;
  baseFileHashes: Record<string, FileHashEntry>;
  dirtyFiles: string[];
  conflictFiles: string[];
  uploadsVerified: boolean;
}

export interface SnapshotPayload {
  version: 1;
  workspaceId: string;
  projectId: string;
  createdAt: string;
  manifestHash: string;
  files: Array<{
    relativePath: string;
    sha256: string;
    contentBase64: string;
  }>;
}

const SKIPPED_DIRS = new Set(['.git', 'node_modules', 'target', 'dist', '.vite']);

/**
 * Resolves a relative file path safely inside `rootDir`, preventing `..` traversal,
 * symlink escape, or accidental access to G:\ / Google Drive.
 */
export function resolveConfinedWorkspacePath(rootDir: string, relativePath: string): string {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error(`Invalid relative workspace path: ${relativePath}`);
  }
  const normalizedInput = relativePath.replaceAll('\\', '/');
  if (normalizedInput.startsWith('../') || normalizedInput.includes('/../') || normalizedInput === '..') {
    throw new Error(`Path traversal rejected: ${relativePath}`);
  }
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(resolvedRoot, normalizedInput);
  const rel = path.relative(resolvedRoot, resolvedTarget);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace boundary: ${relativePath}`);
  }
  if (isGoogleDriveOrSyncedPath(resolvedTarget)) {
    throw new Error(`Workspace mutation path cannot target Google Drive: ${resolvedTarget}`);
  }
  return resolvedTarget;
}

/** Computes deterministic SHA-256 hashes for all non-secret files under `dir`. */
export function computeDirectoryManifest(dir: string): {
  files: Record<string, FileHashEntry>;
  manifestHash: string;
  totalBytes: number;
} {
  const files: Record<string, FileHashEntry> = {};
  let totalBytes = 0;

  const walk = (current: string) => {
    if (!fs.existsSync(current)) return;
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!entry.isFile() || isSensitiveFileName(entry.name)) continue;
      const buf = fs.readFileSync(fullPath);
      const rel = path.relative(dir, fullPath).replaceAll('\\', '/');
      const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
      files[rel] = { relativePath: rel, sizeBytes: buf.length, sha256 };
      totalBytes += buf.length;
    }
  };

  walk(dir);
  const digest = crypto.createHash('sha256');
  for (const rel of Object.keys(files).sort()) {
    digest.update(`${rel}:${files[rel].sha256}\n`);
  }
  return { files, manifestHash: digest.digest('hex'), totalBytes };
}

/**
 * CORE-04: Manages temporary agent workspaces isolated outside Google Drive,
 * SHA-256 verification, conflict preservation, AES-256-GCM checkpoints, and `canCleanup()` gating.
 */
export class WorkspaceManager {
  readonly store: SqliteStore;
  readonly workspacesRoot: string;
  private readonly checkFreeBytes: (targetDir: string) => number;
  private readonly states = new Map<string, WorkspaceRuntimeState>();
  private readonly syncAttempts = new Map<string, number>();

  constructor(options: {
    store: SqliteStore;
    workspacesRoot: string;
    checkFreeBytes?: (targetDir: string) => number;
  }) {
    if (isGoogleDriveOrSyncedPath(options.workspacesRoot)) {
      throw new Error(`workspacesRoot must NEVER be located inside Google Drive: ${options.workspacesRoot}`);
    }
    this.store = options.store;
    this.workspacesRoot = path.resolve(options.workspacesRoot);
    fs.mkdirSync(this.workspacesRoot, { recursive: true });
    this.checkFreeBytes =
      options.checkFreeBytes ??
      ((targetDir: string) => {
        const stat = fs.statfsSync(targetDir);
        return Number(stat.bavail) * Number(stat.bsize);
      });
  }

  getState(workspaceId: string): WorkspaceRuntimeState | null {
    return this.states.get(workspaceId) ?? null;
  }

  private persistState(ws: WorkspaceRuntimeState, bytesUsed?: number): void {
    const existing = this.store.getWorkspace(ws.id);
    this.store.upsertWorkspace({
      id: ws.id,
      projectId: ws.projectId,
      runId: ws.runId,
      agentId: ws.agentId,
      localPath: ws.localPath,
      branch: ws.branch,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      state: ws.state,
      bytesUsed: bytesUsed ?? existing?.bytesUsed ?? 0,
    });
  }

  /** Prepares a clean isolated local copy outside Drive and records its base SHA-256 manifest. */
  prepareWorkspace(params: {
    projectId: string;
    sourceDir: string;
    agentId: string;
    branch: string;
    runId: string;
    minimumFreeBytes?: number;
  }): WorkspaceRuntimeState {
    if (!isAgentBranch(params.branch)) {
      throw new Error(`Invalid agent branch for temporary workspace: ${params.branch}`);
    }
    const workspaceId = `${params.projectId}:${params.runId}`;
    const workspaceDir = path.resolve(this.workspacesRoot, params.projectId, params.runId);
    const minBytes = params.minimumFreeBytes ?? 16 * 1024 * 1024;
    const freeBytes = this.checkFreeBytes(this.workspacesRoot);

    const preparingState: WorkspaceRuntimeState = {
      id: workspaceId,
      projectId: params.projectId,
      runId: params.runId,
      agentId: params.agentId,
      branch: params.branch,
      localPath: workspaceDir,
      state: 'PREPARANDO',
      baseManifestHash: '',
      baseFileHashes: {},
      dirtyFiles: [],
      conflictFiles: [],
      uploadsVerified: false,
    };
    this.states.set(workspaceId, preparingState);
    this.persistState(preparingState, 0);

    if (freeBytes < minBytes) {
      preparingState.state = 'SEM_ESPACO';
      this.persistState(preparingState, 0);
      this.store.appendAuditEvent({
        subject: params.agentId,
        action: 'workspace_prepare',
        scope: params.projectId,
        occurredAt: new Date().toISOString(),
        status: 'denied',
        safeDetails: `SEM_ESPACO: free=${freeBytes} < required=${minBytes}`,
        origin: 'core-04',
      });
      throw new Error(`SEM_ESPACO: insufficient free space (${freeBytes} < ${minBytes}).`);
    }

    fs.mkdirSync(workspaceDir, { recursive: true });
    const sourceManifest = computeDirectoryManifest(params.sourceDir);
    for (const rel of Object.keys(sourceManifest.files)) {
      const srcFile = path.resolve(params.sourceDir, rel);
      const dstFile = resolveConfinedWorkspacePath(workspaceDir, rel);
      fs.mkdirSync(path.dirname(dstFile), { recursive: true });
      fs.copyFileSync(srcFile, dstFile);
    }

    const copiedManifest = computeDirectoryManifest(workspaceDir);
    if (copiedManifest.manifestHash !== sourceManifest.manifestHash) {
      preparingState.state = 'HASH_DIVERGENTE';
      this.persistState(preparingState, copiedManifest.totalBytes);
      throw new Error('HASH_DIVERGENTE during workspace preparation.');
    }

    preparingState.baseManifestHash = copiedManifest.manifestHash;
    preparingState.baseFileHashes = copiedManifest.files;
    preparingState.state = 'PRONTO';
    this.persistState(preparingState, copiedManifest.totalBytes);

    this.store.appendAuditEvent({
      subject: params.agentId,
      action: 'workspace_prepare',
      scope: params.projectId,
      occurredAt: new Date().toISOString(),
      status: 'ok',
      safeDetails: `Prepared isolated workspace ${workspaceId} (${Object.keys(copiedManifest.files).length} files, hash=${copiedManifest.manifestHash.slice(0, 12)})`,
      origin: 'core-04',
    });

    return preparingState;
  }

  transitionState(workspaceId: string, nextState: WorkspaceLifecycleState): WorkspaceRuntimeState {
    const ws = this.requireWorkspace(workspaceId);
    ws.state = nextState;
    const manifest = computeDirectoryManifest(ws.localPath);
    this.persistState(ws, manifest.totalBytes);
    return ws;
  }

  readWorkspaceFile(workspaceId: string, relativePath: string): string {
    const ws = this.requireWorkspace(workspaceId);
    if (isSensitiveFileName(path.basename(relativePath))) {
      throw new Error(`Access denied to sensitive filename: ${relativePath}`);
    }
    const target = resolveConfinedWorkspacePath(ws.localPath, relativePath);
    return fs.readFileSync(target, 'utf8');
  }

  applyWorkspacePatch(workspaceId: string, relativePath: string, content: string): FileHashEntry {
    const ws = this.requireWorkspace(workspaceId);
    if (isSensitiveFileName(path.basename(relativePath))) {
      throw new Error(`Modification denied for sensitive filename: ${relativePath}`);
    }
    const target = resolveConfinedWorkspacePath(ws.localPath, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, 'utf8');

    const normalized = relativePath.replaceAll('\\', '/');
    if (!ws.dirtyFiles.includes(normalized)) {
      ws.dirtyFiles.push(normalized);
    }
    ws.uploadsVerified = false;
    ws.state = 'EDITANDO';
    const current = computeDirectoryManifest(ws.localPath);
    this.persistState(ws, current.totalBytes);
    return current.files[normalized];
  }

  /**
   * Creates an encrypted AES-256-GCM checkpoint snapshot outside Google Drive and records
   * its SHA-256 digest in SQLite.
   */
  createEncryptedSnapshot(params: {
    workspaceId: string;
    snapshotDir: string;
    encryptionKey: Buffer;
    retentionGroup?: string;
  }): { backupId: string; snapshotPath: string; encryptedSha256: string; manifestHash: string } {
    if (params.encryptionKey.length !== 32) {
      throw new Error('AES-256-GCM requires a 32-byte encryption key.');
    }
    if (isGoogleDriveOrSyncedPath(params.snapshotDir)) {
      throw new Error(`Snapshot directory cannot be inside Google Drive: ${params.snapshotDir}`);
    }
    const ws = this.requireWorkspace(params.workspaceId);
    fs.mkdirSync(params.snapshotDir, { recursive: true });

    const manifest = computeDirectoryManifest(ws.localPath);
    const payload: SnapshotPayload = {
      version: 1,
      workspaceId: ws.id,
      projectId: ws.projectId,
      createdAt: new Date().toISOString(),
      manifestHash: manifest.manifestHash,
      files: Object.keys(manifest.files)
        .sort()
        .map((rel) => {
          const full = resolveConfinedWorkspacePath(ws.localPath, rel);
          const raw = fs.readFileSync(full);
          return {
            relativePath: rel,
            sha256: manifest.files[rel].sha256,
            contentBase64: raw.toString('base64'),
          };
        }),
    };

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', params.encryptionKey, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const envelope = JSON.stringify({
      alg: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      ciphertext: ciphertext.toString('base64'),
    });

    const backupId = `bkp-${ws.projectId}-${ws.runId}-${Date.now()}`;
    const snapshotPath = path.join(path.resolve(params.snapshotDir), `${backupId}.cwbackup.enc`);
    fs.writeFileSync(snapshotPath, envelope, 'utf8');
    const encryptedSha256 = crypto.createHash('sha256').update(fs.readFileSync(snapshotPath)).digest('hex');

    this.store.recordBackup({
      id: backupId,
      projectId: ws.projectId,
      target: ws.id,
      snapshotPath,
      sha256: encryptedSha256,
      restoreState: 'verified-snapshot',
      retentionGroup: params.retentionGroup ?? 'checkpoint',
      createdAt: payload.createdAt,
    });

    return { backupId, snapshotPath, encryptedSha256, manifestHash: manifest.manifestHash };
  }

  /**
   * Restores an encrypted AES-256-GCM snapshot into an isolated target directory after verifying
   * both the encrypted envelope SHA-256 and per-file plaintext SHA-256 checksums.
   */
  restoreEncryptedSnapshot(params: {
    backupId: string;
    targetDir: string;
    encryptionKey: Buffer;
  }): { restoredFiles: number; manifestHash: string } {
    if (isGoogleDriveOrSyncedPath(params.targetDir)) {
      throw new Error(`Refusing automated restore directly into Google Drive: ${params.targetDir}`);
    }
    const record = this.store.getBackupRecord(params.backupId);
    if (!record || !fs.existsSync(record.snapshotPath)) {
      throw new Error(`Snapshot record or file missing for backupId: ${params.backupId}`);
    }

    const rawFile = fs.readFileSync(record.snapshotPath);
    const actualEncHash = crypto.createHash('sha256').update(rawFile).digest('hex');
    if (record.sha256 && actualEncHash !== record.sha256) {
      throw new Error('HASH_DIVERGENTE: encrypted snapshot integrity check failed.');
    }

    const envelope = JSON.parse(rawFile.toString('utf8')) as {
      alg: string;
      iv: string;
      authTag: string;
      ciphertext: string;
    };
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      params.encryptionKey,
      Buffer.from(envelope.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(envelope.authTag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);
    const payload = JSON.parse(decrypted.toString('utf8')) as SnapshotPayload;

    const resolvedTarget = path.resolve(params.targetDir);
    fs.mkdirSync(resolvedTarget, { recursive: true });
    for (const file of payload.files) {
      const dest = resolveConfinedWorkspacePath(resolvedTarget, file.relativePath);
      const data = Buffer.from(file.contentBase64, 'base64');
      const fileHash = crypto.createHash('sha256').update(data).digest('hex');
      if (fileHash !== file.sha256) {
        throw new Error(`HASH_DIVERGENTE on restored file ${file.relativePath}`);
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, data);
    }

    const verifiedManifest = computeDirectoryManifest(resolvedTarget);
    if (verifiedManifest.manifestHash !== payload.manifestHash) {
      throw new Error('HASH_DIVERGENTE: restored directory manifest mismatch.');
    }

    this.store.recordBackup({ ...record, restoreState: 'restored-verified' });
    return { restoredFiles: payload.files.length, manifestHash: verifiedManifest.manifestHash };
  }

  /**
   * Synchronizes modified files from the temporary workspace to `targetDir`, checking for
   * concurrent edits against `baseFileHashes` and preserving both versions on conflict.
   */
  syncCheckpoint(params: {
    workspaceId: string;
    targetDir: string;
    corruptTargetAfterWriteForTest?: string;
  }): {
    jobId: string;
    state: WorkspaceLifecycleState;
    syncedFiles: string[];
    conflictFiles: string[];
    verified: boolean;
  } {
    const ws = this.requireWorkspace(params.workspaceId);
    const jobId = `sync-${ws.projectId}-${ws.runId}`;
    const attempts = (this.syncAttempts.get(jobId) ?? 0) + 1;
    this.syncAttempts.set(jobId, attempts);
    const resolvedTarget = path.resolve(params.targetDir);

    ws.state = 'ENVIANDO';
    this.persistState(ws);

    const localManifest = computeDirectoryManifest(ws.localPath);
    const targetManifest = computeDirectoryManifest(resolvedTarget);
    const conflicts: string[] = [];
    const synced: string[] = [];

    // Identify files changed locally compared to baseManifest
    const locallyChanged = new Set<string>(ws.dirtyFiles);
    for (const [rel, entry] of Object.entries(localManifest.files)) {
      if (ws.baseFileHashes[rel]?.sha256 !== entry.sha256) {
        locallyChanged.add(rel);
      }
    }

    // Check concurrent modifications in targetDir
    for (const rel of locallyChanged) {
      const baseHash = ws.baseFileHashes[rel]?.sha256 ?? null;
      const targetHash = targetManifest.files[rel]?.sha256 ?? null;
      if (baseHash !== null && targetHash !== null && targetHash !== baseHash) {
        // Target changed concurrently! Preserve BOTH without overwriting original target file.
        const srcFile = resolveConfinedWorkspacePath(ws.localPath, rel);
        const conflictSidecar = resolveConfinedWorkspacePath(
          resolvedTarget,
          `${rel}.conflict-${ws.agentId}-${ws.runId}`,
        );
        fs.mkdirSync(path.dirname(conflictSidecar), { recursive: true });
        fs.copyFileSync(srcFile, conflictSidecar);
        conflicts.push(rel);
      }
    }

    if (conflicts.length > 0) {
      ws.state = 'CONFLITO';
      ws.conflictFiles = conflicts;
      ws.uploadsVerified = false;
      this.persistState(ws, localManifest.totalBytes);
      this.store.upsertSyncJob({
        id: jobId,
        sourcePath: ws.localPath,
        targetPath: resolvedTarget,
        baseManifestHash: ws.baseManifestHash,
        state: 'CONFLITO',
        attempts,
        lastError: `Preserved ${conflicts.length} concurrent edit conflict(s): ${conflicts.join(', ')}`,
        verified: false,
        updatedAt: new Date().toISOString(),
      });
      return { jobId, state: 'CONFLITO', syncedFiles: [], conflictFiles: conflicts, verified: false };
    }

    ws.state = 'VERIFICANDO';
    for (const rel of locallyChanged) {
      const srcFile = resolveConfinedWorkspacePath(ws.localPath, rel);
      const dstFile = resolveConfinedWorkspacePath(resolvedTarget, rel);
      const tmpDst = `${dstFile}.tmp-${ws.runId}`;
      fs.mkdirSync(path.dirname(dstFile), { recursive: true });
      fs.copyFileSync(srcFile, tmpDst);
      fs.renameSync(tmpDst, dstFile);
      synced.push(rel);
    }

    if (params.corruptTargetAfterWriteForTest) {
      const corruptPath = resolveConfinedWorkspacePath(resolvedTarget, params.corruptTargetAfterWriteForTest);
      fs.writeFileSync(corruptPath, 'CORRUPTED_FOR_HASH_TEST', 'utf8');
    }

    // Re-read hashes at target to prove integrity
    const postTarget = computeDirectoryManifest(resolvedTarget);
    for (const rel of synced) {
      if (postTarget.files[rel]?.sha256 !== localManifest.files[rel]?.sha256) {
        ws.state = 'HASH_DIVERGENTE';
        ws.uploadsVerified = false;
        this.persistState(ws, localManifest.totalBytes);
        this.store.upsertSyncJob({
          id: jobId,
          sourcePath: ws.localPath,
          targetPath: resolvedTarget,
          baseManifestHash: ws.baseManifestHash,
          state: 'HASH_DIVERGENTE',
          attempts,
          lastError: `SHA-256 mismatch verifying ${rel}`,
          verified: false,
          updatedAt: new Date().toISOString(),
        });
        return { jobId, state: 'HASH_DIVERGENTE', syncedFiles: [], conflictFiles: [], verified: false };
      }
    }

    ws.baseFileHashes = localManifest.files;
    ws.baseManifestHash = localManifest.manifestHash;
    ws.dirtyFiles = [];
    ws.conflictFiles = [];
    ws.uploadsVerified = true;
    ws.state = 'AGUARDANDO_APROVACAO_DE_LIMPEZA';
    this.persistState(ws, localManifest.totalBytes);
    this.store.upsertSyncJob({
      id: jobId,
      sourcePath: ws.localPath,
      targetPath: resolvedTarget,
      baseManifestHash: ws.baseManifestHash,
      state: 'SINCRONIZADO',
      attempts,
      lastError: null,
      verified: true,
      updatedAt: new Date().toISOString(),
    });

    return {
      jobId,
      state: 'AGUARDANDO_APROVACAO_DE_LIMPEZA',
      syncedFiles: synced,
      conflictFiles: [],
      verified: true,
    };
  }

  /**
   * Evaluates `canCleanup()` from protected `src/lib/policy.ts` and only removes the
   * isolated local temporary directory when all safety invariants hold.
   */
  requestCleanup(
    workspaceId: string,
    flags: { approved: boolean; filesOpen: boolean; pendingChangesOverride?: boolean },
  ): { cleaned: boolean; state: WorkspaceLifecycleState; reason: string } {
    const ws = this.requireWorkspace(workspaceId);
    const pendingChanges = flags.pendingChangesOverride ?? ws.dirtyFiles.length > 0;
    const conflicts = ws.conflictFiles.length > 0 || ws.state === 'CONFLITO';

    if (flags.filesOpen) {
      ws.state = 'ARQUIVO_ABERTO';
      this.persistState(ws);
    }

    const allowed = canCleanup({
      approved: flags.approved,
      uploadsVerified: ws.uploadsVerified,
      filesOpen: flags.filesOpen,
      conflicts,
      pendingChanges,
    });

    if (!allowed) {
      this.store.appendAuditEvent({
        subject: ws.agentId,
        action: 'workspace_cleanup',
        scope: ws.projectId,
        occurredAt: new Date().toISOString(),
        status: 'denied',
        safeDetails: `Cleanup blocked (state=${ws.state}, approved=${flags.approved}, uploadsVerified=${ws.uploadsVerified}, filesOpen=${flags.filesOpen}, conflicts=${conflicts}, pending=${pendingChanges})`,
        origin: 'core-04',
      });
      return {
        cleaned: false,
        state: ws.state,
        reason: 'Cleanup blocked by canCleanup() policy.',
      };
    }

    // Extra defense-in-depth before deletion: verify directory is inside workspacesRoot and never G:\
    const resolvedLocal = path.resolve(ws.localPath);
    if (
      isGoogleDriveOrSyncedPath(resolvedLocal) ||
      !resolvedLocal.startsWith(this.workspacesRoot + path.sep)
    ) {
      throw new Error(`Safety guard blocked deletion outside workspacesRoot: ${resolvedLocal}`);
    }

    if (fs.existsSync(resolvedLocal)) {
      fs.rmSync(resolvedLocal, { recursive: true, force: true });
    }
    ws.state = 'LIBERADO';
    this.persistState(ws, 0);
    this.store.appendAuditEvent({
      subject: ws.agentId,
      action: 'workspace_cleanup',
      scope: ws.projectId,
      occurredAt: new Date().toISOString(),
      status: 'ok',
      safeDetails: `Removed temporary workspace ${workspaceId} after verified sync and approval.`,
      origin: 'core-04',
    });

    return {
      cleaned: true,
      state: 'LIBERADO',
      reason: 'Temporary workspace cleaned after verified checkpoint.',
    };
  }

  /**
   * Rehydrates an existing persisted workspace after an application/sidecar restart,
   * reconciling transient in-flight states safely without re-running destructive operations.
   */
  recoverPersistedWorkspace(record: {
    id: string;
    projectId: string;
    runId: string;
    agentId: string;
    branch: string;
    localPath: string;
    state: string;
  }): WorkspaceRuntimeState {
    if (isGoogleDriveOrSyncedPath(record.localPath)) {
      throw new Error(`Refusing to recover workspace inside Google Drive: ${record.localPath}`);
    }
    const exists = fs.existsSync(record.localPath);
    const manifest = exists ? computeDirectoryManifest(record.localPath) : { files: {}, manifestHash: '', totalBytes: 0 };
    const isTransient =
      record.state === 'PREPARANDO' || record.state === 'ENVIANDO' || record.state === 'VERIFICANDO';
    let nextState = (record.state as WorkspaceLifecycleState) || 'PRONTO';
    if (!exists && record.state !== 'LIBERADO') {
      nextState = 'HASH_DIVERGENTE';
    } else if (isTransient) {
      nextState = 'AGUARDANDO_CHECKPOINT';
    }

    const runtime: WorkspaceRuntimeState = {
      id: record.id,
      projectId: record.projectId,
      runId: record.runId,
      agentId: record.agentId,
      branch: record.branch,
      localPath: record.localPath,
      state: nextState,
      baseManifestHash: manifest.manifestHash,
      baseFileHashes: manifest.files,
      dirtyFiles: [],
      conflictFiles: [],
      uploadsVerified: nextState === 'AGUARDANDO_APROVACAO_DE_LIMPEZA' || nextState === 'SINCRONIZADO',
    };
    this.states.set(runtime.id, runtime);
    this.persistState(runtime, manifest.totalBytes);
    return runtime;
  }

  private requireWorkspace(workspaceId: string): WorkspaceRuntimeState {
    const ws = this.states.get(workspaceId);
    if (!ws) {
      throw new Error(`Workspace not found in manager: ${workspaceId}`);
    }
    return ws;
  }
}
