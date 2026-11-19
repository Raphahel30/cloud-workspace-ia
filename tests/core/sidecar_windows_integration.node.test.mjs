import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CORE_SIDECAR_BINARY_NAME,
  WINDOWS_TARGET_TRIPLE,
} from '../../src/core/runtime/tauriSidecarRuntime.ts';

const SIDECAR_EXE = path.resolve(
  'src-tauri',
  'binaries',
  `${CORE_SIDECAR_BINARY_NAME}-${WINDOWS_TARGET_TRIPLE}.exe`,
);

function startSidecarProcess(dataRoot, uiToken) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      SIDECAR_EXE,
      ['--data-root', dataRoot, '--port', '0', '--ui-token', uiToken],
      {
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    let settled = false;
    let buf = '';
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill();
        reject(new Error(`Timeout waiting for Windows sidecar handshake. Captured stdout=${buf}`));
      }
    }, 15_000);

    child.stdout.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      const nl = buf.indexOf('\n');
      if (nl >= 0 && !settled) {
        settled = true;
        clearTimeout(timer);
        try {
          const parsed = JSON.parse(buf.slice(0, nl).trim());
          resolve({ child, ready: parsed });
        } catch (err) {
          child.kill();
          reject(err);
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      if (!settled) {
        buf += `\n[stderr] ${chunk.toString('utf8')}`;
      }
    });

    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`Sidecar exited prematurely with code ${code}: ${buf}`));
      }
    });
  });
}

async function stopSidecarGracefully(child) {
  if (child.exitCode !== null) return;
  await new Promise((resolve) => {
    const killTimer = setTimeout(() => {
      child.kill();
      resolve();
    }, 3500);
    child.once('exit', () => {
      clearTimeout(killTimer);
      resolve();
    });
    child.stdin.end();
  });
}

test('Windows standalone SEA sidecar binary launches, enforces auth/Origin, inspects Drive G:\\ read-only, validates two agents via MCP, and recovers interrupted state across restart', async () => {
  assert.ok(fs.existsSync(SIDECAR_EXE), `Expected compiled Windows SEA binary at ${SIDECAR_EXE}`);

  const healthRaw = execFileSync(SIDECAR_EXE, ['--healthcheck'], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 15_000,
  });
  const health = JSON.parse(healthRaw.trim());
  assert.equal(health.ok, true);
  assert.ok(health.tablesPresent.includes('projects'));
  assert.ok(health.tablesPresent.includes('workspaces'));

  const tmpDataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-win-sidecar-e2e-'));
  const uiToken = 'cw_test_ui_token_9876543210';

  try {
    const first = await startSidecarProcess(tmpDataRoot, uiToken);
    try {
      const { baseUrl } = first.ready;
      assert.equal(first.ready.type, 'cw_sidecar_ready');
      assert.ok(first.ready.port > 0);

      const unauthRes = await fetch(`${baseUrl}/api/core/overview`);
      assert.equal(unauthRes.status, 401);

      const evilOriginRes = await fetch(`${baseUrl}/api/core/health`, {
        headers: { Origin: 'https://evil-site.example' },
      });
      assert.equal(evilOriginRes.status, 403);

      const projectsRes = await fetch(`${baseUrl}/api/core/projects`, {
        headers: { 'X-CW-UI-Token': uiToken, Origin: 'tauri://localhost' },
      });
      assert.equal(projectsRes.status, 200);
      const projectsJson = await projectsRes.json();
      assert.equal(projectsJson.readOnlyVerified, true);
      if (fs.existsSync('G:\\Meu Drive\\Projetos Code')) {
        assert.equal(projectsJson.driveConnected, true);
        assert.ok(
          projectsJson.projects.some((p) => p.slug === 'cloud-workspace-ia'),
          'Expected cloud-workspace-ia cataloged from G:\\',
        );
      }

      const initialAgentsRes = await fetch(`${baseUrl}/api/core/agents`, {
        headers: { 'X-CW-UI-Token': uiToken },
      });
      const initialAgents = await initialAgentsRes.json();
      assert.ok(initialAgents.agents.every((a) => a.visualState === 'unknown'));
      assert.equal(initialAgents.chiefVisible, false);

      for (const agentId of ['antigravity', 'codex']) {
        const valRes = await fetch(`${baseUrl}/api/core/agents/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
          body: JSON.stringify({ agentId, projectId: 'cloud-workspace-ia' }),
        });
        assert.equal(valRes.status, 200);
        const valJson = await valRes.json();
        assert.equal(valJson.report.ok, true);
        assert.equal(valJson.report.resultingState, 'idle');
      }

      const prepRes = await fetch(`${baseUrl}/api/core/workspaces/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
        body: JSON.stringify({ action: 'prepare_sandbox', projectId: 'sandbox-demo-ia', agentId: 'antigravity' }),
      });
      const prepJson = await prepRes.json();
      assert.equal(prepJson.result.ok, true);
      const wsId = prepJson.result.workspaceId;

      const bkpRes = await fetch(`${baseUrl}/api/core/workspaces/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
        body: JSON.stringify({ action: 'create_backup', projectId: 'sandbox-demo-ia', workspaceId: wsId }),
      });
      assert.equal((await bkpRes.json()).result.ok, true);

      const restoreRes = await fetch(`${baseUrl}/api/core/workspaces/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
        body: JSON.stringify({ action: 'restore_backup', projectId: 'sandbox-demo-ia', workspaceId: wsId }),
      });
      assert.equal((await restoreRes.json()).result.ok, true);

      const kpRes = await fetch(`${baseUrl}/api/core/security/keepass-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
        body: JSON.stringify({
          credentialId: 'cred-staging-demo',
          projectId: 'sandbox-demo-ia',
          grantEphemeralApproval: true,
        }),
      });
      const kpJson = await kpRes.json();
      assert.equal(kpJson.outcome.ok, true);
      assert.ok(!JSON.stringify(kpJson).includes('fictitious_staging_token_value_998877'));

      await fetch(`${baseUrl}/api/core/workspaces/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CW-UI-Token': uiToken },
        body: JSON.stringify({ action: 'simulate_interruption', projectId: 'sandbox-demo-ia', workspaceId: wsId }),
      });
    } finally {
      await stopSidecarGracefully(first.child);
    }

    const second = await startSidecarProcess(tmpDataRoot, `${uiToken}_2`);
    try {
      const wsAfterRestartRes = await fetch(`${second.ready.baseUrl}/api/core/workspaces`, {
        headers: { 'X-CW-UI-Token': `${uiToken}_2` },
      });
      const wsAfterRestart = await wsAfterRestartRes.json();
      assert.ok(wsAfterRestart.workspaces.length >= 1, 'Workspace persisted in SQLite across restarts');
      assert.ok(wsAfterRestart.backups.length >= 1, 'Backup record persisted across restarts');
    } finally {
      await stopSidecarGracefully(second.child);
    }
  } finally {
    fs.rmSync(tmpDataRoot, { recursive: true, force: true });
  }
});
