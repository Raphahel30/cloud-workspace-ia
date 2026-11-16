import { describe, it, expect } from 'vitest';
import { poseAt, renderBudget, cameraFor, demoState } from '../src/scene/behavior';

describe('visual isolated from evidence', () => {
  it('keeps missing telemetry unknown; demo is explicitly opt-in', () => {
    expect(demoState('unknown')).toBe('unknown');
    expect(demoState('active')).toBe('working');
  });
  it('walks to the chair, types only after arrival, and leaves before absence', () => {
    expect(poseAt('working', 0, 0).pose).toBe('walk');
    expect(poseAt('working', 3, 0).pose).toBe('type');
    expect(poseAt('absent', .3, 0).pose).toBe('walk');
    expect(poseAt('absent', 3, 0).visible).toBe(false);
    expect(poseAt('unknown', 3, 0).pose).toBe('unknown');
  });
  it('does not slide stationary states or teleport when work is interrupted',()=>{
    for(const state of ['idle','waiting','error','unknown'] as const)expect(poseAt(state,0,0).travel).toBe(0);
    const travel=poseAt('working',.5,0).travel;
    expect(poseAt('waiting',0,0,false,travel).travel).toBe(travel);
    expect(poseAt('waiting',2,0,false,travel).travel).toBe(travel);
  });
  it('has distinct 4 walk/type and 2 idle/wait/error frames', () => {
    for(const state of ['working','idle','waiting','error'] as const) {
      const frames = new Set(Array.from({length:20},(_,i)=>poseAt(state,3+i*.13,0).frame));
      expect(frames.size).toBe(state==='working'?4:2);
    }
  });
  it('stops when hidden or paused, and reduces FPS without confirmed movement', () => {
    expect(renderBudget(false,false,false,'active')).toBe(0);
    expect(renderBudget(true,true,false,'active')).toBe(0);
    expect(renderBudget(true,false,true,'active')).toBe(0);
    expect(renderBudget(true,false,false,'idle')).toBe(10);
    expect(renderBudget(true,false,false,'active')).toBe(30);
    expect(renderBudget(true,false,false,'idle',true)).toBe(30);
  });
  it('fits all floors and keeps selected floor centered after resizing', () => {
    const overview=cameraFor(1000,600,null);
    const focus=cameraFor(1000,600,4);
    expect(focus.scale).toBeGreaterThan(overview.scale);
    expect(focus.y+(610-4*108-60)*focus.scale).toBeCloseTo(300);
  });
});
