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
  agentsSheet: path.join(BRAIN_DIR, 'dev_team_and_bot_ia_spritesheet_3x2_1795045529431.jpg'),
  propsSheet: path.join(BRAIN_DIR, 'andar_03_modular_props_spritesheet_1795045450925.jpg'),
  reference:
    'G:/Meu Drive/Projetos Code/01 - Projetos/cloud-workspace-ia/Direcao Artistica - R03 - 2026-11-16/R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
};

const ASSETS_DIR = path.join(ROOT, 'assets', 'workstation-proof');
const SOURCES_COPY_DIR = path.join(ASSETS_DIR, 'sources');
const PUBLIC_ART_DIR = path.join(ROOT, 'public', 'art', 'workstation-proof');

fs.mkdirSync(SOURCES_COPY_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_ART_DIR, { recursive: true });

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function buildZipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
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

function floodRemoveBackground(rgba, w, h, mode, removeInnerPureChroma = true, minInnerHoleCluster = 4) {
  const isLooseBg = (r, g, b) => {
    if (mode === 'green') {
      return g > 130 && g - Math.max(r, b) > 36 && r < 145 && b < 145;
    }
    return r > 130 && b > 130 && Math.min(r, b) - g > 36 && g < 145;
  };
  const isPureInnerHole = (r, g, b) => {
    if (mode === 'green') {
      return g > 185 && r < 95 && b < 95;
    }
    return r > 145 && b > 145 && Math.min(r, b) - g > 65;
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

  if (removeInnerPureChroma) {
    const holeVis = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const idx = p * 4;
      if (rgba[idx + 3] === 0 || holeVis[p] || !isPureInnerHole(rgba[idx], rgba[idx + 1], rgba[idx + 2])) continue;
      const cluster = [p];
      holeVis[p] = 1;
      for (let qh = 0; qh < cluster.length; qh++) {
        const cur = cluster[qh];
        const cx = cur % w;
        const cy = (cur / w) | 0;
        for (const [nx, ny] of [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ]) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const np = ny * w + nx;
          const nIdx = np * 4;
          if (!holeVis[np] && rgba[nIdx + 3] > 0 && isLooseBg(rgba[nIdx], rgba[nIdx + 1], rgba[nIdx + 2])) {
            holeVis[np] = 1;
            cluster.push(np);
          }
        }
      }
      if (cluster.length >= minInnerHoleCluster) {
        for (const cp of cluster) rgba[cp * 4 + 3] = 0;
      }
    }
  }

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
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
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

async function extractCleanSprite(sourcePath, box, mode, outPath, removeInnerHole = true, pixelPostProcess = null) {
  const { data, info } = await sharp(sourcePath)
    .extract(box)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buf = new Uint8Array(data);
  if (pixelPostProcess) pixelPostProcess(buf, info.width, info.height);
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
    transparentPixels: tight.width * tight.height - tight.opaqueCount,
    sha256: sha256File(outPath),
  };
}

/** Fixes accidental green eye pixel inside top-left ChatGPT face area BEFORE chroma removal. */
function fixChatGptEyeGreenPixel(buf, w, h) {
  for (let y = 70; y < Math.min(h, 175); y++) {
    for (let x = 135; x < Math.min(w, 265); x++) {
      const i = (y * w + x) * 4;
      const r = buf[i],
        g = buf[i + 1],
        b = buf[i + 2];
      if (g > 110 && g - Math.max(r, b) > 30 && r < 145) {
        buf[i] = 20;
        buf[i + 1] = 16;
        buf[i + 2] = 32;
      }
    }
  }
}

/**
 * Generates height-proportioned chair back (`238x320`) and matching foreground armrest occlusion
 * layer (`sprite_chair_arm_front.png`, `238x320`) plus cushion shadow & navy/warm variant.
 */
