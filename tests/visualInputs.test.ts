import {it,expect} from 'vitest';
import { fromEvidence } from '../src/scene/visualInputs';
it('never turns unverified task data into visual work or a chief',()=>{
  const now=10000;
  const frame=fromEvidence([{agentId:'codex',origin:'process-observation',trust:'verified',observedAtMs:now,open:true,taskStatus:'running',taskId:'x'}],[],now);
  expect(frame.states.codex).toBe('unknown');expect(frame.chief).toBe(false);
});
it('keeps each verified agent independent and expires old activity',()=>{
  const now=10000;
  const data=[{agentId:'codex',origin:'authorized-cli' as const,trust:'verified' as const,observedAtMs:now,open:true,taskStatus:'running' as const,taskId:'x'}, {agentId:'chatgpt',origin:'authorized-cli' as const,trust:'verified' as const,observedAtMs:now,open:true,taskStatus:'waiting-approval' as const,taskId:'y'}];
  expect(fromEvidence(data,[],now).states).toEqual({codex:'working',chatgpt:'waiting'});
  expect(fromEvidence(data,[],now+31000).states.codex).toBe('unknown');
});
