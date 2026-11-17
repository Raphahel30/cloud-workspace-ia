import type { AgentVisualState } from '../core-contracts/agentState';
import type { DemoScene } from '../lib/scenePolicy';

/** Pure visual clock: no polling, evidence creation or external side effects. */
export function demoState(scene: DemoScene): AgentVisualState {
  return ({idle:'idle',active:'working',waiting:'waiting',alert:'error',absent:'absent',unknown:'unknown'} as const)[scene];
}
export type Pose = 'walk'|'type'|'idle'|'wait'|'error'|'unknown';
export function poseAt(state: AgentVisualState, elapsed: number, offset: number, reduced = false, initialTravel = state === 'working' ? 1 : 0) {
  const progress = reduced ? 1 : Math.min(1, Math.max(0, elapsed / 1.8));
  const walking = progress < 1 && (state === 'working' && initialTravel > 0 || state === 'absent' && initialTravel < 1);
  const pose: Pose = walking ? 'walk' : state === 'working' ? 'type' : state === 'waiting' ? 'wait' : state === 'error' ? 'error' : state === 'unknown' ? 'unknown' : 'idle';
  const count = pose === 'walk' || pose === 'type' ? 4 : 2;
  return {pose, frame: reduced ? 0 : Math.floor((elapsed + offset) * (pose === 'walk' ? 8 : 5)) % count,
    visible: state !== 'absent' || progress < 1 && initialTravel < 1,
    travel: state === 'absent' ? initialTravel+(1-initialTravel)*progress : state === 'working' ? initialTravel*(1-progress) : initialTravel,
    seated: !walking && state === 'working'};
}
export function renderBudget(visible: boolean, paused: boolean, reduced: boolean, scene: DemoScene, individualActivity = false) {
  return !visible || paused || reduced ? 0 : individualActivity ? 30 : scene === 'idle' || scene === 'unknown' || scene === 'absent' ? 10 : 30;
}
export function cameraFor(width: number, height: number, floor: number|null) {
  const scale = floor === null ? Math.min(width/1100,height/800) : Math.min(width/850,height/310);
  return {scale,x:width/2-(floor === null?555:630)*scale,y:height/2-(floor === null?360:610-floor*108-60)*scale};
}
