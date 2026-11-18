/**
 * Generates an original 16-bit pixel-art 1024x1024 app icon for Cloud Workspace IA
 * with nearest-neighbor crisp edges for Tauri icon packaging.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('assets', { recursive: true });

const GRID = 32;
const SCALE = 32;
const SIZE = GRID * SCALE;

const rects = [];
const px = (x, y, w, h, fill) => {
  rects.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`);
};

// Outer dark frame + inset navy body
px(0, 0, 32, 32, '#0c192a');
px(1, 1, 30, 30, '#f3c87e'); // warm gold pixel border
px(2, 2, 28, 28, '#142b40'); // deep navy interior
px(3, 3, 26, 26, '#102437');

// Subtle top highlight & bottom shade inside bezel
px(3, 3, 26, 1, '#29495e');
px(3, 28, 26, 1, '#091727');

// Pixel monogram "C" (x: 5..13, y: 6..17)
px(6, 6, 6, 2, '#f3c87e');
px(5, 8, 2, 7, '#f3c87e');
px(6, 15, 6, 2, '#f3c87e');
px(11, 8, 2, 2, '#ffd994');
px(11, 13, 2, 2, '#ffd994');

// Pixel monogram "W" (x: 15..27, y: 6..17)
px(15, 6, 2, 9, '#f3c87e');
px(17, 15, 2, 2, '#f3c87e');
px(19, 10, 2, 5, '#ffd994');
px(21, 15, 2, 2, '#f3c87e');
px(23, 6, 2, 9, '#f3c87e');
px(25, 6, 2, 9, '#e5b462');

// Cyan cloud pixel badge underneath (x: 8..24, y: 20..26)
px(13, 20, 6, 1, '#78dce7');
px(11, 21, 10, 1, '#78dce7');
px(9, 22, 14, 3, '#78dce7');
px(10, 25, 12, 1, '#4fb3c2');
px(13, 22, 4, 1, '#d1f5f9');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${GRID}" height="${GRID}" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">${rects.join('')}</svg>`;

const base32 = await sharp(Buffer.from(svg)).png().toBuffer();
await sharp(base32)
  .resize(SIZE, SIZE, { kernel: sharp.kernel.nearest })
  .png()
  .toFile('assets/icon-cw-1024.png');

console.log(`Generated assets/icon-cw-1024.png (${SIZE}x${SIZE})`);
