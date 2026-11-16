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
