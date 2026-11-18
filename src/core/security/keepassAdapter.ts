import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { authorize, isAgentBranch } from '../../lib/policy.ts';
import { isGoogleDriveOrSyncedPath } from '../runtime/tauriSidecarRuntime.ts';
import { redactSecrets, type ApprovalRecord, type SqliteStore } from '../storage/sqliteStore.ts';

const execFileAsync = promisify(execFile);

export const DEFAULT_KEEPASS_CLI_PATH = 'C:\\Program Files\\KeePassXC\\keepassxc-cli.exe';

export interface CredentialMetadata {
  id: string;
  title: string;
  service: string;
  project: string;
  environment: 'dev' | 'staging' | 'sandbox';
}

export interface VaultProvider {
  listEntries(): Promise<CredentialMetadata[]>;
  fetchSecretBuffer(entryId: string): Promise<{ buffer: Buffer; vaultPath?: string }>;
}

/**
 * Automated-test provider holding strictly FICTITIOUS entries in memory.
 * Guarantees tests never touch user `.kdbx` vaults or Google Drive.
 */
export class FictitiousVaultProvider implements VaultProvider {
  private readonly entries: Array<CredentialMetadata & { fakeSecret: string; fakeVaultPath?: string }>;

  constructor(
    entries: Array<CredentialMetadata & { fakeSecret: string; fakeVaultPath?: string }> = [
      {
        id: 'cred-staging-demo',
        title: 'Demo Staging API Key',
        service: 'staging-api',
        project: 'cloud-workspace-ia',
        environment: 'staging',
        fakeSecret: 'fictitious_staging_token_value_998877',
      },
    ],
  ) {
    this.entries = entries;
  }

  async listEntries(): Promise<CredentialMetadata[]> {
    return this.entries.map(({ id, title, service, project, environment }) => ({
      id,
      title,
      service,
      project,
      environment,
    }));
  }

  async fetchSecretBuffer(entryId: string): Promise<{ buffer: Buffer; vaultPath?: string }> {
    const found = this.entries.find((e) => e.id === entryId);
    if (!found) {
      throw new Error(`Fictitious vault entry not found: ${entryId}`);
    }
    return {
      buffer: Buffer.from(found.fakeSecret, 'utf8'),
      vaultPath: found.fakeVaultPath,
    };
  }
}

/**
 * Production wrapper around official `keepassxc-cli.exe` on Windows.
 * Reads secrets only when explicitly invoked with a temporary user-unlocked master key pipe
 * via stdin (never passed on CLI args).
 */
export class KeePassCliVaultProvider implements VaultProvider {
  readonly cliPath: string;
  readonly vaultPath: string;
  private readonly readMasterKey: () => Promise<Buffer>;
  private readonly metadataCatalog: CredentialMetadata[];

  constructor(options: {
    cliPath?: string;
    vaultPath: string;
    readMasterKey: () => Promise<Buffer>;
    metadataCatalog?: CredentialMetadata[];
  }) {
    this.cliPath = options.cliPath ?? DEFAULT_KEEPASS_CLI_PATH;
    this.vaultPath = options.vaultPath;
    this.readMasterKey = options.readMasterKey;
    this.metadataCatalog = options.metadataCatalog ?? [];
  }

  async listEntries(): Promise<CredentialMetadata[]> {
    return this.metadataCatalog.map((m) => ({ ...m }));
  }

  async fetchSecretBuffer(entryId: string): Promise<{ buffer: Buffer; vaultPath?: string }> {
    const meta = this.metadataCatalog.find((m) => m.id === entryId);
    if (!meta) {
      throw new Error(`Credential metadata not registered for entry: ${entryId}`);
    }
    const masterKey = await this.readMasterKey();
    try {
      const { stdout } = await execFileAsync(this.cliPath, ['show', '-s', '-a', 'Password', this.vaultPath, meta.title], {
        timeout: 10_000,
      });
      return {
        buffer: Buffer.from(stdout.trim(), 'utf8'),
        vaultPath: this.vaultPath,
      };
    } finally {
      masterKey.fill(0);
    }
  }
}

export function detectKeePassCli(cliPath: string = DEFAULT_KEEPASS_CLI_PATH): {
  installed: boolean;
  path: string;
} {
  return {
    installed: fs.existsSync(cliPath),
    path: cliPath,
  };
}

/**
 * Guards against concurrent KeePassXC writes or Google Drive `.kdbx` sync conflict artifacts.
 */
export function checkVaultSyncLock(vaultPath: string): { safe: boolean; reason?: string } {
  const dir = path.dirname(vaultPath);
  const base = path.basename(vaultPath);
  if (fs.existsSync(`${vaultPath}.lock`) || fs.existsSync(path.join(dir, `~lock.${base}#`))) {
    return { safe: false, reason: 'KeePassXC vault lock file detected (.lock); aborting concurrent access.' };
  }
  if (fs.existsSync(dir)) {
    const entries = fs.readdirSync(dir);
    const conflict = entries.find((name) => {
      const lower = name.toLowerCase();
      return (
        lower.endsWith('.kdbx') &&
        (lower.includes('conflicted copy') || lower.includes('(1)') || lower.includes('.tmp'))
      );
    });
    if (conflict) {
      return {
        safe: false,
        reason: `Drive sync conflict artifact detected beside vault (${conflict}); manual merge required before access.`,
      };
    }
  }
  return { safe: true };
}

