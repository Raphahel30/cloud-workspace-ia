import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SHOTS_DIR = path.resolve('docs/antigravity/screenshots');

test('operational standardized UI connects to real core, Drive catalog, MCP agent validation, sandbox workspaces, security and preserves office controls', async ({ page }) => {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');

  // 1. Main dashboard & preserved 5-floor office + Core PID indicator
  await expect(page.getByText(/CORE PID \d+/)).toBeVisible({ timeout: 10_000 });
  const officeHost = page.getByTestId('office-renderer');
  await expect(officeHost).toBeVisible();
  await expect(officeHost.locator('canvas')).toHaveCount(1, { timeout: 10_000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: path.join(SHOTS_DIR, '01-escritorio-e-resumo-core.png') });

  // 2. Projetos (real Google Drive G:\ read-only catalog)
  await page.getByRole('button', { name: 'Projetos', exact: true }).click();
  await expect(page.getByTestId('screen-projects')).toBeVisible();
  await expect(page.getByTestId('project-card-cloud-workspace-ia')).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS_DIR, '02-projetos-google-drive.png') });

  await page.getByTestId('inspect-project-cloud-workspace-ia').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar janela' }).click();

  // 3. Agentes IA (DESCONHECIDO when unverified -> progressive live MCP validation for 2 agents)
  await page.getByRole('button', { name: 'Agentes IA', exact: true }).click();
  await expect(page.getByTestId('screen-agents')).toBeVisible();
  await expect(page.getByTestId('agent-card-chatgpt')).toContainText('DESCONHECIDO');
  await page.getByTestId('validate-mcp-antigravity').click();
  await expect(page.getByTestId('agent-card-antigravity')).toContainText('Handshake JSON-RPC validado', {
    timeout: 10_000,
  });
  await page.getByTestId('validate-mcp-codex').click();
  await expect(page.getByTestId('agent-card-codex')).toContainText('Handshake JSON-RPC validado', {
    timeout: 10_000,
  });
  await expect(page.getByTestId('agent-card-chatgpt')).toContainText('DESCONHECIDO');
  await page.screenshot({ path: path.join(SHOTS_DIR, '03-agentes-ia-mcp.png') });

  // 4. Workspaces (prepare sandbox -> patch SHA-256 -> encrypted backup -> conflict -> cleanup modal)
  await page.getByRole('button', { name: 'Workspaces', exact: true }).click();
  await expect(page.getByTestId('screen-workspaces')).toBeVisible();
  await page.getByTestId('prepare-sandbox-btn').click();
  await expect(page.getByTestId('ws-patch-btn')).toBeEnabled({ timeout: 10_000 });
  await page.getByTestId('ws-patch-btn').click();
  await expect(page.getByText(/Arquivo src\/index\.ts alterado/)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('ws-backup-btn').click();
  await expect(page.getByText(/Backup AES-256-GCM criado fora do Drive/)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('ws-sync-btn').click();
  await expect(page.getByText(/Checkpoint verificado/)).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('ws-cleanup-preview-btn').click();
  await expect(page.getByText(/liberáveis com segurança após aprovação/)).toBeVisible({ timeout: 10_000 });
  await page.screenshot({ path: path.join(SHOTS_DIR, '04-workspaces-sandbox.png') });

  await page.getByTestId('ws-cleanup-exec-btn').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('confirm-cleanup-modal-btn').click();
  await expect(page.getByText(/Área temporária de teste liberada/)).toBeVisible({ timeout: 10_000 });

  // 5. Integrações
  await page.getByRole('button', { name: 'Integrações', exact: true }).click();
  await expect(page.getByTestId('screen-connections')).toBeVisible();
  await expect(page.getByTestId('integration-card-google-drive')).toContainText('CONECTADO');
  await expect(page.getByTestId('integration-card-hostinger')).toContainText('DESCONHECIDO');
  await page.screenshot({ path: path.join(SHOTS_DIR, '05-integracoes-reais.png') });

  // 6. Testes e logs
  await page.getByRole('button', { name: 'Testes e logs', exact: true }).click();
  await expect(page.getByTestId('screen-tests')).toBeVisible();
  await page.getByTestId('run-profile-node-policy').click();
  await expect(page.locator('.cw-log-pre')).toContainText('pass 3', { timeout: 15_000 });
  await page.screenshot({ path: path.join(SHOTS_DIR, '06-testes-logs-hardware.png') });

  // 7. Segurança & Etapa 8 Frozen Pixel Art
  await page.getByRole('button', { name: 'Segurança', exact: true }).click();
  await expect(page.getByTestId('screen-security')).toBeVisible();
  await page.getByTestId('run-keepass-fictitious-btn').click();
  await expect(page.getByText(/zeroizedAfterUse":true/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Encaixe personagem-cadeira e oclusão de braço\/mesa/)).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS_DIR, '07-seguranca-keepassxc-etapa8.png') });

  // 8. Minimize / background suspend & restore behavior
  await page.getByRole('button', { name: 'Escritório', exact: true }).click();
  await expect(officeHost).toHaveAttribute('data-suspended', 'false');
  await officeHost.evaluate((el) => {
    (el as HTMLElement).style.display = 'none';
  });
  await expect(officeHost).toHaveAttribute('data-suspended', 'true');
  await officeHost.evaluate((el) => {
    (el as HTMLElement).style.display = '';
  });
  await expect(officeHost).toHaveAttribute('data-suspended', 'false');

  expect(errors).toEqual([]);
});
