/** Original Cloud Workspace pixel artwork. Sources are editable SVG; raster atlas is reproducible. */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/art',{recursive:true});
await mkdir('assets/source',{recursive:true});
const art={};
const r=(x,y,w,h,c)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const p=(points,c)=>`<polygon points="${points}" fill="${c}"/>`;
const line=(x,y,w,c)=>r(x,y,w,1,c);
const svg=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges">${body}</svg>`;
const shadow=p('12,112 88,106 113,116 36,123','#071322');
art.desk=shadow+p('28,86 105,81 120,94 43,100','#382c30')+r(42,99,5,19,'#83624b')+r(108,94,5,18,'#5a453d')+p('26,83 104,77 122,90 43,97','#e4b46e')+p('43,97 122,90 122,95 43,102','#966b48')+line(45,97,25,'#f5cf8c')+
  p('57,79 79,77 90,83 68,86','#9aa9b3')+p('60,80 78,79 85,82 68,84','#3c596c')+r(98,75,5,7,'#e3d4bb')+r(100,73,6,2,'#fff0c9')+
  /* Monitor: left face looks toward seated user at x=28; right face is the rear panel. */
  p('80,53 101,51 101,77 80,79','#101c2b')+p('80,53 85,55 85,79 80,79','#62acc0')+p('85,55 101,51 103,53 103,77 85,80','#243849')+r(95,57,2,14,'#3e5362')+r(90,60,2,10,'#182937')+r(92,79,3,6,'#718290')+p('87,85 103,83 109,85 94,88','#253c4d');
