import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const ASSETS_DIR = path.join(ROOT, 'assets', 'workstation-proof');
const CAPTURES_DIR = path.join(ASSETS_DIR, 'captures');
const REF_PATH =
  'G:/Meu Drive/Projetos Code/01 - Projetos/cloud-workspace-ia/Direcao Artistica - R03 - 2026-11-16/R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png';

const W = 1800;
const H = 1260;

async function main() {
  const transparentBg = { r: 10, g: 22, b: 36, alpha: 1 };
  const refMeta = await sharp(REF_PATH).metadata();
  const rw = refMeta.width ?? 1536;
  const rh = refMeta.height ?? 1024;

  // Crop Station 1 region (left window + first workstation + overhead light + rug)
  const cropW = Math.round(rw * 0.36);
  const cropH = Math.round(rh * 0.72);
  const cropTop = Math.round(rh * 0.10);
  const refCrop = await sharp(REF_PATH)
    .extract({ left: Math.round(rw * 0.02), top: cropTop, width: cropW, height: cropH })
    .resize(560, 390, { fit: 'contain', kernel: 'nearest', background: transparentBg })
    .png()
    .toBuffer();

  const liveType = await sharp(path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_TYPE.png'))
    .resize(560, 390, { fit: 'contain', kernel: 'nearest', background: transparentBg })
    .png()
    .toBuffer();

  const liveIsolated = await sharp(path.join(CAPTURES_DIR, 'PROVA_ESTACAO_PIXI_CAMADAS_ISOLADAS.png'))
    .resize(560, 390, { fit: 'contain', kernel: 'nearest', background: transparentBg })
    .png()
    .toBuffer();

  const poseFiles = [
    ['PROVA_ESTACAO_PIXI_WALK.png', 30],
    ['PROVA_ESTACAO_PIXI_SIT.png', 465],
    ['PROVA_ESTACAO_PIXI_TYPE.png', 900],
    ['PROVA_ESTACAO_PIXI_STAND.png', 1335],
  ];
  const poseBuffers = [];
  for (const [file, left] of poseFiles) {
    const buf = await sharp(path.join(CAPTURES_DIR, file))
      .resize(425, 290, { fit: 'contain', kernel: 'nearest', background: transparentBg })
      .png()
      .toBuffer();
    poseBuffers.push({ input: buf, left, top: 535 });
  }

  const assetsBoard = await sharp(path.join(ASSETS_DIR, 'PROVA_ASSETS_SEPARADOS_TRANSPARENCIA.png'))
    .resize(1740, 340, { fit: 'contain', background: { r: 13, g: 23, b: 36, alpha: 1 } })
    .png()
    .toBuffer();

  const boardSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#0a1522"/>
      <text x="30" y="38" font-family="Segoe UI, Arial" font-size="24" font-weight="bold" fill="#ffd48a">COMPARATIVO OFICIAL — PROVA ARTISTICA DE 1 ESTACAO (R03_02 vs ASSETS vs PIXIJS 8 AO VIVO)</text>
      <text x="30" y="62" font-family="Segoe UI, Arial" font-size="14" fill="#9bc2d4">Estacao 01 construida com 12 camadas RGBA independentes (transparencia real), spritesheet 4x3 e mapa Tiled/Pixelorama executando em WebGL.</text>

      <!-- Top row: 3 main comparisons -->
      <rect x="30" y="80" width="560" height="425" rx="8" fill="#0d1b2c" stroke="#e4b870" stroke-width="2"/>
      <text x="44" y="103" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">1. REFERENCIA ORIGINAL (Recorte R03_02 — Estacao 01)</text>

      <rect x="620" y="80" width="560" height="425" rx="8" fill="#0d1b2c" stroke="#6be0cc" stroke-width="2"/>
      <text x="634" y="103" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#8df5e2">2. CENA REAL EXECUTANDO NO PIXIJS 8 (Modo Digitar)</text>

      <rect x="1210" y="80" width="560" height="425" rx="8" fill="#0d1b2c" stroke="#60a8d6" stroke-width="2"/>
      <text x="1224" y="103" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#8bd3ff">3. PROVA DE CAMADAS (Parede e Mesa Desligadas ao Vivo)</text>

      <!-- Middle row: 4 animation states -->
      <text x="30" y="528" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">4. SEQUENCIA REAL NO APLICATIVO (Playwright Captures): WALK  ->  SIT  ->  TYPE  ->  STAND</text>
      <rect x="30" y="535" width="425" height="290" fill="none" stroke="#3c6075" stroke-width="1"/>
      <rect x="465" y="535" width="425" height="290" fill="none" stroke="#3c6075" stroke-width="1"/>
      <rect x="900" y="535" width="425" height="290" fill="none" stroke="#3c6075" stroke-width="1"/>
      <rect x="1335" y="535" width="425" height="290" fill="none" stroke="#3c6075" stroke-width="1"/>
      <text x="42" y="844" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">A. CAMINHAR (walk)</text>
      <text x="477" y="844" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">B. SENTAR (sit)</text>
      <text x="912" y="844" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">C. DIGITAR (type)</text>
      <text x="1347" y="844" font-family="Consolas, monospace" font-size="13" fill="#bde7f0">D. LEVANTAR (stand)</text>

      <!-- Bottom row: extracted assets checkerboard -->
      <rect x="28" y="862" width="1744" height="380" rx="8" fill="#0d1724" stroke="#456c84" stroke-width="2"/>
      <text x="42" y="884" font-family="Segoe UI, Arial" font-size="14" font-weight="bold" fill="#ffd48a">5. ASSETS SEPARADOS EM CAMADAS &amp; QUADROS INDIVIDUAIS (Transparencia Real sobre Fundo Xadrez)</text>
    </svg>
  `);

  const outPath = path.join(ASSETS_DIR, 'COMPARACAO_PROVA_ESTACAO_R03_02.png');
  await sharp(boardSvg)
    .composite([
      { input: refCrop, left: 30, top: 112 },
      { input: liveType, left: 620, top: 112 },
      { input: liveIsolated, left: 1210, top: 112 },
      ...poseBuffers,
      { input: assetsBoard, left: 30, top: 894 },
    ])
    .png()
    .toFile(outPath);

  console.log('Generated comparison board:', outPath, fs.statSync(outPath).size, 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
