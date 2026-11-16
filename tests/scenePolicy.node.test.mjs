import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bossVisible, agentMood, uiConnectionLabel, DEMO_ONLY, SCENE_COPY } from '../src/lib/scenePolicy.ts';

test('chefe só aparece com tarefa Cloud Workspace ativa', () => {
  for (const scene of ['idle', 'alert', 'active']) {
    assert.equal(bossVisible(scene, false), false);
  }
  assert.equal(bossVisible('active', true), true);
});
test('sem confirmação, agente permanece em espera e não aparece trabalhando', () => {
  for (const scene of ['idle', 'active', 'alert']) assert.equal(agentMood(scene, false), 'waiting');
  assert.equal(agentMood('active', true), 'typing');
  assert.equal(agentMood('alert', true), 'alert');
});
test('dados demonstrativos nunca são telemetria real', () => {
  assert.equal(DEMO_ONLY.actualWorkConfirmed, false);
  assert.equal(DEMO_ONLY.anyExternalConnectionVerified, false);
  assert.equal(uiConnectionLabel(false), 'unverified');
  for (const scene of ['idle', 'active', 'alert']) assert.match(SCENE_COPY[scene], /simulado/i);
});