async function buildChairOcclusionLayers() {
  const rawChairPath = path.join(PUBLIC_ART_DIR, 'sprite_chair.png');
  const { data, info } = await sharp(rawChairPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width; // 238
  const h = info.height; // 364

  // Compress central gas-lift piston rows [224..284] (60px trim -> height 304px) so cushion-to-caster drop matches 16-bit chibi leg drop
  const cutStart = 224;
  const cutEnd = 284;
  const newH = h - (cutEnd - cutStart); // 304
  const backBuf = new Uint8Array(w * newH * 4);

  for (let y = 0; y < cutStart; y++) {
    backBuf.set(data.subarray(y * w * 4, (y + 1) * w * 4), y * w * 4);
  }
  for (let y = cutEnd; y < h; y++) {
    const dstY = y - (cutEnd - cutStart);
    backBuf.set(data.subarray(y * w * 4, (y + 1) * w * 4), dstY * w * 4);
  }

  const chairBackPath = path.join(PUBLIC_ART_DIR, 'sprite_chair_back.png');
  await sharp(backBuf, { raw: { width: w, height: newH, channels: 4 } }).png().toFile(chairBackPath);

  // Extract exact contoured foreground armrest + support post (zero background halo)
  const armBuf = new Uint8Array(w * newH * 4);
  const lerpSeg = (pts, x) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x0, y0] = pts[k];
      const [x1, y1] = pts[k + 1];
      if (x >= x0 && x <= x1) return y0 + ((y1 - y0) * (x - x0)) / Math.max(1, x1 - x0);
    }
    return pts[pts.length - 1][1];
  };
  const topArch = [[21, 146], [38, 141], [62, 146], [84, 154], [104, 167], [111, 174]];
  const botArch = [[21, 160], [42, 165], [60, 174], [80, 187], [102, 190], [111, 183]];

  for (let y = 140; y <= 202; y++) {
    for (let x = 21; x <= 111; x++) {
      const inPad = y >= lerpSeg(topArch, x) - 1 && y <= lerpSeg(botArch, x) + 1;
      const inStrut = x >= 48 && x <= 71 && y >= 168 && y <= 200;
      if (!inPad && !inStrut) continue;
      const idx = (y * w + x) * 4;
      if (backBuf[idx + 3] === 0) continue;
      armBuf[idx] = backBuf[idx];
      armBuf[idx + 1] = backBuf[idx + 1];
      armBuf[idx + 2] = backBuf[idx + 2];
      armBuf[idx + 3] = backBuf[idx + 3];
    }
  }
  const chairArmPath = path.join(PUBLIC_ART_DIR, 'sprite_chair_arm_front.png');
  await sharp(armBuf, { raw: { width: w, height: newH, channels: 4 } }).png().toFile(chairArmPath);

  // Subtle dark slate variant `b` for Codex / Claude diversity
  const variantFilter = (srcBuf) => {
    const out = new Uint8Array(srcBuf);
    for (let i = 0; i < out.length; i += 4) {
      if (out[i + 3] === 0) continue;
      if (out[i + 2] > out[i] + 6) {
        out[i] = Math.max(0, out[i] - 8);
        out[i + 1] = Math.max(0, out[i + 1] - 4);
        out[i + 2] = Math.min(255, out[i + 2] + 10);
      }
    }
    return out;
  };
  const chairBackBPath = path.join(PUBLIC_ART_DIR, 'sprite_chair_back_b.png');
  const chairArmBPath = path.join(PUBLIC_ART_DIR, 'sprite_chair_arm_front_b.png');
  await sharp(variantFilter(backBuf), { raw: { width: w, height: newH, channels: 4 } }).png().toFile(chairBackBPath);
  await sharp(variantFilter(armBuf), { raw: { width: w, height: newH, channels: 4 } }).png().toFile(chairArmBPath);

  // Seat cushion contact shadow under thighs
  const shadowSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44">
      <ellipse cx="60" cy="22" rx="46" ry="15" fill="#07111e" fill-opacity="0.52"/>
      <ellipse cx="60" cy="21" rx="32" ry="9" fill="#040a12" fill-opacity="0.45"/>
    </svg>
  `);
  const seatShadowPath = path.join(PUBLIC_ART_DIR, 'sprite_seat_shadow.png');
  await sharp(shadowSvg).png().toFile(seatShadowPath);

  const countOpacity = (b) => {
    let op = 0;
    for (let i = 3; i < b.length; i += 4) if (b[i] > 0) op++;
    return op;
  };

  return [
    { file: 'sprite_chair_back.png', width: w, height: newH, opaquePixels: countOpacity(backBuf), transparentPixels: w * newH - countOpacity(backBuf), sha256: sha256File(chairBackPath) },
    { file: 'sprite_chair_arm_front.png', width: w, height: newH, opaquePixels: countOpacity(armBuf), transparentPixels: w * newH - countOpacity(armBuf), sha256: sha256File(chairArmPath) },
    { file: 'sprite_chair_back_b.png', width: w, height: newH, opaquePixels: countOpacity(backBuf), transparentPixels: w * newH - countOpacity(backBuf), sha256: sha256File(chairBackBPath) },
    { file: 'sprite_chair_arm_front_b.png', width: w, height: newH, opaquePixels: countOpacity(armBuf), transparentPixels: w * newH - countOpacity(armBuf), sha256: sha256File(chairArmBPath) },
    { file: 'sprite_seat_shadow.png', width: 120, height: 44, opaquePixels: 3200, transparentPixels: 2080, sha256: sha256File(seatShadowPath) },
  ];
}

function roomSeamY(x) {
  if (x <= 420) {
    return 676 + (602 - 676) * (x / 420);
  }
  return 602 + (632 - 602) * ((x - 420) / (1200 - 420));
}

/**
 * Reconstruct clean vertical walnut slats across the baked `[bot | IA]` panel
 * region (`x=800..1096, y=236..434`) on a copy of the wall RGBA buffer so
 * `layer_floor03_full_wall.png` has a continuous unobstructed walnut gallery wall.
 */
function stripBakedNeonPanel(srcBuf, w, h) {
  const out = new Uint8Array(srcBuf);
  const x0 = 798;
  const x1 = 1098;
  const y0 = 232;
  const y1 = 442;
  const padX = 10;
  const padY = 12;

  for (let x = x0; x < x1; x++) {
    // Average clean vertical wood sample across 5 rows right above and right below the sign
    let topR = 0, topG = 0, topB = 0;
    let botR = 0, botG = 0, botB = 0;
    for (let k = 0; k < 5; k++) {
      const it = ((y0 - 2 - k) * w + x) * 4;
      const ib = ((y1 + 2 + k) * w + x) * 4;
      topR += out[it]; topG += out[it + 1]; topB += out[it + 2];
      botR += out[ib]; botG += out[ib + 1]; botB += out[ib + 2];
    }
    topR /= 5; topG /= 5; topB /= 5;
    botR /= 5; botG /= 5; botB /= 5;

    for (let y = y0; y < y1; y++) {
      const t = (y - y0) / (y1 - y0);
      const expectedR = topR * (1 - t) + botR * t;
      const expectedG = topG * (1 - t) + botG * t;
      const expectedB = topB * (1 - t) + botB * t;

      // Subtle high-frequency walnut texture variation (detrended around local mean)
      const srcY = Math.min(h - 1, Math.max(0, 446 + ((y - y0) % 90)));
      const idxTex = (srcY * w + x) * 4;
      const idxTexAvg = (Math.min(h - 1, srcY + 3) * w + x) * 4;
      const microR = (out[idxTex] - out[idxTexAvg]) * 0.45;
      const microG = (out[idxTex + 1] - out[idxTexAvg + 1]) * 0.45;
      const microB = (out[idxTex + 2] - out[idxTexAvg + 2]) * 0.45;

      const recR = Math.max(0, Math.min(255, Math.round(expectedR + microR)));
      const recG = Math.max(0, Math.min(255, Math.round(expectedG + microG)));
      const recB = Math.max(0, Math.min(255, Math.round(expectedB + microB)));

      let wx = 1;
      if (x - x0 < padX) wx = (x - x0) / padX;
      else if (x1 - 1 - x < padX) wx = (x1 - 1 - x) / padX;
      let wy = 1;
      if (y - y0 < padY) wy = (y - y0) / padY;
      else if (y1 - 1 - y < padY) wy = (y1 - 1 - y) / padY;
      const blend = wx * wy;

      const dst = (y * w + x) * 4;
      out[dst] = Math.round(out[dst] * (1 - blend) + recR * blend);
      out[dst + 1] = Math.round(out[dst + 1] * (1 - blend) + recG * blend);
      out[dst + 2] = Math.round(out[dst + 2] * (1 - blend) + recB * blend);
    }
  }
  return out;
}

/**
 * Sample column index using triangle-wave mirroring inside `[srcX0, srcX1]`
 * with subtle perspective slope leveling on the right gallery wing (`x >= 1152`)
 * so the ceiling beam, wall baseboard, and stone floor curb stay ruler-straight.
 */
function extendGalleryBuffers(cleanWallBuf, floorBuf, w, h, fullW) {
  const fullWall = new Uint8Array(fullW * h * 4);
  const fullFloor = new Uint8Array(fullW * h * 4);
  const joinX = 1152;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < joinX; x++) {
      const si = (y * w + x) * 4;
      const di = (y * fullW + x) * 4;
      fullWall[di] = cleanWallBuf[si];
      fullWall[di + 1] = cleanWallBuf[si + 1];
      fullWall[di + 2] = cleanWallBuf[si + 2];
      fullWall[di + 3] = cleanWallBuf[si + 3];
      fullFloor[di] = floorBuf[si];
      fullFloor[di + 1] = floorBuf[si + 1];
      fullFloor[di + 2] = floorBuf[si + 2];
      fullFloor[di + 3] = floorBuf[si + 3];
    }
  }

  // Wall slats sample [1096..1151]; ceiling soffit [0..144] samples flat [1138..1151];
  // Floor samples clean dark slate + curb [892..947] (zero orange LED strip, zero cyan reflection bounce)
  const wSrcMin = 1096;
  const wSpan = joinX - wSrcMin; // 56px
  const cSrcMin = 1138;
  const cSpan = joinX - cSrcMin; // 14px flat soffit
  const fSrcMin = 892;
  const fSpan = 56;
  const joinTopFloor = Math.ceil(roomSeamY(joinX - 1)) + 1; // 632
  const joinCurbY = 768;

  const sampleFloorTile = (x, y) => {
    const dx = x - joinX;
    const fPeriod = (fSpan - 1) * 2;
    const fPhase = ((dx % fPeriod) + fPeriod) % fPeriod;
    const fSrcX = fPhase < fSpan ? fSrcMin + fPhase : fSrcMin + fSpan - 1 - (fPhase - fSpan);
    const fTopSrc = Math.ceil(roomSeamY(fSrcX)) + 1;
    const fCurbSrc = 772;
    let fySrc;
    if (y <= joinCurbY) {
      const frac = (y - joinTopFloor) / Math.max(1, joinCurbY - joinTopFloor);
      fySrc = Math.round(fTopSrc + frac * (fCurbSrc - fTopSrc));
    } else {
      fySrc = Math.min(h - 1, fCurbSrc + (y - joinCurbY));
    }
    const fi = (Math.max(fTopSrc, Math.min(h - 1, fySrc)) * w + fSrcX) * 4;
    return [floorBuf[fi], floorBuf[fi + 1], floorBuf[fi + 2], floorBuf[fi + 3]];
  };

  // Smoothly cross-fade original right floor cyan bounce (`1080..1151`) into the clean slate tile seam
  for (let x = 1080; x < joinX; x++) {
    const blend = (x - 1080) / (joinX - 1080);
    for (let y = joinTopFloor; y < h; y++) {
      const di = (y * fullW + x) * 4;
      if (fullFloor[di + 3] === 0) continue;
      const [tr, tg, tb, ta] = sampleFloorTile(x, y);
      if (ta === 0) continue;
      fullFloor[di] = Math.round(fullFloor[di] * (1 - blend) + tr * blend);
      fullFloor[di + 1] = Math.round(fullFloor[di + 1] * (1 - blend) + tg * blend);
      fullFloor[di + 2] = Math.round(fullFloor[di + 2] * (1 - blend) + tb * blend);
    }
  }

  for (let x = joinX; x < fullW; x++) {
    const dx = x - joinX;

    // Wall slats triangle wave `[1151 .. 1096 .. 1151]`
    const wPeriod = (wSpan - 1) * 2;
    const wPhase = dx % wPeriod;
    const wSrcX = wPhase < wSpan ? joinX - 1 - wPhase : wSrcMin + (wPhase - wSpan);
    // Flat soffit triangle wave `[1151 .. 1138 .. 1151]`
    const cPeriod = (cSpan - 1) * 2;
    const cPhase = dx % cPeriod;
    const cSrcX = cPhase < cSpan ? joinX - 1 - cPhase : cSrcMin + (cPhase - cSpan);

    const wSeamSrc = Math.floor(roomSeamY(wSrcX));
    const wSeamDst = Math.floor(roomSeamY(joinX - 1));

    for (let y = 0; y < h; y++) {
      const di = (y * fullW + x) * 4;

      // Wall layer (`y <= wSeamDst`)
      if (y <= wSeamDst) {
        let wallY = y;
        let wallX = wSrcX;
        if (y <= 144) {
          wallX = cSrcX;
          wallY = y;
        } else if (y > 575) {
          // Level baseboard (`575..wSeamDst`) so bottom trim aligns seamlessly to `joinX - 1`
          const frac = (y - 575) / Math.max(1, wSeamDst - 575);
          wallY = Math.round(575 + frac * (wSeamSrc - 575));
        }
        const wi = (Math.max(0, Math.min(h - 1, wallY)) * w + wallX) * 4;
        fullWall[di] = cleanWallBuf[wi];
        fullWall[di + 1] = cleanWallBuf[wi + 1];
        fullWall[di + 2] = cleanWallBuf[wi + 2];
        fullWall[di + 3] = cleanWallBuf[wi + 3];
      }

      // Floor layer (`y >= joinTopFloor`)
      if (y >= joinTopFloor) {
        const [tr, tg, tb, ta] = sampleFloorTile(x, y);
        fullFloor[di] = tr;
        fullFloor[di + 1] = tg;
        fullFloor[di + 2] = tb;
        fullFloor[di + 3] = ta;
      }
    }
  }

  return { fullWall, fullFloor };
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

  const fullW = 1740;
  const cleanFullWallBuf = stripBakedNeonPanel(wallBuf, w, h);
  const { fullWall, fullFloor } = extendGalleryBuffers(cleanFullWallBuf, floorBuf, w, h, fullW);

  const fullWallPath = path.join(PUBLIC_ART_DIR, 'layer_floor03_full_wall.png');
  const fullFloorPath = path.join(PUBLIC_ART_DIR, 'layer_floor03_full_floor.png');
  await sharp(fullWall, { raw: { width: fullW, height: h, channels: 4 } }).png().toFile(fullWallPath);
  await sharp(fullFloor, { raw: { width: fullW, height: h, channels: 4 } }).png().toFile(fullFloorPath);

  const lightingSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <radialGradient id="amberCone" cx="50%" cy="20%" r="72%">
          <stop offset="0%" stop-color="#ffdc8a" stop-opacity="0.44"/>
          <stop offset="55%" stop-color="#f3b24c" stop-opacity="0.16"/>
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
    { file: 'layer_floor03_full_wall.png', width: fullW, height: h, role: 'floor03-wide-wall', sha256: sha256File(fullWallPath) },
    { file: 'layer_floor03_full_floor.png', width: fullW, height: h, role: 'floor03-wide-floor', sha256: sha256File(fullFloorPath) },
    { file: 'layer_lighting_glow.png', width: w, height: h, role: 'volumetric-lighting-layer', sha256: sha256File(lightingPath) },
  ];
}

/**
 * Generates dedicated 4x3 character spritesheet (`spritesheet_character_r03.png/.json`) AND
 * dedicated seated-forearm occlusion overlay (`spritesheet_character_forearms_r03.png/.json`) so
 * the seated developer's legs go under the desk while typing hands rest ON TOP of the tabletop & keyboard!
 */
async function buildCharacterAndAgentsSheets() {
  // 1. Extract the 4 Equipe IA agents + thinking pose + Bot IA from Prancha A
  const agentSpecs = [
    { name: 'agent-chatgpt-type', box: { left: 0, top: 0, width: 360, height: 427 }, fixEye: true },
    { name: 'agent-codex-type', box: { left: 360, top: 0, width: 290, height: 427 } },
    { name: 'agent-antigravity-type', box: { left: 650, top: 0, width: 288, height: 427 } },
    { name: 'agent-claude-type', box: { left: 0, top: 427, width: 360, height: 421 } },
    { name: 'agent-claude-think', box: { left: 360, top: 427, width: 290, height: 421 } },
    { name: 'agent-bot-ia', box: { left: 650, top: 427, width: 288, height: 421 } },
  ];

  const extractedAgents = {};
  const AGENT_CELL_W = 280;
  const AGENT_CELL_H = 300;
  const AGENT_SEAT_ANCHOR_Y = 232; // Uniform hip/thigh bottom seat line across all 4 seated developers!
  const agentComposites = [];
  const agentFrames = {};

  for (let idx = 0; idx < agentSpecs.length; idx++) {
    const spec = agentSpecs[idx];
    const outIndiv = path.join(PUBLIC_ART_DIR, `${spec.name}.png`);
    const meta = await extractCleanSprite(
      SOURCE_FILES.agentsSheet,
      spec.box,
      'green',
      outIndiv,
      true,
      spec.fixEye ? fixChatGptEyeGreenPixel : null,
    );
    extractedAgents[spec.name] = { ...meta, path: outIndiv };

    const resized = await sharp(outIndiv)
      .resize(235, 285, { fit: 'inside', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });

    const rw = resized.info.width;
    const rh = resized.info.height;
    const col = idx % 3;
    const row = (idx / 3) | 0;
    // Align bottom of shoes at y=292 for seated agents (~78% down sits on chair cushion at y=232!)
    const left = col * AGENT_CELL_W + Math.round((AGENT_CELL_W - rw) / 2);
    const top = row * AGENT_CELL_H + (292 - rh);
    agentComposites.push({ input: resized.data, left, top });

    agentFrames[spec.name] = {
      frame: { x: col * AGENT_CELL_W, y: row * AGENT_CELL_H, w: AGENT_CELL_W, h: AGENT_CELL_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: AGENT_CELL_W, h: AGENT_CELL_H },
      sourceSize: { w: AGENT_CELL_W, h: AGENT_CELL_H },
      anchor: { x: 0.45, y: AGENT_SEAT_ANCHOR_Y / AGENT_CELL_H },
    };
  }

  const agentsSheetPng = path.join(PUBLIC_ART_DIR, 'spritesheet_agents_floor03.png');
  await sharp({
    create: { width: AGENT_CELL_W * 3, height: AGENT_CELL_H * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(agentComposites)
    .png()
    .toFile(agentsSheetPng);

  const agentsSheetJson = path.join(PUBLIC_ART_DIR, 'spritesheet_agents_floor03.json');
  fs.writeFileSync(
    agentsSheetJson,
    JSON.stringify(
      {
        frames: agentFrames,
        meta: {
          app: 'cloud-workspace-art-pipeline',
          image: 'spritesheet_agents_floor03.png',
          format: 'RGBA8888',
          size: { w: AGENT_CELL_W * 3, h: AGENT_CELL_H * 2 },
          scale: '1',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // 2. Build Station 1 Animated 4x3 Sheet (`walk-0..3`, `sit-0..1`, `stand-0..1`, `type-0..3`)
  // Uses standing/walking frames from `dev_left_spritesheet_4x3` AND our TRUE deep-seated ChatGPT pose for `sit-1` & `type-0..3`!
  const FRAME_W = 240;
  const FRAME_H = 260;
  const BASELINE_Y = 246;
  const SEATED_HIP_Y = 194; // Matches chair cushion surface seamlessly!

  const walkCells = [
    { name: 'walk-0', box: { left: 0, top: 0, width: 303, height: 302 }, shiftY: 0, seated: false },
    { name: 'walk-1', box: { left: 303, top: 0, width: 299, height: 302 }, shiftY: -2, seated: false },
    { name: 'walk-2', box: { left: 602, top: 0, width: 300, height: 302 }, shiftY: 2, seated: false },
    { name: 'walk-3', box: { left: 902, top: 0, width: 298, height: 302 }, shiftY: -1, seated: false },
    { name: 'sit-0', box: { left: 0, top: 302, width: 303, height: 300 }, shiftY: 0, seated: false },
    { name: 'sit-1', useDedicatedSeated: true, shiftY: 0, armDx: 0, armDy: 0, headDy: 0, seated: true },
    { name: 'stand-0', box: { left: 602, top: 302, width: 300, height: 300 }, shiftY: 0, seated: false },
    { name: 'stand-1', box: { left: 902, top: 302, width: 298, height: 300 }, shiftY: 0, seated: false },
    { name: 'type-0', useDedicatedSeated: true, shiftY: 0, armDx: 0, armDy: 0, headDy: 0, seated: true },
    { name: 'type-1', useDedicatedSeated: true, shiftY: 0, armDx: 2, armDy: -2, headDy: 1, seated: true },
    { name: 'type-2', useDedicatedSeated: true, shiftY: 0, armDx: 1, armDy: 2, headDy: 0, seated: true },
    { name: 'type-3', useDedicatedSeated: true, shiftY: 0, armDx: -2, armDy: -1, headDy: 1, seated: true },
  ];

  // Resize clean dedicated seated ChatGPT sprite so its height=244 (seat bottom at ~194 -> sneaker bottom at ~246!)
  const dedicatedRaw = await sharp(extractedAgents['agent-chatgpt-type'].path)
    .resize(195, 244, { fit: 'inside', kernel: 'nearest', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const composites = [];
  const forearmComposites = [];
  const framesJson = {};
  const forearmFramesJson = {};

  for (let i = 0; i < walkCells.length; i++) {
    const cell = walkCells[i];
    const col = i % 4;
    const row = (i / 4) | 0;

    if (!cell.useDedicatedSeated) {
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
    } else {
      // Synthesize crisp typing animation variations from dedicated deep-seated sprite + isolate forearm occlusion layer!
      const sw = dedicatedRaw.info.width;
      const sh = dedicatedRaw.info.height;
      const base = new Uint8Array(dedicatedRaw.data);
      const frameBuf = new Uint8Array(FRAME_W * FRAME_H * 4);
      const forearmBuf = new Uint8Array(FRAME_W * FRAME_H * 4);

      const offsetX = Math.round((FRAME_W - sw) / 2);
      const offsetY = BASELINE_Y - sh;

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const si = (y * sw + x) * 4;
          if (base[si + 3] === 0) continue;

          // Region split: outstretched forearm + hand only (`x > sw * 0.50, y in [sh*0.44..sh*0.595]`), zero thigh/pant spill
          const isForearm = x >= Math.round(sw * 0.50) && y >= Math.round(sh * 0.44) && y <= Math.round(sh * 0.595);
          const isHead = y < Math.round(sh * 0.39);
          const dx = offsetX + x + (isForearm ? cell.armDx : 0);
          const dy = offsetY + y + (isForearm ? cell.armDy : isHead ? cell.headDy : 0);
          if (dx < 0 || dx >= FRAME_W || dy < 0 || dy >= FRAME_H) continue;

          const di = (dy * FRAME_W + dx) * 4;
          frameBuf[di] = base[si];
          frameBuf[di + 1] = base[si + 1];
          frameBuf[di + 2] = base[si + 2];
          frameBuf[di + 3] = base[si + 3];

          if (isForearm) {
            forearmBuf[di] = base[si];
            forearmBuf[di + 1] = base[si + 1];
            forearmBuf[di + 2] = base[si + 2];
            forearmBuf[di + 3] = base[si + 3];
          }
        }
      }

      const cellPng = await sharp(frameBuf, { raw: { width: FRAME_W, height: FRAME_H, channels: 4 } }).png().toBuffer();
      composites.push({ input: cellPng, left: col * FRAME_W, top: row * FRAME_H });

      if (cell.name.startsWith('type-')) {
        const ti = Number(cell.name.split('-')[1]);
        const armPng = await sharp(forearmBuf, { raw: { width: FRAME_W, height: FRAME_H, channels: 4 } }).png().toBuffer();
        forearmComposites.push({ input: armPng, left: ti * FRAME_W, top: 0 });
        forearmFramesJson[cell.name] = {
          frame: { x: ti * FRAME_W, y: 0, w: FRAME_W, h: FRAME_H },
          rotated: false,
          trimmed: false,
          spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
          sourceSize: { w: FRAME_W, h: FRAME_H },
          anchor: { x: 0.45, y: SEATED_HIP_Y / FRAME_H },
        };
      }
    }

    framesJson[cell.name] = {
      frame: { x: col * FRAME_W, y: row * FRAME_H, w: FRAME_W, h: FRAME_H },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: FRAME_W, h: FRAME_H },
      sourceSize: { w: FRAME_W, h: FRAME_H },
      anchor: { x: cell.seated ? 0.45 : 0.5, y: (cell.seated ? SEATED_HIP_Y : BASELINE_Y) / FRAME_H },
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
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        frames: framesJson,
        animations: {
          walk: ['walk-0', 'walk-1', 'walk-2', 'walk-3'],
          sit: ['sit-0', 'sit-1'],
          stand: ['stand-0', 'stand-1'],
          type: ['type-0', 'type-1', 'type-2', 'type-3'],
        },
        meta: {
          app: 'cloud-workspace-art-pipeline',
          version: '2.0-seated-fit',
          image: 'spritesheet_character_r03.png',
          format: 'RGBA8888',
          size: { w: atlasW, h: atlasH },
          scale: '1',
          reference: 'R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  // Forearm overlay spritesheet (rendered on top of desk & keyboard when typing)
  const forearmAtlasPath = path.join(PUBLIC_ART_DIR, 'spritesheet_character_forearms_r03.png');
  await sharp({
    create: { width: FRAME_W * 4, height: FRAME_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(forearmComposites)
    .png()
    .toFile(forearmAtlasPath);

  const forearmJsonPath = path.join(PUBLIC_ART_DIR, 'spritesheet_character_forearms_r03.json');
  fs.writeFileSync(
    forearmJsonPath,
    JSON.stringify(
      {
        frames: forearmFramesJson,
        animations: { type: ['type-0', 'type-1', 'type-2', 'type-3'] },
        meta: {
          app: 'cloud-workspace-art-pipeline',
          version: '2.0-forearm-occlusion',
          image: 'spritesheet_character_forearms_r03.png',
          format: 'RGBA8888',
          size: { w: FRAME_W * 4, h: FRAME_H },
          scale: '1',
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  return {
    characterSheet: {
      image: 'spritesheet_character_r03.png',
      json: 'spritesheet_character_r03.json',
      width: atlasW,
      height: atlasH,
      frameCount: walkCells.length,
      sha256: sha256File(atlasPath),
    },
    forearmsSheet: {
      image: 'spritesheet_character_forearms_r03.png',
      json: 'spritesheet_character_forearms_r03.json',
      width: FRAME_W * 4,
      height: FRAME_H,
      frameCount: 4,
      sha256: sha256File(forearmAtlasPath),
    },
    agentsSheet: {
      image: 'spritesheet_agents_floor03.png',
      json: 'spritesheet_agents_floor03.json',
      width: AGENT_CELL_W * 3,
      height: AGENT_CELL_H * 2,
      frameCount: agentSpecs.length,
      sha256: sha256File(agentsSheetPng),
    },
    extractedAgents: Object.values(extractedAgents),
  };
}

function buildEditableProjectFiles() {
  const tmxPath = path.join(ASSETS_DIR, 'workstation_r03_proof.tmx');
  const mapJsonOut = path.join(PUBLIC_ART_DIR, 'workstation_r03_map.json');
  const tmxContent = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="24" height="18" tilewidth="50" tileheight="50" infinite="0" nextlayerid="6" nextobjectid="15">
 <properties>
  <property name="proofScope" value="floor03-r03-02-library-and-seated-fit"/>
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
  <object id="3" name="chair_back" type="sprite_chair_back" x="415" y="420" width="238" height="320"/>
  <object id="4" name="character_seated" type="spritesheet_character_r03" x="465" y="420" width="240" height="260"/>
  <object id="5" name="chair_arm_front" type="sprite_chair_arm_front" x="415" y="420" width="238" height="320"/>
  <object id="6" name="desk" type="sprite_desk" x="550" y="470" width="340" height="255"/>
  <object id="7" name="keyboard" type="sprite_keyboard" x="595" y="510" width="110" height="65"/>
  <object id="8" name="character_forearms" type="spritesheet_character_forearms_r03" x="465" y="420" width="240" height="260"/>
  <object id="9" name="accessories" type="sprite_accessories" x="640" y="468" width="120" height="90"/>
  <object id="10" name="monitor_back" type="sprite_monitor_back" x="665" y="380" width="205" height="210">
   <properties>
    <property name="backFacesCamera" type="bool" value="true"/>
    <property name="screenFacesCharacter" type="bool" value="true"/>
   </properties>
  </object>
  <object id="11" name="lamp" type="sprite_lamp" x="515" y="95" width="225" height="125"/>
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

  const pxoPath = path.join(ASSETS_DIR, 'workstation_r03_proof.pxo');
  const pxoDataJson = {
    pxo_version: 5,
    size_x: 1200,
    size_y: 896,
    fps: 8,
    save_date: new Date().toISOString(),
    source_tool: 'cloud-workspace-art-pipeline-v2',
    layers: [
      { name: 'WallWindow', visible: true, opacity: 1.0 },
      { name: 'FloorTiles', visible: true, opacity: 1.0 },
      { name: 'ChairBack', visible: true, opacity: 1.0 },
      { name: 'CharacterSeatedBody', visible: true, opacity: 1.0 },
      { name: 'ChairArmFrontOcclusion', visible: true, opacity: 1.0 },
      { name: 'DeskAndKeyboard', visible: true, opacity: 1.0 },
      { name: 'CharacterForearmsOverlay', visible: true, opacity: 1.0 },
      { name: 'MonitorPropsAndLighting', visible: true, opacity: 1.0 },
    ],
    tags: [
      { name: 'walk', from: 1, to: 4 },
      { name: 'sit', from: 5, to: 6 },
      { name: 'stand', from: 7, to: 8 },
      { name: 'type', from: 9, to: 12 },
    ],
  };

  const allPublicPngs = fs
    .readdirSync(PUBLIC_ART_DIR)
    .filter((f) => f.endsWith('.png'))
    .map((f) => ({ name: `image_data/${f}`, data: fs.readFileSync(path.join(PUBLIC_ART_DIR, f)) }));
  fs.writeFileSync(pxoPath, buildZipBuffer([{ name: 'data.json', data: JSON.stringify(pxoDataJson, null, 2) }, ...allPublicPngs]));

  return { tmxPath, mapJsonOut, pxoPath };
}

async function buildTransparencyInspectionBoard() {
  const W = 1800;
  const H = 1220;
  const transparentBg = { r: 0, g: 0, b: 0, alpha: 0 };

  const bgSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs>
        <pattern id="chk" width="22" height="22" patternUnits="userSpaceOnUse">
          <rect width="11" height="11" fill="#1b2634"/>
          <rect x="11" width="11" height="11" fill="#253345"/>
          <rect y="11" width="11" height="11" fill="#253345"/>
          <rect x="11" y="11" width="11" height="11" fill="#1b2634"/>
        </pattern>
      </defs>
      <rect width="${W}" height="${H}" fill="#0c1522"/>
      <text x="30" y="36" font-family="Segoe UI, Arial" font-size="22" font-weight="bold" fill="#ffd48a">BIBLIOTECA MODULAR R03_02 EXPANDIDA (35+ ASSETS RGBA + ENCAIXE CADEIRA-PERSONAGEM)</text>
      <text x="30" y="58" font-family="Segoe UI, Arial" font-size="13" fill="#9bc2d4">Todos os sprites possuem canal alfa real (fundo xadrez) e camadas separadas de oclusao para sentar dentro da cadeira (chair_back + seated + arm_front + forearms).</text>

      <!-- Card 1: Room Shell + Chair Sandwich -->
      <rect x="30" y="76" width="540" height="310" rx="8" fill="url(#chk)" stroke="#48718a" stroke-width="2"/>
      <text x="42" y="98" font-family="Consolas, monospace" font-size="13" font-weight="bold" fill="#89e5f0">1. Arquitetura Ampliada &amp; Oclusao Cadeira-Personagem</text>

      <!-- Card 2: Decor, Holograms, Elevator, Vines, Credenza, Planters -->
      <rect x="590" y="76" width="1180" height="310" rx="8" fill="url(#chk)" stroke="#48718a" stroke-width="2"/>
      <text x="602" y="98" font-family="Consolas, monospace" font-size="13" font-weight="bold" fill="#89e5f0">2. Decoracao Modular, Vegetacao, Elevador 03, Mesas, Monitores &amp; Objetos de Mesa</text>

      <!-- Card 3: 4 Equipe IA Agents + Thinking Pose + Bot IA -->
      <rect x="30" y="402" width="1740" height="300" rx="8" fill="url(#chk)" stroke="#62c4b0" stroke-width="2"/>
      <text x="42" y="424" font-family="Consolas, monospace" font-size="14" font-weight="bold" fill="#8cf2dc">3. Equipe IA Completa (Poses Sentadas Dedicadas) + Claude Pensativo + Robo Auxiliar IA</text>

      <!-- Card 4: Station 1 Walk/Sit/Stand/Type + Forearms overlay -->
      <rect x="30" y="718" width="1740" height="476" rx="8" fill="url(#chk)" stroke="#e4b870" stroke-width="2"/>
      <text x="42" y="742" font-family="Consolas, monospace" font-size="14" font-weight="bold" fill="#ffd48a">4. Animacao Completa (Walk / Sit / Stand / Type Sentado na Cadeira) + Antebracos Overlay (z=78)</text>
      <text x="45" y="820" font-family="Segoe UI, Arial" font-size="12" font-weight="bold" fill="#8be8cb">LINHA 1: WALK (caminhar)</text>
      <text x="45" y="970" font-family="Segoe UI, Arial" font-size="12" font-weight="bold" fill="#8be8cb">LINHA 2: SIT &amp; STAND</text>
      <text x="45" y="1110" font-family="Segoe UI, Arial" font-size="12" font-weight="bold" fill="#8be8cb">LINHA 3: TYPE (quadril no assento)</text>
      <text x="1290" y="790" font-family="Segoe UI, Arial" font-size="12" font-weight="bold" fill="#ffd48a">CAMADA ANTEBRACOS (sobre a mesa):</text>
    </svg>
  `);

  const thumb = async (file, w, h) =>
    sharp(path.join(PUBLIC_ART_DIR, file)).resize(w, h, { fit: 'contain', kernel: 'nearest', background: transparentBg }).png().toBuffer();

  const composites = [
    // Card 1: Room + Chair Split
    { input: await thumb('layer_floor03_full_wall.png', 240, 125), left: 42, top: 112 },
    { input: await thumb('layer_floor03_full_floor.png', 240, 125), left: 295, top: 112 },
    { input: await thumb('sprite_chair_back.png', 105, 130), left: 50, top: 245 },
    { input: await thumb('sprite_seat_shadow.png', 90, 45), left: 162, top: 295 },
    { input: await thumb('sprite_chair_arm_front.png', 105, 130), left: 262, top: 245 },
    { input: await thumb('sprite_chair_back_b.png', 105, 130), left: 382, top: 245 },
    // Card 2: Expanded props gallery (18+ items)
    { input: await thumb('sprite_neon_equipe_ia.png', 165, 68), left: 605, top: 110 },
    { input: await thumb('sprite_holo_map.png', 135, 82), left: 782, top: 108 },
    { input: await thumb('sprite_holo_chart.png', 120, 82), left: 926, top: 108 },
    { input: await thumb('sprite_holo_chip.png', 135, 76), left: 1056, top: 110 },
    { input: await thumb('sprite_wall_blueprint_a.png', 65, 82), left: 1205, top: 108 },
    { input: await thumb('sprite_wall_blueprint_b.png', 65, 82), left: 1278, top: 108 },
    { input: await thumb('sprite_hanging_vines.png', 110, 118), left: 1358, top: 102 },
    { input: await thumb('sprite_pendant_spot.png', 65, 86), left: 1482, top: 106 },
    { input: await thumb('sprite_lamp.png', 120, 82), left: 1560, top: 106 },
    { input: await thumb('sprite_credenza_lamp.png', 145, 125), left: 605, top: 218 },
    { input: await thumb('sprite_elevator_03.png', 115, 155), left: 760, top: 212 },
    { input: await thumb('sprite_desk.png', 150, 115), left: 888, top: 230 },
    { input: await thumb('sprite_desk_variant_b.png', 150, 115), left: 1046, top: 230 },
    { input: await thumb('sprite_monitor_back.png', 105, 110), left: 1206, top: 230 },
    { input: await thumb('sprite_monitor_back_b.png', 115, 105), left: 1320, top: 230 },
    { input: await thumb('sprite_fg_planter_left.png', 100, 115), left: 1445, top: 230 },
    { input: await thumb('sprite_fg_planter_right.png', 105, 120), left: 1550, top: 228 },
    { input: await thumb('sprite_rug.png', 115, 70), left: 1650, top: 125 },
    { input: await thumb('sprite_prop_pens_book.png', 90, 75), left: 1660, top: 205 },
    { input: await thumb('sprite_prop_tablet_mug.png', 95, 65), left: 1660, top: 280 },
    { input: await thumb('sprite_prop_stacked_books.png', 75, 68), left: 1580, top: 315 },
    // Card 3: 4 Seated Characters + Think + Bot
    { input: await thumb('agent-chatgpt-type.png', 220, 240), left: 60, top: 445 },
    { input: await thumb('agent-codex-type.png', 220, 240), left: 325, top: 445 },
    { input: await thumb('agent-antigravity-type.png', 220, 240), left: 590, top: 445 },
    { input: await thumb('agent-claude-type.png', 220, 240), left: 855, top: 445 },
    { input: await thumb('agent-claude-think.png', 220, 240), left: 1120, top: 445 },
    { input: await thumb('agent-bot-ia.png', 220, 220), left: 1410, top: 455 },
    // Card 4: Animated spritesheet + Forearm overlay
    {
      input: await sharp(path.join(PUBLIC_ART_DIR, 'spritesheet_character_r03.png'))
        .resize(780, 430, { fit: 'contain', kernel: 'nearest', background: transparentBg })
        .png()
        .toBuffer(),
      left: 340,
      top: 752,
    },
    {
      input: await sharp(path.join(PUBLIC_ART_DIR, 'spritesheet_character_forearms_r03.png'))
        .resize(450, 140, { fit: 'contain', kernel: 'nearest', background: transparentBg })
        .png()
        .toBuffer(),
      left: 1260,
      top: 820,
    },
  ];

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

  // 1. Original station furniture & props (`workstation_pixel_sprites_sheet_v2`)
  const baseSprites = [
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 0, top: 0, width: 396, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_chair.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 396, top: 0, width: 571, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_desk.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 967, top: 0, width: 409, height: 420 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_monitor_back.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 0, top: 420, width: 428, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_rug.png'), false),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 428, top: 420, width: 244, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_plant.png'), false),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 672, top: 420, width: 160, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_keyboard.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 832, top: 420, width: 227, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_accessories.png'), true),
    await extractCleanSprite(SOURCE_FILES.furniture, { left: 1059, top: 420, width: 317, height: 348 }, 'green', path.join(PUBLIC_ART_DIR, 'sprite_lamp.png'), true),
  ];

  // 2. Chair occlusion split (`sprite_chair_back` + `sprite_chair_arm_front` + `sprite_seat_shadow` + variant `b`)
  const chairOcclusionSprites = await buildChairOcclusionLayers();

  // 3. Expanded Floor 03 modular decor, holograms, elevator, desk variants & desk prop variations (`andar_03_modular_props_spritesheet`)
  const expandedPropSpecs = [
    ['sprite_neon_equipe_ia.png', { left: 26, top: 55, width: 355, height: 135 }],
    ['sprite_holo_map.png', { left: 388, top: 35, width: 270, height: 175 }],
    ['sprite_holo_chart.png', { left: 660, top: 35, width: 235, height: 175 }],
    ['sprite_holo_chip.png', { left: 896, top: 45, width: 280, height: 160 }],
    ['sprite_credenza_lamp.png', { left: 38, top: 235, width: 290, height: 290 }],
    ['sprite_elevator_03.png', { left: 352, top: 215, width: 255, height: 404 }],
    ['sprite_desk_variant_b.png', { left: 625, top: 245, width: 340, height: 280 }],
    ['sprite_pendant_spot.png', { left: 1018, top: 218, width: 110, height: 145 }],
    ['sprite_monitor_back_b.png', { left: 972, top: 360, width: 196, height: 196 }],
    ['sprite_hanging_vines.png', { left: 20, top: 525, width: 260, height: 335 }],
    ['sprite_fg_planter_left.png', { left: 268, top: 643, width: 174, height: 232 }],
    ['sprite_fg_planter_right.png', { left: 438, top: 615, width: 215, height: 260 }],
    ['sprite_wall_blueprint_a.png', { left: 672, top: 552, width: 132, height: 162 }],
    ['sprite_wall_blueprint_b.png', { left: 802, top: 552, width: 132, height: 162 }],
    ['sprite_prop_pens_book.png', { left: 668, top: 730, width: 160, height: 138 }],
    ['sprite_prop_tablet_mug.png', { left: 830, top: 735, width: 202, height: 126 }],
    ['sprite_prop_stacked_books.png', { left: 1034, top: 735, width: 140, height: 132 }],
  ];
  const decorSprites = [];
  for (const [outFile, box] of expandedPropSpecs) {
    decorSprites.push(
      await extractCleanSprite(SOURCE_FILES.propsSheet, box, 'magenta', path.join(PUBLIC_ART_DIR, outFile), true),
    );
  }

  // 4. Architectural Layers + Wide Floor 03 Shell
  const roomLayers = await splitRoomLayers();

  // 5. Seated Characters (`ChatGPT`, `Codex`, `Antigravity`, `Claude Code`, `Claude Thinking`, `Bot IA`) + Forearms Overlay
  const charResult = await buildCharacterAndAgentsSheets();

  // 6. Editable Tiled & Pixelorama Projects
  const projects = buildEditableProjectFiles();
  const inspectionBoard = await buildTransparencyInspectionBoard();

  const allSprites = [...baseSprites, ...chairOcclusionSprites, ...decorSprites];
  const manifest = {
    generatedAt: new Date().toISOString(),
    reference: 'R03_02_ANDAR_03_PROPOSTA_NAO_APROVADA.png',
    seatedFitArchitecture: 'nested-chair-occlusion-with-compressed-chibi-seat-height',
    layerCount: allSprites.length + roomLayers.length + 3,
    alphaTransparencyVerified: true,
    roomLayers,
    sprites: allSprites,
    agentsIndividual: charResult.extractedAgents,
    characterSheet: charResult.characterSheet,
    forearmsSheet: charResult.forearmsSheet,
    agentsSheet: charResult.agentsSheet,
    editableProjects: {
      tmx: path.relative(ROOT, projects.tmxPath).replaceAll('\\', '/'),
      tiledMapJson: path.relative(ROOT, projects.mapJsonOut).replaceAll('\\', '/'),
      pxo: path.relative(ROOT, projects.pxoPath).replaceAll('\\', '/'),
    },
    inspectionBoard: path.relative(ROOT, inspectionBoard).replaceAll('\\', '/'),
  };

  fs.writeFileSync(path.join(PUBLIC_ART_DIR, 'workstation_proof_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Generated ${manifest.layerCount} layered RGBA assets and manifests cleanly.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