art.chair=shadow+r(28,99,4,16,'#627382')+p('17,115 40,112 49,116 24,120','#182735')+p('14,85 39,82 51,90 26,95','#4c6478')+r(11,64,7,28,'#172c40')+p('11,64 32,62 38,68 17,70','#607a91')+p('17,70 38,68 39,86 18,90','#294357')+r(13,72,3,14,'#405e75');
art.rack=shadow+p('32,24 77,20 95,29 49,34','#597182')+p('77,20 95,29 95,111 77,104','#192c3d')+p('32,24 77,20 77,104 32,110','#122536')+r(35,29,3,76,'#567082');
for(let n=0;n<8;n++) art.rack+=p(`40,${33+n*9} 73,${30+n*9} 73,${36+n*9} 40,${39+n*9}`,'#294254')+r(43,34+n*9,15,1,'#6a8491')+r(65,32+n*9,3,2,'#536779');
art.plant=shadow+p('46,98 69,96 65,118 50,120','#b6b7ac')+p('46,98 55,100 56,119 50,120','#ded8c2')+p('46,98 62,93 70,96 55,101','#6c7067')+r(58,52,3,45,'#7f9a4c');
for(let i=0;i<10;i++) {const y=55+i*4;const side=i%2?1:-1;const x=60+side*(12+i%3*3);art.plant+=p(`59,${y+8} ${x},${y-10} ${x+side*8},${y-9} ${x+side*10},${y-2} ${x},${y-4} 61,${y+12}`,i%3?'#72a947':'#bdc665');}
art.books=shadow+p('22,38 83,33 95,40 34,46','#bb9564')+p('22,38 83,33 83,112 22,118','#755a43')+p('83,33 95,40 95,117 83,112','#382f2d');
for(let row=0;row<3;row++) {art.books+=p(`27,${43+row*24} 79,${39+row*24} 79,${60+row*24} 27,${64+row*24}`,'#243340');for(let n=0;n<9;n++)art.books+=r(29+n*5,45+row*24-n*.35,3,15+(n%3)*2,['#c39b58','#5592a0','#9182a5','#d6c7a3'][n%4]);}
art.sofa=shadow+p('26,84 84,80 106,91 47,98','#edbd68')+p('47,98 106,91 106,108 47,115','#bb7a43')+p('22,62 79,58 85,81 27,87','#d99c51')+p('22,62 28,66 33,89 27,89','#f4cd84')+p('26,88 40,92 40,113 26,106','#dda45b')+p('89,80 105,85 105,109 90,104','#f1bf6a')+r(34,110,4,8,'#2e3540')+r(96,108,4,7,'#2e3540');
art.board=r(16,28,96,66,'#071a2a')+r(18,30,92,62,'#416276')+r(20,32,88,58,'#14374b')+r(25,37,45,3,'#84cdd6')+r(25,44,64,1,'#47728b');
for(let i=0;i<5;i++)art.board+=r(26,52+i*6,4,3,'#73b7b7')+r(35,52+i*6,30+i%3*10,2,'#4f849c');
art.lamp=r(57,72,3,40,'#b88745')+p('42,113 65,110 76,115 53,119','#d8b56d')+p('45,55 67,53 77,73 36,77','#e9c982')+p('36,77 77,73 77,77 36,81','#fff0b2');
art.door=p('33,30 87,26 87,114 33,118','#5e7b90')+p('37,34 83,30 83,112 37,115','#153348')+r(58,34,2,79,'#68899b')+r(53,76,2,9,'#d9c187')+r(65,75,2,9,'#d9c187');
art.bot=shadow+r(46,80,24,25,'#9dced4')+r(43,59,30,26,'#d9e5db')+r(47,64,23,14,'#102d42')+r(51,69,4,4,'#79e8ed')+r(63,69,4,4,'#79e8ed')+r(42,88,4,13,'#557e92')+r(72,87,4,14,'#557e92')+r(48,107,7,9,'#779da9')+r(63,107,7,9,'#779da9');
for(const [pose,count] of [['walk',4],['type',4],['idle',2],['wait',2],['error',2],['unknown',2]])for(let f=0;f<count;f++) {
 const walk=pose==='walk';const sitting=pose==='type';const dy=walk?f%2:(pose==='idle'||pose==='wait')?f:0;
 let b=p('9,117 45,114 57,119 20,123','#081a27');
 b+=sitting ? r(24,99,21,7,'#2d455c')+r(39,104,7,10,'#20334b')+r(39,113,13,5,'#111f30') : r(22,100+dy,7,16-(walk&&f%2?5:0),'#20334b')+r(35,100+dy,7,16-(walk&&!(f%2)?5:0),'#2d455c')+r(21,115-(walk&&f%2?5:0),12,4,'#111f30')+r(35,115-(walk&&!(f%2)?5:0),12,4,'#111f30');
 b+=r(19,77+dy,26,28,'#142b40')+r(22,77+dy,20,26,'#7389a9')+r(23,79+dy,4,20,'#a9b9c9')+r(37,81+dy,6,18,'#3c5678');
 b+=r(23,69+dy,16,10,'#d3a16f')+r(17,47+dy,26,25,'#3d2f37')+r(21,51+dy,26,22,'#e8b785')+r(18,47+dy,24,7,'#5b3a37')+r(18,53+dy,7,11,'#48313a')+r(39,57+dy,3,3,'#192f40')+r(42,64+dy,8,5,'#e1a477')+r(25,58+dy,5,8,'#cf966a')+r(26,58+dy,3,5,'#f3c79c');
 b+=r(17,53+dy,3,16,'#7599af')+r(17,63+dy,6,8,'#172f45');
 if(walk)b+=r(14+f*2,84,5,12+f,'#d49c70');
 if(sitting)b+=r(39,86+(f%2)*2,43,6,'#e6b484')+r(76,84+(f%3),11,4,'#f3c79c');
 else b+=r(15+(walk?f%2*3:0),82+dy,6,17,'#c7936b')+r(43,81+dy,6,pose==='wait'?9:18,'#e9b584');
 if(pose==='wait')b+=r(43,75,10,5,'#eac786')+r(51,63,2,8,'#f5cd75');
 if(pose==='error')b+=r(50+f*2,39-f*2,9,16,'#fa8f7e')+r(53,42,3,7,'#492d39')+r(53,51,3,2,'#492d39');
 if(pose==='unknown')b+=r(50,40,12,14,'#526c80')+r(54,43,5,2,'#d0dce4')+r(57,45,2,3,'#d0dce4')+r(54,50,2,2,'#d0dce4');
 art[`${pose}-${f}`]=b;
}
for(const name of Object.keys(art).filter(n=>/^(walk|type|idle|wait|error|unknown)-/.test(n))) {
  const palettes=[['#7389a9','#a9b9c9','#3c5678'],['#a889c3','#d1b9db','#66517f'],['#58a598','#9bd0ba','#356d72'],['#c69b70','#e6c490','#8a654b'],['#6f9cbd','#b2d2dc','#456882']];
  palettes.forEach((colors,i)=>art[`${name}-c${i}`]=art[name].replaceAll('#7389a9',colors[0]).replaceAll('#a9b9c9',colors[1]).replaceAll('#3c5678',colors[2]));
}
const names=Object.keys(art),columns=8,cell=128,rows=Math.ceil(names.length/columns);
const frames={},composite=[];
for(let i=0;i<names.length;i++) {const name=names[i];const source=svg(art[name]);await writeFile(`assets/source/${name}.svg`,source);const png=await sharp(Buffer.from(source)).png().toBuffer();const x=i%columns*cell,y=Math.floor(i/columns)*cell;composite.push({input:png,left:x,top:y});frames[name]={frame:{x,y,w:cell,h:cell},sourceSize:{w:cell,h:cell},spriteSourceSize:{x:0,y:0,w:cell,h:cell},trimmed:false,rotated:false};}
await sharp({create:{width:columns*cell,height:rows*cell,channels:4,background:'#00000000'}}).composite(composite).png().toFile('public/art/office.png');
await writeFile('public/art/office.json',JSON.stringify({frames,meta:{image:'office.png',scale:'1',size:{w:columns*cell,h:rows*cell}},animations:{walk:['walk-0','walk-1','walk-2','walk-3'],type:['type-0','type-1','type-2','type-3'],idle:['idle-0','idle-1'],wait:['wait-0','wait-1'],error:['error-0','error-1'],unknown:['unknown-0','unknown-1']}},null,2));
console.log(`${names.length} original sprites → public/art/office.{png,json}`);
