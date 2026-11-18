import {Container,Graphics,Sprite,Text,type Spritesheet} from 'pixi.js';

/** Static material and lighting layers. Caching these never flattens actors/equipment. */
export function enrichInterior(parent:Container,index:number,sheet:Spritesheet){
 const poly=(v:number[],c:number,a=1)=>parent.addChild(new Graphics().poly(v).fill({color:c,alpha:a}));
 const rect=(x:number,y:number,w:number,h:number,c:number,a=1)=>parent.addChild(new Graphics().rect(x,y,w,h).fill({color:c,alpha:a}));
 const light=(name:string,x:number,y:number,scale:number,alpha:number)=>{
  const s=new Sprite(sheet.textures[name]);s.anchor.set(.5);s.position.set(x,y);s.scale.set(scale);s.alpha=alpha;s.blendMode='add';parent.addChild(s);return s;
 };
 // Inset acoustic / walnut wall panels with bevels and brass seams.
 for(let n=0;n<14;n++){
  const x=108+n*35,y=-99-n*2.4;
  const warm=index===0||index===1||index===2;
  const walnut=index===2;
  poly([x,y,x+31,y-2.1,x+31,y+65,x,y+67.1],walnut?0x4b3428:warm?0x5e5148:0x314457);
  poly([x+2,y+2,x+28,y+.2,x+28,y+64,x+2,y+66],walnut?0x684836:warm?0x77604c:0x3d5263);
  if(walnut){
   for(let s=4;s<28;s+=5)poly([x+s,y+3-s*.06,x+s+2,y+3-(s+2)*.06,x+s+2,y+62-(s+2)*.06,x+s,y+62-s*.06],0x54392b,.7);
  }
  poly([x+4,y+5,x+5,y+5,x+5,y+60,x+4,y+60],warm?0xc29a61:0x6c8390,.3);
  poly([x,y+65,x+31,y+63,x+31,y+67,x,y+69],0x1c3043);
 }
 // Warm ceiling pools and low-radiance reflected light on the floor.
 for(let n=0;n<5;n++){
  const x=125+n*104,y=-81-n*7;
  light('warm-glow',x+19,y+19,.95,.8);
  light('floor-glow',x+12,-13-n*7,1.1,.65);
  poly([x-2,y-3,x+41,y-6,x+46,y-3,x+3,y],0x132d43);
  poly([x+2,y-2,x+39,y-4.5,x+39,y-1,x+2,y+1.5],0xffdf9d);
  poly([x+5,y-2,x+36,y-4,x+36,y-3,x+5,y-1],0xfff2ce);
 }
 // Copper skirting, near-floor conduits and small wall sockets.
 poly([95,-37,615,-72,615,-69,95,-34],0x8c8268,.55);
 for(let n=0;n<8;n++){
  const x=122+n*60,y=-38-n*4;rect(x,y,5,6,0x80918f);rect(x+1,y+2,1,2,0x233b4b);rect(x+3,y+2,1,2,0x233b4b);
 }
 // Calm floor grain, subtly worn brass/stone inlays and desk contact shadows.
 for(let n=0;n<95;n++){
  const x=25+(n*73)%580,y=-2-x*.068-((n*17)%30);
  rect(x,y,2+(n%6),1,n%3?0xc1ba9b:0x344c5d,.12);
 }
 poly([12,-1,613,-41,613,-39,12,1],0xb4aca0,.45);
 // Reflections and corner edging on the west glass wall, consistent with its depth vector.
 for(let n=0;n<4;n++){
  const x=n*23,y=-n*13.5;
  poly([x+4,y-42,x+20,y-52,x+20,y-48,x+4,y-38],0xf0c27c,.3);
  poly([x+4,y-68,x+19,y-77,x+19,y-63,x+4,y-54],0x94cee0,.15);
  poly([x,y-77,x+3,y-79,x+3,y,x,y+2],0x91acb6,.7);
 }
 // Distinct wall signage reads as room identity, never as real telemetry.
 if(index!==2){
  const labels=['PROJETOS / RECEPÇÃO','CLOUD CONTROL','EQUIPE IA','INFRAESTRUTURA / MCP / TESTES','SERVIÇOS / DEMO'];
  const sign=new Text({text:labels[index],style:{fontFamily:'monospace',fontSize:8,fontWeight:'bold',fill:0xb1e6ea}});
  sign.position.set(218,-82);sign.rotation=-.068;parent.addChild(sign);
  poly([210,-85,368,-95,368,-79,210,-69],0x102c40);
  // Place sign above its independent frame.
  parent.addChild(sign);
 }
 light('cyan-glow',280,-84,.72,.35);
}
