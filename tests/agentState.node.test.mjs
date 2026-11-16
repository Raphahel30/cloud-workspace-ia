import test from 'node:test';
import assert from 'node:assert/strict';
import { agentVisualState, chiefVisible, connectionLabel } from '../src/core-contracts/agentState.ts';

const now = 2_000_000;
const base = { agentId:'codex',origin:'cloud-workspace-mcp',trust:'verified',
  observedAtMs:now,open:true,taskStatus:'running',taskId:'job-123' };

test('nunca marca trabalhando apenas porque um processo está aberto',()=>{
  assert.equal(agentVisualState({...base,origin:'process-observation'},now),'unknown');
  assert.equal(agentVisualState({...base,trust:'unverified'},now),'unknown');
  assert.equal(agentVisualState({...base,taskId:null},now),'unknown');
});
test('somente job recente verificado gera o estado de trabalho',()=>{
  assert.equal(agentVisualState(base,now),'working');
  assert.equal(agentVisualState({...base,observedAtMs:now-31_000},now),'unknown');
  assert.equal(agentVisualState({...base,taskStatus:'waiting-approval'},now),'waiting');
  assert.equal(agentVisualState({...base,taskStatus:'failed'},now),'error');
});
test('observação fechada e comprovada gera ausente, sem confundir com ocioso',()=>{
  assert.equal(agentVisualState({...base,open:false,taskStatus:null},now),'absent');
  assert.equal(agentVisualState({...base,origin:'process-observation',taskStatus:null},now),'unknown');
});
test('chefe só aparece com tarefa real do Cloud Workspace em andamento',()=>{
  assert.equal(chiefVisible([],now),false);
  assert.equal(chiefVisible([{id:'x',origin:'cloud-workspace',trust:'unverified',status:'running',observedAtMs:now}],now),false);
  assert.equal(chiefVisible([{id:'x',origin:'cloud-workspace',trust:'verified',status:'running',observedAtMs:now}],now),true);
});
test('conexões não verificadas nunca aparecem como conectadas',()=>{
  assert.equal(connectionLabel(false,true),'unknown');
  assert.equal(connectionLabel(true,true),'connected');
});