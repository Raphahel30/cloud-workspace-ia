export type ConnectionState = 'unknown' | 'offline' | 'online' | 'busy' | 'error';
export type AgentState = 'closed' | 'idle' | 'working' | 'awaiting_approval' | 'error' | 'unknown';
export type Room = 'boss' | 'agents' | 'servers';
export interface AgentTelemetry {
  id: string;
  label: string;
  state: AgentState;
  observedAt: string | null;
  verified: boolean;
  source: 'mcp' | 'process' | 'agent' | 'none';
}
export interface ServiceTelemetry {
  id: string;
  label: string;
  state: ConnectionState;
  checkedAt: string | null;
}
export interface ProjectDescriptor {
  id: string;
  name: string;
  locationLabel: string;
  driveFolderId: string | null;
  githubRepository: string | null;
  status: 'not-imported' | 'ready' | 'working' | 'conflict';
}
export interface TaskTelemetry {
  id: string;
  title: string;
  projectId: string;
  state: 'running' | 'waiting' | 'completed' | 'failed';
  owner: string;
}
export interface Snapshot {
  agents: AgentTelemetry[];
  services: ServiceTelemetry[];
  projects: ProjectDescriptor[];
  tasks: TaskTelemetry[];
  source: 'demo' | 'local-service';
}