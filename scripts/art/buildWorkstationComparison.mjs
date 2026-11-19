import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'assets', 'workstation-proof');
const CAPTURES_DIR = path.join(ASSETS_DIR, 'captures');
const SCREENSHOTS_5F = path.join(ROOT, 'docs', 'codex', 'screenshots');
const REF_PATH =
  'G:/Meu Drive/Projetos Code/01 - Projetos/cloud-workspace-ia/Direcao Artistica - R03 - 2026-11-16/R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png';

const W = 1880;
const H = 1320;

async function main() {
  const darkBg = { r: 10, g: 22, b: 36, alpha: 1 };
  const refMeta = await sharp(REF_PATH).metadata();
  const rw = refMeta.width ?? 1536;
  const rh = refMeta.height ?? 1024;

  // Full reference frame for panoramic comparison alongside Floor 03
  const refFull = await sharp(REF_PATH)
    .resize(580, 390, { fit: 'contain', kernel: 'nearest', background: darkBg })
    .png()
    .toBuffer();

  const floorFullLive = await sharp(path.join(CAPTURES_DIR, 'PROVA_ANDAR03_COMPLETO_4_ESTACOES_PIXI.png'))
    .resize(580, 390, { fit: 'contain', kernel: 'nearest', background: darkBg })
    .png()
    .toBuffer();

  // Stacked split: Station 1 Type (top half) + Isolated Without Desk/Wall (bottom half) -> proves chair fit!
  const zoomTypeHalf = await sharp(path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_TYPE.png'))
    .resize(285, 390, { fit: 'contain', kernel: 'nearest', background: darkBg })
    .png()
    .toBuffer();

  const isolatedHalf = await sharp(path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png'))
    .resize(285, 390, { fit: 'contain', kernel: 'nearest', background: darkBg })
    .png()
    .toBuffer();

  const stripFiles = [
    ['PROVA_ESTACAO_PIXI_WALK.png', 28],
    ['PROVA_ESTACAO_PIXI_SIT.png', 396],
    ['PROVA_ESTACAO_PIXI_TYPE.png', 764],
    ['PROVA_ESTACAO_PIXI_STAND.png', 1132],
    [path.join(SCREENSHOTS_5F, 'premium-working-zoom-1440x900.png'), 1500, true],
  ];
  const stripComposites = [];
  for (const [src, left, isAbs] of stripFiles) {
    const filePath = isAbs ? src : path.join(CAPTURES_DIR, src);
    const buf = await sharp(filePath)
      .resize(352, 240, { fit: 'contain', kernel: 'nearest', background: darkBg })
      .png()
      .toBuffer();
    stripComposites.push({ input: buf, left, top: 552 });
  }

  const assetsBoard = await sharp(path.join(ASSETS_DIR, 'PROVA_ASSETS_SEPARADOS_TRANSPARENCIA.png'))
    .resize(1820, 415, { fit: 'contain', background: { r: 12, g: 21, b: 34, alpha: 1 } })
    .png()
    .toBuffer();

  const boardSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#0a1522"/>
      <text x="28" y="38" font-family="Segoe UI, Arial" font-size="24" font-weight="bold" fill="#ffd48a">COMPARATIVO ETAPA 4 — ENCAIXE NA CADEIRA &amp; BIBLIOTECA EXPANDIDA DO ANDAR 03 (R03_02)</text>
      <text x="28" y="62" font-family="Segoe UI, Arial" font-size="14" fill="#9bc2d4">Oclusao real em sanduiche (encosto + sombra assento + personagem sentado + braco frontal cadeira + mesa + antebracos sobre teclado) e 38 assets RGBA.</text>

      <!-- Top row -->
      <rect x="28" y="78" width="584" height="432" rx="8" fill="#0d1b2c" stroke="#e4b870" stroke-width="2"/>
      <text x="42" y="102" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">1. PROPOSTA R03_02 ORIGINAL (4 Estacoes + Robo IA + Decoracao)</text>

      <rect x="646" y="78" width="584" height="432" rx="8" fill="#0d1b2c" stroke="#6be0cc" stroke-width="2"/>
      <text x="660" y="102" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#8df5e2">2. ANDAR 03 COMPLETO NO PIXIJS 8 (38 Sprites RGBA Independentes)</text>

      <rect x="1264" y="78" width="588" height="432" rx="8" fill="#0d1b2c" stroke="#60a8d6" stroke-width="2"/>
      <text x="1278" y="102" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#8bd3ff">3. ZOOM ENCAIXE NA CADEIRA (Com Mesa vs Sem Parede/Sem Mesa)</text>

      <!-- Middle row -->
      <text x="28" y="538" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">4. TRANSICAO COMPLETA AO VIVO (Walk -&gt; Sit -&gt; Type -&gt; Stand) + ZOOM NO PREDIO DE 5 ANDARES:</text>
      <text x="36" y="814" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">A. CAMINHAR (walk)</text>
      <text x="404" y="814" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">B. SENTAR (sit)</text>
      <text x="772" y="814" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">C. DIGITAR SENTADO (type)</text>
      <text x="1140" y="814" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">D. LEVANTAR (stand)</text>
      <text x="1508" y="814" font-family="Consolas, monospace" font-size="13" fill="#ffd48a">E. PREDIO 5 ANDARES (Andar 03)</text>

      <!-- Bottom row -->
      <rect x="28" y="832" width="1824" height="466" rx="8" fill="#0d1724" stroke="#456c84" stroke-width="2"/>
      <text x="42" y="856" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">5. BIBLIOTECA MODULAR EXPANDIDA (38 Assets RGBA com Transparencia Real, Oclusao de Cadeira e 4 Desenvolvedores)</text>
    </svg>
  `);

  const outPath = path.join(ASSETS_DIR, 'COMPARACAO_PROVA_ESTACAO_R03_02.png');
  await sharp(boardSvg)
    .composite([
      { input: refFull, left: 30, top: 112 },
      { input: floorFullLive, left: 648, top: 112 },
      { input: zoomTypeHalf, left: 1268, top: 112 },
      { input: isolatedHalf, left: 1562, top: 112 },
      ...stripComposites,
      { input: assetsBoard, left: 30, top: 870 },
    ])
    .png()
    .toFile(outPath);

  console.log(`Generated updated comparison board (${rw}x${rh} ref):`, outPath, fs.statSync(outPath).size, 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