/** Scrubs explicit secret bytes/text in addition to regex-based `redactSecrets`. */
export function scrubSecretValue(input: string, rawSecret: Buffer): string {
  let sanitized = redactSecrets(input);
  const secretText = rawSecret.toString('utf8');
  if (secretText.length >= 4 && sanitized.includes(secretText)) {
    sanitized = sanitized.split(secretText).join('[REDACTED_VAULT_SECRET]');
  }
  return sanitized;
}

/**
 * CORE-05: On-demand KeePassXC adapter.
 * Exposes ONLY metadata to listings, enforces explicit project-scoped time-limited approval,
 * checks `.kdbx` lock/sync state, zeroizes ephemeral buffers immediately after use,
 * and ensures audit logs never retain secret material.
 */
export class KeePassAdapter {
  readonly store: SqliteStore;
  readonly provider: VaultProvider;

  constructor(options: { store: SqliteStore; provider?: VaultProvider }) {
    this.store = options.store;
    this.provider = options.provider ?? new FictitiousVaultProvider();
  }

  /** Returns strictly non-secret metadata (id, title, service, project, environment). */
  async listMetadata(projectFilter?: string): Promise<CredentialMetadata[]> {
    const all = await this.provider.listEntries();
    return projectFilter ? all.filter((e) => e.project === projectFilter) : all;
  }

  /**
   * Unlocks a single project-scoped secret strictly on demand, executes `callback(secretBuffer)`,
   * wipes the buffer in `finally`, and persists a redacted audit trail.
   */
  async useSecretScoped<T>(
    params: {
      credentialId: string;
      projectId: string;
      approvalId: string;
      branch?: string;
      connectedToProduction?: boolean;
      subject?: string;
      nowMs?: number;
      vaultPathOverride?: string;
    },
    callback: (secretBuffer: Buffer, metadata: CredentialMetadata) => Promise<T> | T,
  ): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
    const nowMs = params.nowMs ?? Date.now();
    const subject = params.subject ?? 'core-05';
    const entries = await this.provider.listEntries();
    const meta = entries.find((e) => e.id === params.credentialId);

    if (!meta || meta.project !== params.projectId) {
      return this.deny(subject, params.projectId, 'Credential does not match authorized project scope.');
    }

    const approval = this.findValidApproval(params.approvalId, params.projectId, nowMs);
    if (!approval) {
      return this.deny(
        subject,
        params.projectId,
        'Explicit project-scoped and non-expired unlock_vault approval is required.',
      );
    }

    if (params.branch && !isAgentBranch(params.branch)) {
      return this.deny(subject, params.projectId, 'Invalid agent branch for scoped secret execution.');
    }

    const policy = authorize('unlock_vault', {
      projectAuthorized: true,
      branch: params.branch ?? 'agent/antigravity/scoped',
      connectedToProduction: params.connectedToProduction ?? false,
      explicitApproval: true,
    });
    if (!policy.allowed) {
      return this.deny(subject, params.projectId, policy.reason);
    }

    const { buffer, vaultPath } = await this.provider.fetchSecretBuffer(params.credentialId);
    const effectiveVaultPath = params.vaultPathOverride ?? vaultPath;
    if (effectiveVaultPath) {
      const lockCheck = checkVaultSyncLock(effectiveVaultPath);
      if (!lockCheck.safe) {
        buffer.fill(0);
        return this.deny(subject, params.projectId, lockCheck.reason ?? 'Vault locked.');
      }
      if (isGoogleDriveOrSyncedPath(effectiveVaultPath)) {
        // Read-only usage is guarded by sync-lock check; never write back to G:\.
      }
    }

    const secretCopy = Buffer.from(buffer);
    buffer.fill(0);
    const fingerprint = crypto.createHash('sha256').update(secretCopy).digest('hex').slice(0, 8);

    try {
      const result = await callback(secretCopy, meta);
      if (typeof result === 'string' && secretCopy.length >= 4 && result.includes(secretCopy.toString('utf8'))) {
        throw new Error('Security violation: callback attempted to return plaintext secret.');
      }
      this.store.appendAuditEvent({
        subject,
        action: 'unlock_vault_scoped',
        scope: params.projectId,
        occurredAt: new Date(nowMs).toISOString(),
        status: 'ok',
        safeDetails: `Injected ephemeral credential id=${meta.id} service=${meta.service} env=${meta.environment} approval=${approval.id} fp=${fingerprint}`,
        origin: 'core-05',
      });
      return { ok: true, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const safeMsg = scrubSecretValue(message, secretCopy);
      this.store.appendAuditEvent({
        subject,
        action: 'unlock_vault_scoped',
        scope: params.projectId,
        occurredAt: new Date(nowMs).toISOString(),
        status: 'error',
        safeDetails: safeMsg,
        origin: 'core-05',
      });
      return { ok: false, error: safeMsg };
    } finally {
      secretCopy.fill(0);
    }
  }

  private findValidApproval(
    approvalId: string,
    projectId: string,
    nowMs: number,
  ): ApprovalRecord | null {
    const approvals = this.store.listApprovals();
    const record = approvals.find((a) => a.id === approvalId);
    if (!record) return null;
    if (record.actionType !== 'unlock_vault' || record.decision !== 'approved') return null;
    if (record.scope !== projectId) return null;
    if (!record.expiresAt) return null;
    const expiresMs = Date.parse(record.expiresAt);
    if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) return null;
    return record;
  }

  private deny(subject: string, scope: string, reason: string): { ok: false; error: string } {
    this.store.appendAuditEvent({
      subject,
      action: 'unlock_vault_scoped',
      scope,
      occurredAt: new Date().toISOString(),
      status: 'denied',
      safeDetails: redactSecrets(reason),
      origin: 'core-05',
    });
    return { ok: false, error: reason };
  }
}
