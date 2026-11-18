import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SqliteStore } from '../../src/core/storage/sqliteStore.ts';
import { aggregateEvidenceFromStore } from '../../src/core/evidence/evidenceAggregator.ts';
import {
  generateSeaConfig,
  isGoogleDriveOrSyncedPath,
  resolveSidecarConfig,
  verifyEmbeddedSqliteHealth,
} from '../../src/core/runtime/tauriSidecarRuntime.ts';
import { WorkspaceManager } from '../../src/core/workspaces/workspaceManager.ts';
import { LocalMcpGateway } from '../../src/core/mcp/localMcpGateway.ts';
import {
  DEFAULT_KEEPASS_CLI_PATH,
  FictitiousVaultProvider,
  KeePassAdapter,
  checkVaultSyncLock,
  detectKeePassCli,
} from '../../src/core/security/keepassAdapter.ts';

test('Tauri sidecar + Node 26 SEA + embedded SQLite validation rejects Drive paths and passes healthcheck', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-sidecar-'));
  try {
    const cfg = resolveSidecarConfig({
      env: { LOCALAPPDATA: tmpDir },
    });
    assert.equal(cfg.packagingMode, 'tauri-sidecar-node-sea');
    assert.equal(cfg.bindHost, '127.0.0.1');
    assert.equal(cfg.requiresManualNodeInstall, false);
    assert.equal(cfg.requiresManualSqliteInstall, false);
    assert.ok(cfg.sidecarExecutableRelPath.endsWith('cloud-workspace-core-x86_64-pc-windows-msvc.exe'));
    assert.equal(isGoogleDriveOrSyncedPath(cfg.dbPath), false);

    assert.throws(
      () => resolveSidecarConfig({ workspacesRootOverride: 'G:\\Meu Drive\\Projetos Code\\Workspaces' }),
      /cannot reside inside Google Drive/i,
    );
    assert.throws(
      () => resolveSidecarConfig({ dbPathOverride: 'G:\\Meu Drive\\workspace.sqlite' }),
      /cannot reside inside Google Drive/i,
    );

    const sea = generateSeaConfig({
      entryBundlePath: 'dist-core/core-sidecar.cjs',
      outputExecutablePath: cfg.sidecarExecutableRelPath,
    });
    assert.equal(sea.disableExperimentalSEAWarning, true);
    assert.equal(sea.useCodeCache, true);

    const health = verifyEmbeddedSqliteHealth(cfg.dbPath);
    assert.equal(health.ok, true);
    assert.equal(health.sqliteWalEnabled, true);
    assert.equal(health.foreignKeysEnabled, true);
    assert.deepEqual(health.missingTables, []);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('CORE-04 WorkspaceManager manages isolated lifecycle, SHA-256 verification, AES-256-GCM snapshots, conflicts, and canCleanup', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-core04-'));
  const sourceDir = path.join(tmpRoot, 'remote-sim');
  const workspacesRoot = path.join(tmpRoot, 'local-workspaces');
  const snapshotDir = path.join(tmpRoot, 'snapshots');
  const restoreDir = path.join(tmpRoot, 'restored');
  fs.mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'src', 'index.ts'), 'export const version = 1;\n', 'utf8');
  fs.writeFileSync(path.join(sourceDir, '.env'), 'DO_NOT_COPY=secret_123\n', 'utf8');

  const store = new SqliteStore(':memory:');
  store.upsertProject({
    id: 'demo',
    slug: 'demo',
    name: 'Demo Workspace Project',
    stack: 'node+typescript',
    status: 'ready',
    localPath: sourceDir,
    drivePath: null,
    githubRepo: null,
    reviewStatus: 'approved',
    updatedAt: '2026-11-18T19:00:00Z',
  });
  try {
    // Reject Drive root
    assert.throws(
      () => new WorkspaceManager({ store, workspacesRoot: 'G:\\Meu Drive\\TempWS' }),
      /never be located inside Google Drive/i,
    );

    // Reject insufficient disk space cleanly
    const lowSpaceMgr = new WorkspaceManager({
      store,
      workspacesRoot,
      checkFreeBytes: () => 1024,
    });
    assert.throws(
      () =>
        lowSpaceMgr.prepareWorkspace({
          projectId: 'demo',
          sourceDir,
          agentId: 'antigravity',
          branch: 'agent/antigravity/low-disk',
          runId: 'run-low',
          minimumFreeBytes: 1024 * 1024,
        }),
      /SEM_ESPACO/,
    );
    assert.equal(store.getWorkspace('demo:run-low')?.state, 'SEM_ESPACO');

    const mgr = new WorkspaceManager({ store, workspacesRoot });
    // Reject non-agent branch
    assert.throws(
      () =>
        mgr.prepareWorkspace({
          projectId: 'demo',
          sourceDir,
          agentId: 'antigravity',
          branch: 'main',
          runId: 'run-bad-branch',
        }),
      /Invalid agent branch/,
    );

    const ws = mgr.prepareWorkspace({
      projectId: 'demo',
      sourceDir,
      agentId: 'antigravity',
      branch: 'agent/antigravity/feat-1',
      runId: 'run-1',
    });
    assert.equal(ws.state, 'PRONTO');
    // .env was NOT copied
    assert.equal(fs.existsSync(path.join(ws.localPath, '.env')), false);

    // Patch file in isolated workspace
    mgr.applyWorkspacePatch(ws.id, 'src/index.ts', 'export const version = 2;\n');
    assert.equal(mgr.getState(ws.id)?.state, 'EDITANDO');

    // Create & verify encrypted AES-256-GCM snapshot
    const key = crypto.randomBytes(32);
    const snap = mgr.createEncryptedSnapshot({
      workspaceId: ws.id,
      snapshotDir,
      encryptionKey: key,
    });
    const encryptedRaw = fs.readFileSync(snap.snapshotPath, 'utf8');
    assert.ok(!encryptedRaw.includes('export const version = 2'));

    // Wrong key must fail GCM authentication
    assert.throws(() =>
      mgr.restoreEncryptedSnapshot({
        backupId: snap.backupId,
        targetDir: path.join(restoreDir, 'bad'),
        encryptionKey: crypto.randomBytes(32),
      }),
    );

    // Correct key restores exact files & SHA-256 manifest
    const restored = mgr.restoreEncryptedSnapshot({
      backupId: snap.backupId,
      targetDir: restoreDir,
      encryptionKey: key,
    });
    assert.equal(restored.manifestHash, snap.manifestHash);
    assert.equal(fs.readFileSync(path.join(restoreDir, 'src', 'index.ts'), 'utf8'), 'export const version = 2;\n');

    // Conflict preservation: simulate concurrent remote edit in sourceDir without overwriting
    fs.writeFileSync(path.join(sourceDir, 'src', 'index.ts'), 'export const version = 999; // remote edit\n', 'utf8');
    const conflictSync = mgr.syncCheckpoint({ workspaceId: ws.id, targetDir: sourceDir });
    assert.equal(conflictSync.state, 'CONFLITO');
    assert.equal(conflictSync.verified, false);
    assert.ok(fs.readFileSync(path.join(sourceDir, 'src', 'index.ts'), 'utf8').includes('999'));
    assert.ok(fs.existsSync(path.join(sourceDir, 'src', 'index.ts.conflict-antigravity-run-1')));
    // canCleanup MUST refuse while conflict exists
    assert.equal(mgr.requestCleanup(ws.id, { approved: true, filesOpen: false }).cleaned, false);

    // Now test clean sync & hash verification on a clean mirror directory
    const cleanMirror = path.join(tmpRoot, 'clean-mirror');
    fs.mkdirSync(path.join(cleanMirror, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cleanMirror, 'src', 'index.ts'), 'export const version = 1;\n', 'utf8');
    const ws2 = mgr.prepareWorkspace({
      projectId: 'demo',
      sourceDir: cleanMirror,
      agentId: 'codex',
      branch: 'agent/codex/clean-sync',
      runId: 'run-2',
    });
    mgr.applyWorkspacePatch(ws2.id, 'src/index.ts', 'export const version = 3;\n');

    // Simulate post-write hash divergence first
    const divSync = mgr.syncCheckpoint({
      workspaceId: ws2.id,
      targetDir: cleanMirror,
      corruptTargetAfterWriteForTest: 'src/index.ts',
    });
    assert.equal(divSync.state, 'HASH_DIVERGENTE');

    // Reset cleanMirror back to original hash and run clean verified sync
    fs.writeFileSync(path.join(cleanMirror, 'src', 'index.ts'), 'export const version = 1;\n', 'utf8');
    const ws3 = mgr.prepareWorkspace({
      projectId: 'demo',
      sourceDir: cleanMirror,
      agentId: 'codex',
      branch: 'agent/codex/verified-sync',
      runId: 'run-3',
    });
    mgr.applyWorkspacePatch(ws3.id, 'src/index.ts', 'export const version = 4;\n');
    const okSync = mgr.syncCheckpoint({ workspaceId: ws3.id, targetDir: cleanMirror });
    assert.equal(okSync.verified, true);
    assert.equal(okSync.state, 'AGUARDANDO_APROVACAO_DE_LIMPEZA');
    assert.equal(fs.readFileSync(path.join(cleanMirror, 'src', 'index.ts'), 'utf8'), 'export const version = 4;\n');

    // Cleanup blocked if not approved or if files are open
    assert.equal(mgr.requestCleanup(ws3.id, { approved: false, filesOpen: false }).cleaned, false);
    const openDenied = mgr.requestCleanup(ws3.id, { approved: true, filesOpen: true });
    assert.equal(openDenied.cleaned, false);
    assert.equal(openDenied.state, 'ARQUIVO_ABERTO');

    // Cleanup succeeds ONLY when approved + verified + no open files + no conflicts
    const finalCleanup = mgr.requestCleanup(ws3.id, { approved: true, filesOpen: false });
    assert.equal(finalCleanup.cleaned, true);
    assert.equal(finalCleanup.state, 'LIBERADO');
    assert.equal(fs.existsSync(ws3.localPath), false);
  } finally {
    store.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('CORE-03 LocalMcpGateway enforces auth, Origin checks, allowlist, path confinement, and emits verified evidence', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-core03-'));
  const sourceDir = path.join(tmpRoot, 'proj-src');
  const workspacesRoot = path.join(tmpRoot, 'ws');
  fs.mkdirSync(path.join(sourceDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(sourceDir, 'src', 'app.ts'), 'export const ok = true;\n', 'utf8');

  const store = new SqliteStore(':memory:');
  store.upsertProject({
    id: 'demo-proj',
    slug: 'demo-proj',
    name: 'Demo Project',
    stack: 'node+typescript',
    status: 'ready',
    localPath: sourceDir,
    drivePath: null,
    githubRepo: 'Raphahel30/demo-proj',
    reviewStatus: 'approved',
    updatedAt: '2026-11-18T19:00:00Z',
  });

  const mgr = new WorkspaceManager({ store, workspacesRoot });
  const gw = new LocalMcpGateway({
    store,
    workspaces: mgr,
    commandRunner: async (spec) => ({
      exitCode: 0,
      stdout: `PASS ${spec.id} Authorization: Bearer leaked_token_in_test_output`,
      stderr: '',
    }),
    gitRunner: async (action, _cwd, opts) => ({
      ok: true,
      output: `mock git ${action} on ${opts.branch}`,
    }),
  });

  const now = Date.now();
  const { token } = gw.issueSessionToken({
    agentId: 'antigravity',
    allowedProjects: ['demo-proj'],
    allowedOperations: ['inspect', 'read', 'edit_sandbox', 'run_approved_test', 'commit_agent_branch', 'push_agent_branch'],
    branch: 'agent/antigravity/mcp-test',
    connectedToProduction: false,
    commandAllowlisted: ['node-vitest'],
    nowMs: now,
  });
  const { token: expiredToken } = gw.issueSessionToken({
    agentId: 'codex',
    allowedProjects: ['demo-proj'],
    allowedOperations: ['inspect'],
    branch: 'agent/codex/expired',
    ttlMs: 1000,
    nowMs: now - 5000,
  });

  const server = await gw.startHttpServer(0);
  try {
    // 1. Reject bad Origin (DNS rebinding guard)
    const badOriginRes = await fetch(server.url, {
      method: 'POST',
      headers: {
        Origin: 'https://malicious.attacker.invalid',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    assert.equal(badOriginRes.status, 403);

    // 2. Reject missing/expired token on HTTP loopback
    const expiredRes = await fetch(server.url, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:1420',
        Authorization: `Bearer ${expiredToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    assert.equal(expiredRes.status, 401);

    // 3. Valid HTTP tools/list + stdio prepare & patch
    const listRes = await fetch(server.url, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:1420',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
    });
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.equal(listBody.result.tools.length, 14);

    const prepLine = await gw.handleStdioLine(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'workspace_prepare',
          arguments: { projectId: 'demo-proj', sourceDir, runId: 'mcp-run-1' },
        },
      }),
      token,
      now + 1000,
    );
    const prepObj = JSON.parse(prepLine);
    assert.equal(prepObj.result.workspaceId, 'demo-proj:mcp-run-1');

    // 4. Reject path traversal and sensitive filenames
    const travRes = await gw.handleJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'files_read',
          arguments: { workspaceId: 'demo-proj:mcp-run-1', relativePath: '../../outside.ts' },
        },
      },
      token,
      now + 2000,
    );
    assert.ok(travRes.error);
    assert.match(travRes.error.message, /traversal|Invalid relative/i);

    const sensRes = await gw.handleJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 55,
        method: 'tools/call',
        params: {
          name: 'files_read',
          arguments: { workspaceId: 'demo-proj:mcp-run-1', relativePath: '.env' },
        },
      },
      token,
      now + 2100,
    );
    assert.ok(sensRes.error);
    assert.match(sensRes.error.message, /Sensitive file/i);

    // 5. Reject non-allowlisted command profile
    const badCmdRes = await gw.handleJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'tests_run',
          arguments: { workspaceId: 'demo-proj:mcp-run-1', commandProfile: 'powershell -c dir; whoami' },
        },
      },
      token,
      now + 3000,
    );
    assert.ok(badCmdRes.error);

    // 6. Execute allowlisted test -> produces redacted logs + verified agent/chief evidence
    const testRes = await gw.handleJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'tests_run',
          arguments: { workspaceId: 'demo-proj:mcp-run-1', commandProfile: 'node-vitest' },
        },
      },
      token,
      now + 4000,
    );
    const testResult = testRes.result;
    assert.equal(testResult.status, 'completed');
    assert.ok(!testResult.sanitizedLog.includes('leaked_token_in_test_output'));

    const evidenceSnap = aggregateEvidenceFromStore(store, ['antigravity', 'chatgpt'], Date.now());
    assert.equal(evidenceSnap.agents.antigravity.state, 'idle');
    assert.equal(evidenceSnap.agents.chatgpt.state, 'unknown');

    // 7. Reject commit/push when session branch is `main`
    const { token: mainToken } = gw.issueSessionToken({
      agentId: 'codex',
      allowedProjects: ['demo-proj'],
      allowedOperations: ['commit_agent_branch', 'push_agent_branch'],
      branch: 'main',
      nowMs: now,
    });
    const badCommit = await gw.handleJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'git_commit_branch',
          arguments: { workspaceId: 'demo-proj:mcp-run-1', message: 'bad' },
        },
      },
      mainToken,
      now + 5000,
    );
    assert.ok(badCommit.error);
  } finally {
    await gw.stopHttpServer();
    store.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('CORE-05 KeePassAdapter enforces approvals, sync locks, buffer zeroing, and redaction using fictitious vault', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-core05-'));
  const fakeVaultDir = path.join(tmpRoot, 'vault-dir');
  fs.mkdirSync(fakeVaultDir, { recursive: true });
  const fakeKdbxPath = path.join(fakeVaultDir, 'fictitious.kdbx');
  fs.writeFileSync(fakeKdbxPath, 'not-a-real-kdbx', 'utf8');

  // Verify KeePassXC CLI installation is detected on Windows
  const cliInfo = detectKeePassCli(DEFAULT_KEEPASS_CLI_PATH);
  if (process.platform === 'win32') {
    assert.equal(cliInfo.installed, true);
  }

  const store = new SqliteStore(':memory:');
  const provider = new FictitiousVaultProvider([
    {
      id: 'cred-staging-1',
      title: 'Staging Fictitious Key',
      service: 'staging-api',
      project: 'demo-proj',
      environment: 'staging',
      fakeSecret: 'fictitious_secret_alpha_999',
      fakeVaultPath: fakeKdbxPath,
    },
  ]);
  const adapter = new KeePassAdapter({ store, provider });
  const now = 1_700_000_000_000;

  try {
    // 1. Listing exposes strictly metadata
    const metaList = await adapter.listMetadata('demo-proj');
    assert.equal(metaList.length, 1);
    assert.ok(!JSON.stringify(metaList).includes('fictitious_secret_alpha_999'));

    // 2. Denied without valid approval
    const noApproval = await adapter.useSecretScoped(
      { credentialId: 'cred-staging-1', projectId: 'demo-proj', approvalId: 'missing-apr', nowMs: now },
      async () => 'should-not-run',
    );
    assert.equal(noApproval.ok, false);

    // 3. Denied when approval is expired
    store.recordApproval({
      id: 'apr-expired',
      actionType: 'unlock_vault',
      scope: 'demo-proj',
      target: 'cred-staging-1',
      decision: 'approved',
      author: 'user',
      expiresAt: new Date(now - 5000).toISOString(),
      planHash: 'h1',
      createdAt: new Date(now - 10_000).toISOString(),
    });
    const expiredCall = await adapter.useSecretScoped(
      { credentialId: 'cred-staging-1', projectId: 'demo-proj', approvalId: 'apr-expired', nowMs: now },
      async () => 'should-not-run',
    );
    assert.equal(expiredCall.ok, false);

    // 4. Denied when .lock file or Drive conflicted copy is present beside vault
    store.recordApproval({
      id: 'apr-valid',
      actionType: 'unlock_vault',
      scope: 'demo-proj',
      target: 'cred-staging-1',
      decision: 'approved',
      author: 'user',
      expiresAt: new Date(now + 60_000).toISOString(),
      planHash: 'h2',
      createdAt: new Date(now).toISOString(),
    });
    fs.writeFileSync(`${fakeKdbxPath}.lock`, 'lock', 'utf8');
    assert.equal(checkVaultSyncLock(fakeKdbxPath).safe, false);
    const lockedCall = await adapter.useSecretScoped(
      { credentialId: 'cred-staging-1', projectId: 'demo-proj', approvalId: 'apr-valid', nowMs: now },
      async () => 'blocked',
    );
    assert.equal(lockedCall.ok, false);
    fs.unlinkSync(`${fakeKdbxPath}.lock`);

    // 5. Valid scoped use passes ephemeral buffer, zeroizes it afterward, and never logs secret
    let capturedBuf = null;
    const okCall = await adapter.useSecretScoped(
      {
        credentialId: 'cred-staging-1',
        projectId: 'demo-proj',
        approvalId: 'apr-valid',
        branch: 'agent/antigravity/vault-test',
        nowMs: now,
      },
      async (secretBuf, meta) => {
        capturedBuf = secretBuf;
        assert.equal(secretBuf.toString('utf8'), 'fictitious_secret_alpha_999');
        assert.equal(meta.service, 'staging-api');
        return { authenticated: true };
      },
    );
    assert.equal(okCall.ok, true);
    assert.ok(capturedBuf !== null);
    assert.equal(capturedBuf.every((b) => b === 0), true, 'Secret buffer must be wiped to zero');

    const auditJson = JSON.stringify(store.listAuditEvents(20));
    assert.ok(!auditJson.includes('fictitious_secret_alpha_999'));
  } finally {
    store.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
