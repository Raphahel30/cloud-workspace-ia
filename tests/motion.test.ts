import {it,expect} from 'vitest';
import {CharacterMotion,elevatorAt} from '../src/scene/motion';

it('uses an empty foreground aisle, then sits with fixed feet before typing',()=>{
 const m=new CharacterMotion({x:210,y:-27});m.setState('working');
 let sat=false,typed=false;
 for(let i=0;i<120;i++){
  const p=m.advance(.04);if(p.phase==='sit')sat=true;if(p.pose==='type')typed=true;
  if(p.phase==='aisle')expect(p.y).toBeCloseTo(-6-p.x*.068,4);
 }
 expect(sat).toBe(true);expect(typed).toBe(true);expect(m.position()).toEqual({x:210,y:-27});
});
it('holds position when interrupted and exits along the aisle before disappearing',()=>{
 const m=new CharacterMotion({x:210,y:-27});m.setState('working');m.advance(.2);
 const before=m.position();m.setState('waiting');m.advance(.3);expect(m.position()).toEqual(before);
 m.setState('absent');expect(m.advance(.05).visible).toBe(true);
 for(let i=0;i<200;i++)m.advance(.04);
 expect(m.advance(.01).visible).toBe(false);
});
it('keeps feet fixed during idle and motion-reduced transitions',()=>{
 const m=new CharacterMotion({x:210,y:-27});m.setState('working');m.advance(.1,true);
 expect(m.position()).toEqual({x:210,y:-27});expect(m.advance(.1,true).pose).toBe('type');
 m.setState('idle');const p=m.position();m.advance(1);expect(m.position()).toEqual(p);
});
it('elevator dwells aligned at landings, doors closed while travelling',()=>{
 expect(elevatorAt(.5).y).toBe(484);expect(elevatorAt(1).y).toBe(484);
 const moving=elevatorAt(2.4);expect(moving.y).toBeLessThan(484);expect(moving.y).toBeGreaterThan(376);expect(moving.doors).toBe(0);
 expect(elevatorAt(4).y).toBe(376);expect(elevatorAt(4).doors).toBeGreaterThan(0);
 for(let i=0;i<100;i++){const p=elevatorAt(i*.5);expect(p.y).toBeGreaterThanOrEqual(52);expect(p.y).toBeLessThanOrEqual(484);}
});

it('limits foot velocity instead of sliding through a route segment',()=>{
 const m=new CharacterMotion({x:210,y:-27});m.setState('working');
 for(let i=0;i<60;i++){const before=m.position();const after=m.advance(.05);expect(Math.hypot(after.x-before.x,after.y-before.y)).toBeLessThanOrEqual(4.251);}
});

it('re-enters from absence for every present state, including reduced motion',()=>{
 for(const state of ['idle','waiting','error','unknown'] as const)for(const reduced of [false,true]){
  const m=new CharacterMotion({x:210,y:-27});m.setState('absent');for(let i=0;i<180;i++)m.advance(.05);
  expect(m.advance(0).visible).toBe(false);m.setState(state);
  expect(m.advance(0,reduced).visible,state).toBe(true);
  for(let i=0;i<180;i++)m.advance(.05,reduced);
  expect(m.advance(0,reduced).pose,state).toBe(state==='waiting'?'wait':state==='error'?'error':state);
 }
});
