/** Policies for visual-only scene playback. NEVER infer agent activity from animations. */
export type DemoScene = 'idle' | 'active' | 'alert' | 'waiting' | 'absent' | 'unknown';
export type CharacterMood = 'absent' | 'idle' | 'typing' | 'waiting' | 'alert';
export type ConnectionState = 'unverified' | 'verified' | 'error';

export function bossVisible(scene: DemoScene, cloudWorkspaceTask: boolean): boolean {
  return scene === 'active' && cloudWorkspaceTask;
}

export function agentMood(scene: DemoScene, connected: boolean): CharacterMood {
  if (!connected) return 'waiting';
  return scene === 'active' ? 'typing' : scene === 'alert' ? 'alert' : 'idle';
}

export function uiConnectionLabel(verified: boolean): ConnectionState {
  return verified ? 'verified' : 'unverified';
}

export const DEMO_ONLY = Object.freeze({
  agentsConnected: false,
  cloudWorkspaceTask: false,
  anyExternalConnectionVerified: false,
  actualWorkConfirmed: false,
});

export const SCENE_COPY: Record<DemoScene, string> = {
  unknown: 'Sem telemetria: estados desconhecidos; nenhuma atividade inferida.',
  absent: 'DEMO: personagens ausentes. Nenhum processo real observado.',
  waiting: 'DEMO: aguardando aprovação fictícia; nenhuma autorização real solicitada.',
  idle: 'Cenário simulado: personagens em repouso, chefe ausente, LEDs ambientais ativos.',
  active: 'Cenário simulado: equipe trabalhando e chefe em tarefa fictícia do Cloud Workspace.',
  alert: 'Cenário simulado: alerta visual. Nenhuma falha real ou recuperação está em execução.',
};