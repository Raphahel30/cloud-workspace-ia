import type {AgentVisualState} from '../core-contracts/agentState';

type Point={x:number;y:number};
type Phase='still'|'aisle'|'approach'|'sit'|'stand'|'hidden';
const aisle=(x:number):Point=>({x,y:-6-x*.068});
const portal=aisle(605);
/** Visual-only route through the clear front aisle. Feet are the sprite anchor. */
export class CharacterMotion {
 private state:AgentVisualState='unknown';
 private point:Point;
 private route:Array<Point&{phase:Phase}>=[];
 private phase:Phase='still';
 private clock=0;
 private distance=0;
 private settling=0;
 private seated=false;
 private visible=true;
 private facing:'left'|'right'|'back'='right';
 constructor(private seat:Point){this.point=aisle(seat.x-45);}
 position(){return {...this.point};}
 isMoving(){return this.route.length>0||this.settling>0;}
 setState(state:AgentVisualState){
  if(state===this.state)return;
  const entering=!this.visible&&state!=='absent';
  this.state=state;this.route=[];this.settling=0;
  if(entering){this.point={...portal};this.visible=true;this.seated=false;}
  if(state==='working') {
   if(!this.visible){this.point={...portal};this.visible=true;}
   const atSeat=Math.hypot(this.point.x-this.seat.x,this.point.y-this.seat.y)<.1;
   if(atSeat){this.phase='sit';this.settling=.32;}
   else this.route=[{...aisle(this.point.x),phase:'aisle'},{...aisle(this.seat.x),phase:'aisle'},{...this.seat,phase:'approach'}];
  }else if(state==='absent'){
   this.route=[{...aisle(this.point.x),phase:'approach'},{...portal,phase:'aisle'}];
   if(this.seated){this.phase='stand';this.settling=.28;}
  }else if(entering){this.route=[{...aisle(this.seat.x-45),phase:'aisle'}];this.phase='aisle';}
  else this.phase='still'; // An interruption preserves the exact current foot position.
 }
 advance(dt:number,reduced=false){
  this.clock+=dt;
  if(reduced){
   if(this.route.length&&this.state!=='working'&&this.state!=='absent'){const last=this.route[this.route.length-1];this.point={x:last.x,y:last.y};}
   if(this.state==='working'){this.point={...this.seat};this.seated=true;this.visible=true;}
   if(this.state==='absent'){this.point={...portal};this.visible=false;this.seated=false;}
   this.route=[];this.phase=this.visible?'still':'hidden';this.settling=0;
  }else if(this.settling>0){
   this.settling=Math.max(0,this.settling-dt);
   if(this.settling===0){this.seated=this.phase==='sit';this.phase='still';}
  }else if(this.route.length){
   let remaining=dt*85;
   while(this.route.length&&remaining>0){
    const target=this.route[0],dx=target.x-this.point.x,dy=target.y-this.point.y;
    const length=Math.hypot(dx,dy);
    this.phase=target.phase;
    if(length<.001){this.route.shift();continue;}
    this.facing=Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'back':'right';
    const step=Math.min(length,remaining);remaining-=step;this.distance+=step;
    this.point.x+=dx/length*step;this.point.y+=dy/length*step;this.seated=false;
    if(step===length){this.point={x:target.x,y:target.y};this.route.shift();}
   }
   if(!this.route.length){
    if(this.state==='working'){this.phase='sit';this.settling=.32;this.facing='right';}
    else if(this.state==='absent'){this.visible=false;this.phase='hidden';}
    else this.phase='still';
   }
  }
  const walking=this.route.length>0&&this.settling===0;
  const pose=walking?'walk':this.phase==='sit'?'sit':this.phase==='stand'?'stand':this.state==='working'?'type':this.state==='waiting'?'wait':this.state==='error'?'error':this.state==='unknown'?'unknown':'idle';
  const frame=reduced?0:walking?Math.floor(this.distance/16)%4:pose==='sit'?this.settling>.16?0:1:pose==='stand'?this.settling>.14?1:0:pose==='idle'?(this.clock%3.4>3.25?1:0):Math.floor(this.clock*(pose==='type'?6:1.5))%(pose==='type'?4:2);
  return {...this.point,phase:this.phase,pose,frame,facing:this.facing,visible:this.visible,seated:this.seated};
 }
}

/** Environmental elevator, unrelated to tasks: dwell, close doors, accelerate, brake, dwell. */
export function elevatorAt(seconds:number){
 const sequence=[0,1,2,3,4,3,2,1],dwell=1.4,travel=2.2,period=dwell+travel;
 const cycle=((seconds%(sequence.length*period))+sequence.length*period)%(sequence.length*period);
 const index=Math.floor(cycle/period),time=cycle%period;
 const from=sequence[index],to=sequence[(index+1)%sequence.length];
 const t=Math.max(0,(time-dwell)/travel),smooth=t*t*(3-2*t);
 const doors=time<dwell?Math.min(1,time/.25,(dwell-time)/.25):0;
 return {y:484-108*(from+(to-from)*smooth),doors:Math.max(0,doors),floor:from,travelling:time>=dwell};
}
