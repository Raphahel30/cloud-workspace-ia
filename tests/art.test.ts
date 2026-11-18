import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
it('ships genuinely distinct raster frames for the required actions',async()=>{
 const atlas=JSON.parse(await readFile('public/art/office.json','utf8'));
 for(const [pose,count] of [['walk',4],['type',4],['idle',2],['wait',2],['error',2]] as const) {
   const pixels=await Promise.all(Array.from({length:count},async(_,i)=>{
     const frame=atlas.frames[`${pose}-${i}`].frame;
     return (await sharp('public/art/office.png').extract({left:frame.x,top:frame.y,width:frame.w,height:frame.h}).raw().toBuffer()).toString('base64');
   }));
   expect(new Set(pixels).size,pose).toBe(count);
 }
});

it('packs extra poses into one small atlas without losing the original foot origin',async()=>{
 const atlas=JSON.parse(await readFile('public/art/office.json','utf8'));
 const meta=await sharp('public/art/office.png').metadata();
 expect(meta.width).toBe(atlas.meta.size.w);expect(meta.height).toBe(atlas.meta.size.h);
 expect(meta.width!*meta.height!*4).toBeLessThan(5*1024*1024);
 for(const name of ['sit-0','sit-1','stand-0','stand-1','walk-back-0','seated-wait-0']){
  const f=atlas.frames[name];expect(f.sourceSize).toEqual({w:128,h:128});
  expect(f.spriteSourceSize.y+f.spriteSourceSize.h).toBeLessThanOrEqual(121);
  expect(f.frame.x+f.frame.w).toBeLessThanOrEqual(meta.width!);
  expect(f.frame.y+f.frame.h).toBeLessThanOrEqual(meta.height!);
 }
 const entries=Object.values(atlas.frames) as Array<{frame:{x:number;y:number;w:number;h:number}}>;
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i].frame,b=entries[j].frame;
  expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);
 }
});

it('includes modular Floor 03 pilot sprites and valid isometric Tiled layout',async()=>{
 const atlas=JSON.parse(await readFile('public/art/office.json','utf8'));
 for(const key of [
   'f3-bookshelf','f3-neon-sign','f3-holo-map','f3-holo-chart','f3-holo-chip',
   'f3-rug','f3-chair','f3-desk','f3-monitor-back','f3-bot-ia',
   'f3-badge-chatgpt','f3-badge-codex','f3-badge-antigravity','f3-badge-claude',
 ]){
   expect(atlas.frames[key],key).toBeDefined();
 }
 const tiled=JSON.parse(await readFile('public/art/floor03_layout.json','utf8'));
 expect(tiled.orientation).toBe('isometric');
 expect(tiled.layers.map((l:{name:string})=>l.name)).toContain('Workstations');
 expect(tiled.layers.map((l:{name:string})=>l.name)).toContain('OcclusionMonitors');
});

it('ships R03_02 single-workstation layered RGBA assets and 12 distinct animation frames',async()=>{
 const sheet=JSON.parse(await readFile('public/art/workstation-proof/spritesheet_character_r03.json','utf8'));
 const manifest=JSON.parse(await readFile('public/art/workstation-proof/workstation_proof_manifest.json','utf8'));
 expect(manifest.layerCount).toBe(12);
 expect(manifest.alphaTransparencyVerified).toBe(true);
 for(const [pose,count] of [['walk',4],['sit',2],['stand',2],['type',4]] as const){
   const hashes=await Promise.all(Array.from({length:count},async(_,i)=>{
     const f=sheet.frames[`${pose}-${i}`].frame;
     return (await sharp('public/art/workstation-proof/spritesheet_character_r03.png').extract({left:f.x,top:f.y,width:f.w,height:f.h}).raw().toBuffer()).toString('base64');
   }));
   expect(new Set(hashes).size,pose).toBe(count);
 }
 for(const s of manifest.sprites as Array<{transparentPixels:number;opaquePixels:number}>){
   expect(s.transparentPixels).toBeGreaterThan(0);
   expect(s.opaquePixels).toBeGreaterThan(0);
 }
 const tiledProof=JSON.parse(await readFile('public/art/workstation-proof/workstation_r03_map.json','utf8'));
 expect(tiledProof.layers.map((l:{name:string})=>l.name)).toEqual(['WallAndWindow','FloorTiles','WorkstationLayers','LightingGlow']);
});
