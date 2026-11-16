import { Application, Assets, Container, Graphics, Sprite, Text, Texture, type Spritesheet } from 'pixi.js';
import type { AgentVisualState } from '../core-contracts/agentState';
import type { ActorStates } from './visualInputs';
import { cameraFor, demoState, poseAt, renderBudget } from './behavior';
import { floorOrder, floors, type FloorKey } from '../data/floors';
import type { DemoScene } from '../lib/scenePolicy';

type View = { selected:FloorKey; zoomed:boolean; scene:DemoScene; paused:boolean; reduced:boolean; actorStates?:ActorStates };
type Actor = { id:string; sprite:Sprite; chair:Sprite; x:number; y:number; index:number; boss:boolean };
const C={edge:0x0c192a,wall:0x23394c,cyan:0x78dce7,amber:0xf3c87e};
const floorNames=['RECEPÇÃO','CONTROLE','EQUIPE IA','MCP / TESTES','INTEGRAÇÕES'];

/** Owns only visual resources and a local clock. No service connection or core timer. */
export class OfficeRenderer {
  private app=new Application();
  private world=new Container();
  private actors:Actor[]=[];
  private lights:Graphics[]=[];
  private car=new Container();
  private selections:Graphics[]=[];
  private sheet!:Spritesheet;
  private view:View;
  private destroyed=false;
  private released=false;
  private visible=true;
  private timer:ReturnType<typeof setTimeout>|undefined;
  private elapsed=0;
  private actorTransitions=new Map<string,{state:AgentVisualState;since:number;from:number}>();
  private last=0;
  private frames=0;
  private camera={scale:1,x:0,y:0};
  private target={scale:1,x:0,y:0};
  private moving=false;
  private observer?:ResizeObserver;
  private intersection?:IntersectionObserver;
  private inViewport=true;
  private readonly visibility=()=>{this.visible=!document.hidden;this.schedule();};

