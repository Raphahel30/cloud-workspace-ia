import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

const CAPTURES_DIR = path.join(process.cwd(), 'assets', 'workstation-proof', 'captures');

test('single workstation R03_02 seated occlusion and expanded Floor 03 panorama render cleanly in PixiJS 8', async ({
  page,
}) => {
  test.setTimeout(90_000);
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));

  await page.setViewportSize({ width: 1440, height: 1020 });
  await page.goto('/?proof=workstation');

  const renderer = page.getByTestId('workstation-proof-renderer');
  const stageWrap = page.locator('.proof-stage-wrap');
  const pauseBtn = page.getByTestId('proof-pause-toggle');
  await expect(renderer).toHaveAttribute('data-proof-layers', '16');
  await expect(renderer).toHaveAttribute('data-proof-alpha', 'verified');
  await expect(renderer).toHaveAttribute('data-proof-seated-fit', 'nested-chair-occlusion');
  await expect(renderer).toHaveAttribute('data-proof-library-count', '38');
  await expect(renderer.locator('canvas')).toHaveCount(1);
  await stageWrap.scrollIntoViewIfNeeded();

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

  // 1. Capture single-station animations with true nested chair-cushion fit
  await capturePose('proof-mode-type', 'type', 300, 'PROVA_ESTACAO_PIXI_TYPE.png', true);
  await capturePose('proof-mode-walk', 'walk', 850, 'PROVA_ESTACAO_PIXI_WALK.png');
  await capturePose('proof-mode-sit', 'sit', 450, 'PROVA_ESTACAO_PIXI_SIT.png');
  await capturePose('proof-mode-stand', 'stand', 450, 'PROVA_ESTACAO_PIXI_STAND.png');

  // 2. Prove seated fit WITHOUT desk: hide Desk & Wall so we clearly see developer seated ON cushion & wrapped by front armrest
  await page.getByTestId('proof-mode-type').click();
  await expect(renderer).toHaveAttribute('data-proof-pose', 'type');
  await page.getByTestId('toggle-layer-wall').click();
  await page.getByTestId('toggle-layer-desk').click();
  await expect(renderer).toHaveAttribute('data-proof-visible-layers', '14');
  await pauseBtn.click();
  await stageWrap.screenshot({
    path: path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png'),
    animations: 'disabled',
  });
  await pauseBtn.click();

  // Restore all layers and switch camera to Full Enriched Floor 03 Panorama (`4 stations + Bot IA + Elevator 03`)
  await page.getByRole('button', { name: 'Mostrar todas as camadas' }).click();
  await expect(renderer).toHaveAttribute('data-proof-visible-layers', '16');
  await page.getByTestId('proof-camera-floor03').click();
  await expect(renderer).toHaveAttribute('data-proof-camera', 'floor03-full');
  await page.waitForTimeout(400);
  await pauseBtn.click();
  await stageWrap.screenshot({
    path: path.join(CAPTURES_DIR, 'PROVA_ANDAR03_COMPLETO_4_ESTACOES_PIXI.png'),
    animations: 'disabled',
  });

  expect(errors).toEqual([]);
});
