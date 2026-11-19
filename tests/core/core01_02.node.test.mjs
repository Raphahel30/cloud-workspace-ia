import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SqliteStore, redactSecrets } from '../../src/core/storage/sqliteStore.ts';
import {
  DEFAULT_PROJECTS_ROOT,
  isSensitiveFileName,
  scanProjectsRoot,
  syncCatalogToStore,
} from '../../src/core/catalog/driveCatalog.ts';
import { aggregateEvidenceFromStore } from '../../src/core/evidence/evidenceAggregator.ts';

test('SqliteStore creates WAL database, persists tables, and redacts secrets', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-core-sqlite-'));
  const dbPath = path.join(tmpDir, 'state', 'workspace.db');
  const store = new SqliteStore(dbPath);
  try {
    assert.equal(String(store.pragma('journal_mode')).toLowerCase(), 'wal');
    assert.equal(Number(store.pragma('foreign_keys')), 1);

    const masked = redactSecrets('Authorization: Bearer abc.123 TOKEN=secret_val gho_1234567890abcdef');
    assert.ok(!masked.includes('abc.123'));
    assert.ok(!masked.includes('secret_val'));
    assert.ok(!masked.includes('gho_1234567890abcdef'));

    store.upsertProject({
      id: 'demo-proj',
      slug: 'demo-proj',
      name: 'Demo Project',
      stack: 'node+typescript',
      status: 'cataloged',
      localPath: null,
      drivePath: 'G:\\Meu Drive\\Projetos Code\\01 - Projetos\\demo-proj',
      githubRepo: 'Raphahel30/demo-proj',
      reviewStatus: 'pending-review',
      updatedAt: '2026-11-18T19:00:00Z',
    });
    assert.equal(store.listProjects().length, 1);

    store.upsertTask({
      id: 'task-1',
      projectId: 'demo-proj',
      origin: 'cloud-workspace',
      trust: 'verified',
      executor: 'core-runner',
      commandProfile: 'test',
      status: 'running',
      resumable: true,
      startedAtMs: 1000,
      observedAtMs: 5000,
      finishedAtMs: null,
      sanitizedLog: 'GITHUB_TOKEN=ghp_superSecretTokenValue12345',
    });
    const tasks = store.listTasks();
    assert.equal(tasks.length, 1);
    assert.ok(!tasks[0].sanitizedLog.includes('ghp_superSecretTokenValue12345'));

    store.recordApproval({
      id: 'apr-1',
      actionType: 'merge',
      scope: 'demo-proj',
      target: 'main',
      decision: 'pending',
      author: 'user',
      expiresAt: null,
      planHash: 'abc123',
      createdAt: '2026-11-18T19:00:00Z',
    });
    assert.equal(store.listApprovals()[0].decision, 'pending');

    store.appendAuditEvent({
      subject: 'test',
      action: 'write',
      scope: 'demo-proj',
      occurredAt: '2026-11-18T19:00:00Z',
      status: 'ok',
      safeDetails: 'sk-abcdef1234567890abcdef',
    });
    const logs = store.listAuditEvents(5);
    assert.ok(!logs[0].safeDetails.includes('sk-abcdef1234567890abcdef'));
  } finally {
    store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('driveCatalog performs read-only scan, flags secrets by name only, and syncs to SQLite', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-core-catalog-'));
  const projDir = path.join(tmpRoot, 'sample-app', 'Arquivos Navegaveis');
  fs.mkdirSync(projDir, { recursive: true });
  fs.writeFileSync(path.join(projDir, 'package.json'), '{"name":"sample-app"}');
  fs.writeFileSync(path.join(projDir, '.env'), 'SECRET_DO_NOT_READ=top_secret_123');
  fs.writeFileSync(path.join(projDir, '.env.example'), 'SECRET_DO_NOT_READ=');
  fs.writeFileSync(path.join(projDir, 'vault.kdbx'), 'binary');

  assert.equal(isSensitiveFileName('.env'), true);
  assert.equal(isSensitiveFileName('.env.example'), false);
  assert.equal(isSensitiveFileName('vault.kdbx'), true);

  const store = new SqliteStore(':memory:');
  try {
    const scanned = syncCatalogToStore(store, tmpRoot, {
      computeSmallHashes: true,
      nowIso: '2026-11-18T19:00:00Z',
    });
    assert.equal(scanned.length, 1);
    assert.equal(scanned[0].sensitiveCount, 2);
    assert.ok(scanned[0].markers.includes('package.json'));

    const manifest = store.listProjectManifest('sample-app');
    const envEntry = manifest.find((m) => m.relativePath.endsWith('/.env'));
    const exampleEntry = manifest.find((m) => m.relativePath.endsWith('/.env.example'));
    assert.equal(envEntry?.sensitivity, 'secret-name-only');
    assert.equal(envEntry?.checksum, null);
    assert.equal(exampleEntry?.sensitivity, 'public');
    assert.ok(typeof exampleEntry?.checksum === 'string' && exampleEntry.checksum.length === 64);

    // Ensure no audit log or manifest contains secret content
    const serialized = JSON.stringify({ manifest, audit: store.listAuditEvents() });
    assert.ok(!serialized.includes('top_secret_123'));
  } finally {
    store.close();
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('evidenceAggregator delegates strictly to core-contracts without fabricating work', () => {
  const store = new SqliteStore(':memory:');
  const now = 100_000;
  try {
    // Open process observation only -> must NEVER produce 'working'
    store.recordAgentEvent({
      agentId: 'codex',
      runId: null,
      origin: 'process-observation',
      trust: 'verified',
      open: true,
      taskStatus: 'running',
      taskId: 'proc-1',
      observedAtMs: now - 1000,
    });
    // Verified MCP running task -> produces 'working'
    store.recordAgentEvent({
      agentId: 'antigravity',
      runId: 'run-1',
      origin: 'cloud-workspace-mcp',
      trust: 'verified',
      open: true,
      taskStatus: 'running',
      taskId: 'task-ag-1',
      observedAtMs: now - 1000,
    });
    // External task must NOT make chief visible
    store.upsertTask({
      id: 'ext-1',
      projectId: 'p1',
      origin: 'external',
      trust: 'verified',
      executor: 'manual',
      commandProfile: 'none',
      status: 'running',
      resumable: false,
      startedAtMs: now - 5000,
      observedAtMs: now - 1000,
      finishedAtMs: null,
      sanitizedLog: '',
    });

    const snap1 = aggregateEvidenceFromStore(
      store,
      ['chatgpt', 'codex', 'antigravity', 'claude'],
      now,
      30_000,
      [{ id: 'drive', verified: true, connected: true }, { id: 'hostinger', verified: false, connected: null }],
    );
    assert.equal(snap1.agents.chatgpt.state, 'unknown');
    assert.equal(snap1.agents.codex.state, 'unknown');
    assert.equal(snap1.agents.antigravity.state, 'working');
    assert.equal(snap1.chiefVisible, false);
    assert.equal(snap1.connections.drive, 'connected');
    assert.equal(snap1.connections.hostinger, 'unknown');

    // Verified cloud-workspace task -> chief becomes visible
    store.upsertTask({
      id: 'cw-1',
      projectId: 'p1',
      origin: 'cloud-workspace',
      trust: 'verified',
      executor: 'mcp',
      commandProfile: 'build',
      status: 'running',
      resumable: true,
      startedAtMs: now - 2000,
      observedAtMs: now - 500,
      finishedAtMs: null,
      sanitizedLog: '',
    });
    const snap2 = aggregateEvidenceFromStore(store, ['antigravity'], now);
    assert.equal(snap2.chiefVisible, true);
  } finally {
    store.close();
  }
});

test('read-only scan of live Google Drive Projetos Code (when mounted) discovers cloud-workspace-ia without writing', () => {
  if (!fs.existsSync(DEFAULT_PROJECTS_ROOT)) {
    return;
  }
  const scanned = scanProjectsRoot(DEFAULT_PROJECTS_ROOT, { maxDepth: 2, computeSmallHashes: false });
  const cw = scanned.find((p) => p.project.slug === 'cloud-workspace-ia');
  assert.ok(cw, 'cloud-workspace-ia must be cataloged on G:\\');
  assert.ok(cw.subfolders.includes('Arquivos Navegaveis'));
  assert.ok(cw.subfolders.includes('Direcao Artistica - R03 - 2026-11-16'));
});