  constructor(private host:HTMLDivElement, view:View,private onSelect:(floor:FloorKey)=>void) {this.view=view;}
  async init() {
    await this.app.init({width:1100,height:740,background:0x091727,antialias:false,resolution:1,autoStart:false,preference:'webgl',powerPreference:'low-power'});
    if(this.destroyed){this.release();return;}
    this.sheet=await Assets.load<Spritesheet>('/art/office.json');
    if(this.destroyed){this.release();return;}
    this.sheet.textureSource.scaleMode='nearest';
    this.app.canvas.setAttribute('aria-hidden','true');
    this.host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.world);
    this.build();
    this.observer=new ResizeObserver(()=>this.resize());
    this.observer.observe(this.host);
    this.intersection=new IntersectionObserver(entries=>{this.inViewport=entries[0]?.isIntersecting??true;this.schedule();});
    this.intersection.observe(this.host);
    document.addEventListener('visibilitychange',this.visibility);
    this.visible=!document.hidden;
    this.resize();
    this.update(this.view);
  }
  private poly(parent:Container,points:number[],fill:number,alpha=1) {
    const g=new Graphics().poly(points).fill({color:fill,alpha});parent.addChild(g);return g;
  }
  private rect(parent:Container,x:number,y:number,w:number,h:number,color:number,alpha=1) {
    const g=new Graphics().rect(x,y,w,h).fill({color,alpha});parent.addChild(g);return g;
  }
  private text(parent:Container,text:string,x:number,y:number,size=12,color=0xd1e5e9) {
    const t=new Text({text,style:{fontFamily:'monospace',fontSize:size,fontWeight:'bold',fill:color}});t.position.set(x,y);parent.addChild(t);return t;
  }
  private sprite(parent:Container,name:string,x:number,y:number,scale=.65) {
    const s=new Sprite(this.sheet.textures[name]);s.anchor.set(0,1);s.position.set(x,y);s.scale.set(scale);parent.addChild(s);return s;
  }
  private build() {
    const w=this.world;
    // Deterministic night skyline: geometry, never the approved reference bitmap.
    for(let i=0;i<26;i++) {
      const x=i*47-45,h=50+(i*71%220),y=655-h;
      this.rect(w,x,y,40,h,0x10273b);
      this.rect(w,x+3,y+3,34,2,0x264057);
      for(let row=0;row<h/15-1;row++)for(let col=0;col<4;col++)if((row*13+col*7+i)%5<2)this.rect(w,x+5+col*9,y+9+row*15,3,5,(row+i)%3?0x3b667b:0xad8956,.45);
    }
    for(let i=0;i<50;i++)this.rect(w,(i*127)%1100,20+(i*53)%270,1,1,0x548799,.5);
    this.poly(w,[115,667,830,617,1006,682,275,738],0x142b3c);
    this.poly(w,[125,667,830,623,980,680,277,729],0x2a4150);
    for(let i=0;i<19;i++)this.poly(w,[145+i*39,667-i*2.3,147+i*39,667-i*2.3,290+i*37,722-i*2.4,288+i*37,722-i*2.4],0x3c5460);
    this.poly(w,[155,688,870,640,922,658,208,707],0x3d515c);
    this.poly(w,[155,688,208,707,208,714,155,695],0x172d40);
    // Rear elevator shaft and opaque outer structural wall.
    this.poly(w,[814,78,868,98,868,641,814,622],0x162c41);
    this.rect(w,827,111,25,511,0x29495e);
    this.rect(w,832,111,2,511,0x93b9c6,.6);
    this.rect(w,849,111,2,511,0x93b9c6,.6);
    for(let i=0;i<5;i++) {
      const floor=new Container();floor.position.set(279,610-i*108);w.addChild(floor);
      const structural=new Container(),furniture=new Container();furniture.sortableChildren=true;floor.addChild(structural,furniture);
      this.poly(structural,[0,0,470,-32,560,-85,90,-53],0x71818a);
      // Tiles follow the same two basis vectors throughout the building.
      for(let u=0;u<470;u+=28)for(let v=0;v<130;v+=24){
        const x=u+v*.69,y=-u*.068-v*.4;
        this.poly(structural,[x,y,x+27,y-1.84,x+43,y-11.4,x+16,y-9.6],(u/28+v/24)%2?0x71818a:0x6d7e87);
      }
      this.poly(structural,[90,-53,560,-85,560,-162,90,-130],C.wall);
      this.poly(structural,[90,-53,95,-53,95,-129,90,-130],0x587181);
      for(let n=0;n<13;n++)this.poly(structural,[100+n*35,-129-n*2.35,102+n*35,-129-n*2.35,102+n*35,-55-n*2.35,100+n*35,-55-n*2.35],0x2f485b);
      for(let n=0;n<4;n++) {
        const x=120+n*108,y=-83-n*7.3;
        this.poly(structural,[x,y,x+55,y-3.7,x+55,y-1,x,y+3],C.amber);
        this.poly(structural,[x+3,y+4,x+52,y+.5,x+65,y+56,x-5,y+61],C.amber,.04);
        this.poly(structural,[x+7,y+6,x+48,y+3,x+48,y+35,x+7,y+38],C.amber,.06);
      }
      // Left glass with window mullions, amber reflections and night-blue panes.
      this.poly(structural,[0,0,90,-53,90,-130,0,-77],0x20485e);
      for(let n=0;n<4;n++) {
        const x=n*23,y=-n*13.5;
        this.poly(structural,[x+3,y-4,x+20,y-14,x+20,y-83,x+3,y-73],0x38708b,.65);
        this.poly(structural,[x+5,y-9,x+10,y-12,x+10,y-58,x+5,y-55],0x8ac4d2,.35);
        this.poly(structural,[x+3,y-14,x+20,y-24,x+20,y-36,x+3,y-26],C.amber,.35);
        this.poly(structural,[x,y,x+3,y-2,x+3,y-78,x,y-77],0x132c42);
      }
      const add=(name:string,x:number,y:number,s=.65)=>{const o=this.sprite(furniture,name,x,y,s);o.zIndex=name==='board'?-1000:y;return o;};
      add('plant',75,-26,.65);add('plant',478,-54,.65);
      if(i===4) {
        for(let n=0;n<7;n++) {
          const x=100+n*43,y=-1-n*1.7;
          add('rack',x,y,.68);
          const led=new Graphics();led.position.set(x+44,y-65);led.zIndex=y+.1;furniture.addChild(led);this.lights.push(led);
        }
        add('board',390,-25,.65);add('plant',455,-20,.6);
      } else if(i===3) {
        add('rack',98,-2,.68);add('rack',143,-5,.68);add('board',290,-25,.85);add('bot',412,-32,.63);
      } else if(i===2) {
        add('board',225,-25,.72);add('bot',437,-29,.6);
      } else if(i===1) {
        add('books',125,-3,.75);add('board',355,-25,.8);add('lamp',210,-36,.6);
        this.poly(furniture,[171,-8,306,-18,334,-34,197,-25],0x896745).zIndex=-20;
        this.poly(furniture,[179,-9,304,-17,326,-32,200,-23],0xb69c71).zIndex=-19;
      } else {
        add('door',20,12,.9);add('sofa',358,-17,.75);add('board',360,-25,.7);add('lamp',425,-25,.6);
        const desk=add('desk',150,-8,1.2);desk.tint=0xeac995;
        this.text(furniture,'CW',216,-25,12,C.amber).zIndex=0;
      }
      const seats = i===2 ? [115,208,301,394] : i===4 ? [435] : i===3 ? [230,333] : i===1 ? [207,360] : [205];
      for(let n=0;n<seats.length;n++) {
        const x=seats[n],y=-10-x*.068;
        const chair=add('chair',x-21,y+4,.7);
        const actor=add('idle-0',x-22,y+3,.7);
        this.actors.push({id:i===2?['chatgpt','codex','antigravity','claude'][n]:i===1&&n===0?'chief':`${floorOrder[i]}-${n}`,sprite:actor,chair,x:x-22,y:y+3,index:this.actors.length,boss:i===1&&n===0});
        if(i!==0) add('desk',x,y,.7);
        if(i===2){const name=['ChatGPT','Codex','Antigravity','Claude'][n];this.text(structural,name,x+3,y+9,8,0xb7c9d0);}
      }
      // Independent rack indicators: grey for unknown, coloured only in explicit DEMO.
      const led=new Graphics();led.position.set(144,-51);floor.addChild(led);this.lights.push(led);
      // Front fascia and floor labels remain separate from the room contents.
      this.poly(floor,[0,0,470,-32,470,-24,0,8],0x182d43);
      this.poly(floor,[0,0,470,-32,470,-30,0,2],0x9bb0b9);
      this.poly(floor,[470,-32,560,-85,560,-77,470,-24],0x30485e);
      this.poly(floor,[470,-32,540,-73,540,-146,470,-105],0x142c42);
      this.text(floor,String(i+1).padStart(2,'0'),484,-104,16,C.amber);
      const sign=this.text(floor,floorNames[i],481,-78,8,0xb3d5e0);sign.rotation=-.12;
      this.poly(floor,[466,-108,470,-110,470,-28,466,-27],0x5b8496);
      const selection=this.poly(floor,[2,3,468,-29,468,-26,2,6],C.cyan);selection.visible=false;this.selections.push(selection);
      structural.eventMode='static';structural.cursor='zoom-in';
      structural.on('pointertap',()=>this.onSelect(floorOrder[i]));
      // Shaft landings occlude the moving car behind them.
      this.poly(floor,[548,-79,581,-67,581,-73,548,-85],0x8093a1);
    }
    // Roof slab matches the 108px floor pitch.
    const roof=new Container();roof.y=-31;w.addChild(roof);
    this.poly(roof,[279,101,749,69,839,16,369,48],0x597082);
    this.poly(roof,[279,101,749,69,749,77,279,109],0x1c344c);
    this.poly(roof,[749,69,839,16,839,24,749,77],0x263b55);
    this.poly(roof,[294,98,746,67,746,69,294,100],0x7d9bab);
    this.poly(roof,[370,49,836,17,836,22,370,54],0x233b53);
    for(let i=0;i<3;i++) {this.rect(roof,450+i*86,33-i*5,48,18,0x284259);this.rect(roof,453+i*86,33-i*5,42,3,0x60798a);}
    // Continuous west facade, architectural branding, amber edge lights.
    this.poly(w,[218,135,278,100,278,618,218,654],0x162a40);
    this.poly(w,[218,135,230,128,230,647,218,654],0x203b51);
    this.poly(w,[273,103,278,100,278,618,273,621],0x597186);
    this.rect(w,235,163,33,42,0x806343);
    this.rect(w,237,165,29,38,0xffcf79,.8);
    this.rect(w,240,168,23,32,0x142b40);
    this.text(w,'CW',241,178,14,C.amber);
    this.text(w,'CLOUD',232,229,10);this.text(w,'WORK',232,245,10);this.text(w,'SPACE',232,261,10);this.text(w,'IA',242,282,14,C.cyan);
    this.rect(w,239,310,20,3,C.cyan);this.rect(w,235,304,4,9,C.cyan);this.rect(w,239,299,6,3,C.cyan);this.rect(w,245,296,8,3,C.cyan);this.rect(w,253,300,6,3,C.cyan);this.rect(w,259,304,3,9,C.cyan);
    this.rect(w,245,330,3,248,C.amber,.65);this.rect(w,243,330,7,248,C.amber,.1);
    this.car.position.set(828,320);w.addChild(this.car);
    this.rect(this.car,0,0,23,37,0x5e7d8c);this.rect(this.car,2,3,19,30,0x20465b);this.rect(this.car,10,3,2,30,0x93b6bd);this.rect(this.car,2,33,19,3,C.amber);
    this.rect(w,820,100,4,535,0x45677e);this.rect(w,857,109,4,530,0x45677e);
    for(let i=0;i<5;i++)this.rect(w,821,177+i*108,36,3,0x8097a4);
    this.text(w,'↟',833,95,17,C.cyan);
    // Landscaping and path lights use separate repeated assets.
    for(const [x,y] of [[140,679],[190,697],[900,658],[950,682],[1000,704],[120,630]])this.sprite(w,'plant',x,y,.85);
    for(const [x,y] of [[174,681],[251,710],[897,680],[984,704]]) {this.rect(w,x,y-20,3,23,0x637b85);this.rect(w,x-2,y-26,7,7,C.amber);this.rect(w,x-6,y-30,15,15,C.amber,.07);}
    this.text(w,'SEDE CLOUD WORKSPACE IA',387,696,13,C.amber);
    this.text(w,'05 SETORES  /  CENÁRIO DEMONSTRATIVO',391,716,9,0x8aa9b9);
  }
  update(view:View) {
    this.view=view;
    this.target=cameraFor(this.host.clientWidth,this.host.clientHeight,view.zoomed?floorOrder.indexOf(view.selected):null);
    this.moving=true;
    this.selections.forEach((s,i)=>s.visible=view.zoomed&&floorOrder[i]===view.selected);
    this.schedule(true);
  }
  private resize() {
    if(this.destroyed)return;
    const {clientWidth:w,clientHeight:h}=this.host;if(!w||!h)return;
    this.app.renderer.resize(w,h);
    this.target=cameraFor(w,h,this.view.zoomed?floorOrder.indexOf(this.view.selected):null);
    this.camera={...this.target};this.moving=false;this.schedule(true);
  }
  private schedule(force=false) {
    clearTimeout(this.timer);this.timer=undefined;
    const visible=this.visible&&this.inViewport;
    const budget=renderBudget(visible,this.view.paused,this.view.reduced,this.view.scene,Object.values(this.view.actorStates??{}).some(s=>s==='working'||s==='waiting'||s==='error'));
    this.host.dataset.fps=String(budget);
    this.host.dataset.suspended=String(!visible);
    if(this.destroyed||!visible)return;
    if(force||this.moving||budget>0){this.last=performance.now();this.tick(force);}
  }
  private tick(force=false) {
    if(this.destroyed)return;
    const now=performance.now();
    const delta=Math.min(.1,(now-this.last)/1000);this.last=now;
    const fps=renderBudget(this.visible&&this.inViewport,this.view.paused,this.view.reduced,this.view.scene,Object.values(this.view.actorStates??{}).some(s=>s==='working'||s==='waiting'||s==='error'));
    if(fps>0&&!force)this.elapsed+=delta;
    const state=demoState(this.view.scene);
    for(const a of this.actors) {
      const actorState=this.view.actorStates?.[a.id]??state;
      let transition=this.actorTransitions.get(a.id);
      if(!transition||transition.state!==actorState){
        const from=transition?poseAt(transition.state,this.elapsed-transition.since,a.index*.19,this.view.reduced,transition.from).travel:1;
        transition={state:actorState,since:this.elapsed,from};this.actorTransitions.set(a.id,transition);
      }
      const p=poseAt(actorState,this.elapsed-transition.since,a.index*.19,this.view.reduced,transition.from);
      a.sprite.visible=p.visible&&(!a.boss||this.view.scene==='active');
      a.sprite.texture=this.sheet.textures[`${p.pose}-${p.frame}-c${a.index%5}`]??Texture.EMPTY;
      // Walk along the clear foreground aisle toward the assigned chair.
      a.sprite.position.set(Math.round(a.x-p.travel*35),Math.round(a.y+p.travel*9));
      a.sprite.zIndex=a.sprite.y;
      a.chair.visible=p.seated||!a.sprite.visible||p.pose!=='walk';
    }
    this.lights.forEach((g,i)=>{g.clear();for(let n=0;n<4;n++)g.rect(0,n*6,2,2).fill(state==='unknown'||state==='absent'?0x657888:state==='error'?0xee8d83:state==='waiting'?C.amber:(Math.floor(this.elapsed*2+i+n)%3?0x83c5a4:0x436c68));});
    this.car.y=Math.round(350+Math.sin(this.elapsed*.22)*220);
    const blend=this.view.reduced?1:1-Math.exp(-Math.max(delta,.016)*9);
    for(const key of ['x','y','scale'] as const)this.camera[key]+=(this.target[key]-this.camera[key])*blend;
    this.moving=Math.abs(this.camera.x-this.target.x)+Math.abs(this.camera.y-this.target.y)+Math.abs(this.camera.scale-this.target.scale)>.15;
    this.world.position.set(Math.round(this.camera.x),Math.round(this.camera.y));this.world.scale.set(this.camera.scale);
    this.app.render();this.frames++;
    this.host.dataset.frames=String(this.frames);this.host.dataset.visualTime=this.elapsed.toFixed(3);
    this.host.dataset.camera=this.view.zoomed?this.view.selected:'overview';
    this.host.dataset.actors=String(this.actors.filter(a=>a.sprite.visible).length);
    const first=this.actorTransitions.get(this.actors[0].id);
    this.host.dataset.pose=poseAt(state,this.elapsed-(first?.since??0),0,this.view.reduced,first?.from).pose;
    this.host.dataset.agentStates=JSON.stringify(Object.fromEntries(this.actorTransitions));
    if(fps>0||this.moving)this.timer=setTimeout(()=>this.tick(),Math.max(0,1000/(fps||30)-(performance.now()-now)));
  }
  private release() {
    if(this.released)return;this.released=true;
    this.app.destroy(true,{children:true,texture:false,textureSource:false});
  }
  destroy() {
    this.destroyed=true;clearTimeout(this.timer);document.removeEventListener('visibilitychange',this.visibility);
    this.observer?.disconnect();this.intersection?.disconnect();
    // Atlas is cached by Assets and shared across StrictMode mounts. Do not destroy its source.
    if(this.app.renderer)this.release();
  }
}
