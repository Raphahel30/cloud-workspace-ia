import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const CAPTURES_DIR = path.join(process.cwd(), 'assets', 'workstation-proof', 'captures');

test('single workstation R03_02 proof renders 12 RGBA layers and all 4 animation states in PixiJS 8', async ({
  page,
}) => {
  test.setTimeout(60_000);
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.setViewportSize({ width: 1440, height: 1020 });
  await page.goto('/?proof=workstation');

  const renderer = page.getByTestId('workstation-proof-renderer');
  const stageWrap = page.locator('.proof-stage-wrap');
  const pauseBtn = page.getByTestId('proof-pause-toggle');
  await expect(renderer).toHaveAttribute('data-proof-layers', '12');
  await expect(renderer).toHaveAttribute('data-proof-alpha', 'verified');
  await expect(renderer.locator('canvas')).toHaveCount(1);
  await stageWrap.scrollIntoViewIfNeeded();

  // Helper to advance animation briefly, pause for deterministic crisp capture, then resume
  const capturePose = async (modeTestId: string, expectedPose: string, waitMs: number, fileName: string, alsoFull = false) => {
    await page.getByTestId(modeTestId).click();
    await expect(renderer).toHaveAttribute('data-proof-pose', expectedPose);
    await page.waitForTimeout(waitMs);
    await pauseBtn.click();
    await expect(pauseBtn).toHaveAttribute('aria-pressed', 'true');
    await stageWrap.screenshot({ path: path.join(CAPTURES_DIR, fileName), animations: 'disabled' });
    if (alsoFull) {
      await page.screenshot({ path: path.join(CAPTURES_DIR, 'PROVA_ESTACAO_UI_COMPLETA.png'), animations: 'disabled' });
    }
    await pauseBtn.click();
    await expect(pauseBtn).toHaveAttribute('aria-pressed', 'false');
  };

  await capturePose('proof-mode-type', 'type', 300, 'PROVA_ESTACAO_PIXI_TYPE.png', true);
  await capturePose('proof-mode-walk', 'walk', 950, 'PROVA_ESTACAO_PIXI_WALK.png');
  await capturePose('proof-mode-sit', 'sit', 450, 'PROVA_ESTACAO_PIXI_SIT.png');
  await capturePose('proof-mode-stand', 'stand', 450, 'PROVA_ESTACAO_PIXI_STAND.png');

  // Prove independent layers: switch back to type, pause, hide Wall + Desk
  await page.getByTestId('proof-mode-type').click();
  await expect(renderer).toHaveAttribute('data-proof-pose', 'type');
  await page.getByTestId('toggle-layer-wall').click();
  await page.getByTestId('toggle-layer-desk').click();
  await expect(renderer).toHaveAttribute('data-proof-visible-layers', '10');
  await pauseBtn.click();
  await stageWrap.screenshot({
    path: path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png'),
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'Mostrar todas as camadas' }).click();
  await expect(renderer).toHaveAttribute('data-proof-visible-layers', '12');
  expect(errors).toEqual([]);
});
