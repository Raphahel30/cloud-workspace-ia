import { agentVisualState, chiefVisible, type AgentEvidence, type AgentVisualState, type CloudWorkspaceTask } from '../core-contracts/agentState';

export type ActorStates = Readonly<Record<string,AgentVisualState>>;
/** Pure boundary for a future event owner. Call on received data, never from the rendering clock.
 * Not connected to a service in this task. TTL and trust stay owned by the read-only contract. */
export function fromEvidence(evidence:ReadonlyArray<AgentEvidence>,tasks:ReadonlyArray<CloudWorkspaceTask>,nowMs:number) {
  return {states:Object.fromEntries(evidence.map(e=>[e.agentId,agentVisualState(e,nowMs)])) as ActorStates,chief:chiefVisible(tasks,nowMs)};
}
