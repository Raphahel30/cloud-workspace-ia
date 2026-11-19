/** Original pixel artwork, revision 2. All lighting is rasterized into the shared atlas. */
export function premiumArt(art,r,p){
 const ellipse=(x,y,rx,ry,color,opacity=1)=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${color}" opacity="${opacity}"/>`;
 const shadow=ellipse(63,117,48,6,'#071726',.6);
 const stroke=(x,y,w,color)=>r(x,y,w,1,color);
 art.desk=shadow+
  p('29,90 104,84 119,94 44,101','#292a32')+
  p('37,96 53,95 53,117 37,119','#493e3d')+p('39,97 52,96 52,116 39,117','#9d7756')+
  r(42,101,8,1,'#c49b6b')+r(45,103,3,1,'#3b4144')+r(42,108,8,1,'#785a48')+r(45,110,3,1,'#3b4144')+
  p('107,92 113,91 113,113 107,115','#23394a')+r(108,96,2,14,'#75838b')+
  p('24,82 103,76 122,88 43,95','#d4a46d')+p('26,82 103,77 117,87 43,93','#edc68a')+
  p('43,95 122,88 122,93 43,100','#a7754d')+p('25,83 43,95 43,100 25,88','#78563f')+
  p('29,84 101,79 104,81 32,86','#f8d79c')+p('49,88 98,85 106,87 56,91','#d9ab72')+
  p('50,90 84,87 87,88 53,91','#bb8e60')+p('89,80 100,79 106,82 95,83','#e5ba80')+
  r(105,78,6,7,'#a0bcc0')+r(106,77,5,2,'#eef3dd')+r(111,80,2,3,'#7b9097')+
  p('46,81 58,80 63,83 51,84','#eee5c7')+stroke(50,82,7,'#b7b2a6');
 art.keyboard=p('54,78 78,76 88,82 63,85','#132c3c')+p('55,77 78,75 88,81 63,84','#b0b9b1');
 for(let row=0;row<3;row++)for(let col=0;col<7;col++)art.keyboard+=r(57+col*3+row*2,78+row,2,1,'#4e6972');
 art.keyboard+=p('89,81 93,80 97,83 92,84','#e5d9bd');
 art.keyboard=`<g transform="translate(0 6)">${art.keyboard}</g>`;
 art.monitor=p('80,45 107,43 109,46 109,75 81,78','#081a28')+
  p('80,46 85,48 85,76 80,76','#38788c')+p('81,48 83,49 83,73 81,74','#9bdae0')+
  p('85,48 107,44 107,73 85,77','#2b4152')+p('87,49 105,46 105,70 87,74','#1c3142')+
  p('88,50 104,47 104,49 88,52','#587080')+r(98,54,4,11,'#132736')+r(99,55,1,9,'#405665')+
  p('87,67 94,66 94,68 87,69','#506473')+r(95,76,3,7,'#8c9a9c')+
  p('89,84 103,82 111,85 97,87','#203c4e')+p('90,83 103,81 109,83 96,85','#75868e');
 art.chair=shadow+r(29,98,3,16,'#85929a')+p('16,116 31,112 46,117 44,120 30,116 19,120','#172b3c')+
  r(16,118,5,3,'#0d1d2c')+r(41,118,5,3,'#0d1d2c')+
  p('11,83 35,80 50,89 25,94','#425d72')+p('13,84 34,82 46,89 25,92','#607e8c')+
  p('8,60 30,58 37,65 14,69','#172b40')+p('14,69 37,65 39,86 16,91','#223f57')+
  p('16,69 33,66 34,85 18,88','#3b5970')+r(18,71,2,12,'#627b8b')+
  p('10,83 17,83 17,87 10,87','#98a5a5')+p('37,82 45,81 45,85 37,86','#98a5a5');
 art.rack=shadow+p('29,20 78,17 98,27 48,32','#6f8490')+p('78,17 98,27 98,113 78,106','#182c41')+
  p('29,20 78,17 78,106 29,113','#0b1d2e')+p('30,22 34,22 34,109 30,109','#65818e')+
  p('35,25 75,22 75,104 35,109','#1d3549')+p('81,29 94,35 94,106 81,101','#253f50');
 for(let n=0;n<8;n++){
  const y=29+n*9;
  art.rack+=p(`38,${y} 72,${y-2} 72,${y+4} 38,${y+6}`,'#385165')+
   r(40,y+1,16,1,'#8e9b9c')+r(40,y+3,12,1,'#132d40')+r(59,y,3,3,'#203144')+
   r(66,y,3,2,'#6f8085');
  for(let j=0;j<3;j++)art.rack+=r(84+j*3,38+n*8,1,3,'#122b3e');
 }
 art.rack+=p('36,104 74,101 74,104 36,108','#607681');
 const pot=p('45,97 65,95 73,100 52,103','#d2cbb3')+p('45,97 52,103 54,120 47,116','#f0dec0')+
  p('52,103 73,100 70,117 54,120','#929e94')+p('48,98 64,97 70,100 53,101','#4a5247')+r(58,57,3,43,'#799049');
 art.plant=shadow+pot;
 for(let n=0;n<13;n++){
  const side=n%2?1:-1,y=41+n*3,x=60+side*(15+n%3*4);
  art.plant+=p(`60,${y+15} ${x},${y} ${x+side*11},${y+1} ${x+side*17},${y+11} ${x+side*7},${y+6} ${x},${y+5} 60,${y+19}`,'#315c3f')+
   p(`60,${y+15} ${x},${y} ${x+side*10},${y+1} ${x+side*12},${y+5} ${x},${y+3}`,'#7da34b')+
   p(`${x},${y} ${x+side*8},${y+1} ${x+side*10},${y+3} ${x+side*3},${y+2}`,'#c1c969');
 }
 art.fern=shadow+pot;
 for(let n=0;n<15;n++){
  const a=n*2.4,side=n%2?-1:1,x=61+side*(8+n%5*4),y=56+n*2;
  art.fern+=p(`60,99 ${x},${y} ${x+side*9},${y-5} ${x+side*12},${y+1} ${x+side*4},${y+2} 61,98`,n%3===0?'#bdc775':n%3===1?'#578a4b':'#8ca94f');
 }
 art.tree=shadow+p('56,76 64,75 66,120 56,121','#654e3b')+r(58,78,3,42,'#a8804e')+
  p('60,95 39,67 42,64 62,86 84,57 88,60 64,98','#7f6442');
 let seed=1907;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 for(let layer=0;layer<3;layer++)for(let n=0;n<110;n++){
  const x=Math.floor(15+random()*95),y=Math.floor(14+random()*65);
  const dx=(x-63)/48,dy=(y-48)/35;if(dx*dx+dy*dy>1)continue;
  const c=['#244e43','#376846','#5e8a48','#9cad54','#c3c66a'][Math.floor(random()*4)+(layer===2?1:0)];
  art.tree+=r(x,y,4+Math.floor(random()*9),3+Math.floor(random()*6),c);
 }
 art.hedge=shadow+p('12,104 98,98 116,108 27,116','#48584f')+p('27,116 116,108 116,117 27,125','#8a8e7b');
 for(let n=0;n<100;n++){const x=14+Math.floor(random()*91),y=86+Math.floor(random()*24);art.hedge+=r(x,y,4+Math.floor(random()*7),3+Math.floor(random()*5),['#315944','#5d8545','#93a34a','#bbbe66'][Math.floor(random()*4)]);}
 art.board=r(12,22,106,77,'#081a28')+r(14,24,102,73,'#668694')+r(16,26,98,69,'#102d43')+
  r(19,29,92,2,'#326278')+r(21,34,39,4,'#83ced7')+r(21,42,44,1,'#437d90')+
  r(21,49,4,4,'#a6c69c')+r(29,49,28,2,'#6ca3ac')+r(21,58,4,4,'#d3bc7c')+r(29,58,22,2,'#6ca3ac')+
  r(21,67,4,4,'#7ebaca')+r(29,67,31,2,'#6ca3ac')+r(21,76,4,4,'#7ebaca')+r(29,76,24,2,'#6ca3ac');
 for(let n=0;n<7;n++)art.board+=r(70+n*5,82-(n%3*7+n*2),3,7+n%3*7+n*2,'#4c9eaf');
 art.board+=r(68,85,39,1,'#386e87')+r(67,45,1,41,'#386e87')+r(72,41,31,1,'#73b4c2')+r(72,36,19,2,'#aec8bd');
 art.notice=r(13,25,103,70,'#33495b')+r(16,28,97,64,'#d9d9bf')+r(20,32,89,3,'#7d9b9e');
 for(let n=0;n<3;n++)for(let j=0;j<3;j++)art.notice+=r(23+n*29,42+j*15,22,11,['#b2c8b7','#d7bd7d','#9dbecc'][(n+j)%3])+r(26+n*29,45+j*15,14,1,'#758d8d')+r(26+n*29,48+j*15,10,1,'#758d8d');
 art.cabinet=shadow+p('20,44 80,39 98,49 37,55','#99acaa')+p('20,44 80,39 80,111 20,117','#516e7b')+
  p('80,39 98,49 98,118 80,111','#263f50')+p('25,50 75,46 75,107 25,111','#294b5f');
 for(let row=0;row<3;row++){const y=52+row*19;art.cabinet+=p(`28,${y} 73,${y-3} 73,${y+14} 28,${y+17}`,'#20394c');for(let j=0;j<5;j++)art.cabinet+=r(32+j*8,y-1-j*.3,6,14,['#ac8c61','#829e9e','#9eb4bd','#b7ac87'][j%4])+r(33+j*8,y+2-j*.3,3,1,'#e2d9b9');}
 art.coffee=shadow+p('25,86 91,81 110,92 43,98','#c9ad80')+p('43,98 110,92 110,119 43,124','#4c6268')+
  p('25,86 43,98 43,124 25,112','#273f51')+r(50,101,24,1,'#7e9696')+r(59,103,8,2,'#b0bcb0')+
  r(53,57,30,29,'#263a49')+r(56,59,25,3,'#79949d')+r(57,65,18,12,'#162b3c')+r(61,72,8,7,'#a9c8c2')+
  r(59,80,18,2,'#c5c9ae')+r(89,73,7,12,'#e0e1c9')+r(91,72,5,2,'#86afb6');
 art.reception=shadow+p('17,81 99,75 118,88 35,95','#f4cf91')+p('17,83 35,95 35,120 17,109','#465c6b')+
  p('35,95 118,88 118,112 35,121','#354c61')+p('39,98 113,92 113,109 39,116','#70818a')+
  p('37,118 117,110 117,113 37,122','#ffcd79')+p('18,82 35,94 35,97 18,85','#a58b67')+
  r(70,60,23,20,'#162d3f')+r(72,62,19,16,'#294c63')+r(86,65,2,10,'#607b8c')+r(80,80,3,4,'#a2b3b5');
 art.sofa=shadow+p('20,66 79,61 94,71 33,78','#f2c477')+p('20,66 33,78 35,97 23,88','#b97c48')+
  p('33,78 94,71 94,91 35,98','#dca454')+p('32,91 87,87 108,97 53,104','#f1c976')+
  p('53,104 108,97 108,115 53,121','#ac7444')+p('25,89 40,94 40,116 25,108','#e1a359')+
  p('91,84 108,90 108,114 93,108','#e9b86a')+r(32,112,4,8,'#26384a')+r(100,113,4,6,'#26384a');
 for(let n=0;n<3;n++)art.sofa+=p(`${38+n*17},${80-n} ${51+n*17},${79-n} ${51+n*17},${93-n} ${38+n*17},${94-n}`,'#e7b963');
 // Alpha rings are baked once; shared light textures need no runtime filters.
 for(const [name,color] of [['warm-glow','#ffc777'],['cyan-glow','#72dce9']]){
  art[name]='';for(let n=12;n>=1;n--)art[name]+=ellipse(64,65,n*5,n*4,color,.013+(12-n)*.002);
 }
 art['floor-glow']='';for(let n=10;n>=1;n--)art['floor-glow']+=ellipse(64,110,n*6,n*1.3,'#f4c582',.016);
 art['foot-shadow']=ellipse(32,119,18,4,'#071524',.45)+ellipse(32,119,11,2,'#071524',.4);
 // Deliberately shaped faces and jackets with dedicated seated geometry aligned to chair cushion (y~86..91).
 for(const [pose,count] of [['walk',4],['walk-back',4],['type',4],['idle',2],['wait',2],['error',2],['unknown',2],['sit',2],['stand',2],['seated-idle',2],['seated-wait',2],['seated-error',2],['seated-unknown',2]])for(let f=0;f<count;f++){
  const mood=pose.replace('seated-','');
  const walking=pose.startsWith('walk'),back=pose==='walk-back',sitting=pose.startsWith('seated-')||pose==='type'||pose==='sit'&&f===1||pose==='stand'&&f===1;
  const bob=walking?(f%2):0;
  const torsoShiftX=sitting?-3:0;
  const crouch=pose==='sit'&&f===0?2:pose==='stand'&&f===1?-2:0;
  const headY=(sitting?39:45)+bob+crouch;
  let b='';
  if(sitting){
   // Dedicated seated hips/thighs resting flat on chair cushion (y=86..92), knees tucking toward desk, shoes flat on rug
   b+=p('18,86 44,85 52,90 48,96 22,95','#22374b')+
     p('20,87 43,86 49,90 24,91','#334e68')+
     p('42,89 51,91 50,113 42,113','#24364a')+
     p('36,92 43,92 43,111 36,111','#1b2b3c')+
     r(41,113,14,4,'#0d1e2e')+r(42,113,10,1,'#718490')+
     r(35,111,11,3,'#0c1a28');
  }else{
   const stride=walking?[-5,0,5,0][f]:0;
   b+=p(`23,99 31,99 ${30+stride},116 ${23+stride},116`,'#293c50')+p(`34,99 42,99 ${41-stride},117 ${34-stride},117`,'#3c5163')+
    r(21+stride,116,12,4,'#102334')+r(33-stride,117,13,3,'#102334')+r(22+stride,116,7,1,'#7b8d94')+r(34-stride,117,7,1,'#7b8d94');
  }
  const y=(sitting?65:77)+bob+crouch;
  b+=p(`${21+torsoShiftX},${y} ${38+torsoShiftX},${y-1} ${44+torsoShiftX},${y+6} ${43+torsoShiftX},${y+24} ${19+torsoShiftX},${y+24} ${17+torsoShiftX},${y+5}`,'#172b3d')+
    p(`${22+torsoShiftX},${y+1} ${37+torsoShiftX},${y} ${42+torsoShiftX},${y+7} ${40+torsoShiftX},${y+22} ${21+torsoShiftX},${y+22} ${19+torsoShiftX},${y+6}`,'#7389a9')+
    r(22+torsoShiftX,y+3,3,17,'#a9b9c9')+r(36+torsoShiftX,y+7,4,14,'#3c5678')+
    p(`${26+torsoShiftX},${y} ${34+torsoShiftX},${y} ${32+torsoShiftX},${y+11} ${28+torsoShiftX},${y+11}`,'#e9e1cd')+r(30+torsoShiftX,y+11,1,10,'#4e6274')+r(32+torsoShiftX,y+17,5,1,'#c5cfce')+
    r(26+torsoShiftX,y-6,10,8,'#c68d67');
  // Stepped silhouette, ear, cheek, nose and layered hair highlights.
  const hx=torsoShiftX;
  b+=p(`${17+hx},${headY+7} ${21+hx},${headY+2} ${43+hx},${headY+1} ${49+hx},${headY+7} ${49+hx},${headY+22} ${43+hx},${headY+29} ${25+hx},${headY+29} ${18+hx},${headY+22}`,'#332c38')+
    p(`${23+hx},${headY+7} ${43+hx},${headY+5} ${47+hx},${headY+10} ${47+hx},${headY+22} ${42+hx},${headY+27} ${27+hx},${headY+26} ${23+hx},${headY+21}`,'#d6a078')+
    p(`${27+hx},${headY+9} ${43+hx},${headY+7} ${46+hx},${headY+11} ${46+hx},${headY+22} ${40+hx},${headY+25} ${29+hx},${headY+23}`,'#f0c69a')+
    r(43+hx,headY+15,3,3,'#1d2e3e')+r(44+hx,headY+15,1,1,'#d7e0d4')+r(47+hx,headY+19,5,4,'#e5b48a')+
    r(40+hx,headY+24,6,1,'#a76f5c')+r(25+hx,headY+17,5,8,'#bc845f')+r(26+hx,headY+17,3,5,'#e6b68a')+
    p(`${17+hx},${headY+8} ${20+hx},${headY+2} ${27+hx},${headY-1} ${41+hx},${headY-1} ${47+hx},${headY+3} ${46+hx},${headY+9} ${34+hx},${headY+7} ${28+hx},${headY+13} ${25+hx},${headY+20} ${18+hx},${headY+18}`,'#553c3e')+
    p(`${20+hx},${headY+5} ${28+hx},${headY+1} ${41+hx},${headY+1} ${44+hx},${headY+4} ${31+hx},${headY+3} ${24+hx},${headY+7}`,'#916151')+
    r(20+hx,headY+8,3,7,'#6e4843')+r(25+hx,headY+2,8,1,'#b68160')+
    r(18+hx,headY+10,3,12,'#7da3af')+r(17+hx,headY+17,7,9,'#153247')+r(19+hx,headY+18,3,6,'#4f7b8e');
  if(sitting&&mood==='type'){
   b+=p(`${34+hx},${y+8} ${44+hx},${y+13} ${62+hx},${y+14} ${62+hx},${y+19} ${41+hx},${y+19} ${33+hx},${y+13}`,'#3c5678')+
    r(59+hx,y+12+f%2,21,5,'#dbab80')+r(78+hx,y+10+f%3,10,4,'#f1cba0')+r(82+hx,y+10+f%3,3,1,'#f8dec0');
  }else if(sitting){
   b+=p(`${32+hx},${y+8} ${41+hx},${y+13} ${48+hx},${y+18} ${43+hx},${y+22} ${33+hx},${y+16}`,'#7389a9')+
    r(43+hx,y+17,9,5,'#e5b78b');
  }else{
   const swing=walking?[-3,1,3,-1][f]:0;
   b+=r(16+swing,y+7,6,12,'#3c5678')+r(16+swing,y+18,6,7,'#e5b78b')+r(40-swing,y+7,6,12,'#7389a9')+r(41-swing,y+18,6,7,'#e5b78b');
  }
  if(mood==='idle'&&f===1)b+=r(42+hx,headY+14,5,5,'#f0c69a')+r(43+hx,headY+17,3,1,'#69524b');
  if(mood==='wait')b+=r(40+hx,y+12,12,5,'#e8bd8e')+r(48+hx,headY-9+f,2,6,'#f3d08d')+r(48+hx,headY-1+f,2,2,'#f3d08d');
  if(mood==='error')b+=r(51+hx,headY-8-f,10,13,'#f4a18a')+r(55+hx,headY-6-f,2,6,'#6b3741')+r(55+hx,headY+1-f,2,2,'#6b3741');
  if(mood==='unknown')b+=r(52+hx,headY-6,12,13,'#42657b')+r(56+hx,headY-3,5,2,'#a8d4d6')+r(59+hx,headY-1,2,3,'#a8d4d6')+r(56+hx,headY+4,2,2,'#a8d4d6');
  if(back){ // Back of head/headset, no face looking sideways during approach.
   b+=p(`18,${headY+8} 22,${headY+2} 41,${headY} 48,${headY+6} 47,${headY+23} 42,${headY+27} 25,${headY+26} 18,${headY+21}`,'#553c3e')+
    r(22,headY+5,18,3,'#916151')+r(18,headY+14,4,9,'#365c73')+r(44,headY+13,4,9,'#365c73');
  }
  art[`${pose}-${f}`]=b;
 }
}
