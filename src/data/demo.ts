import type { Snapshot } from '../lib/types';
/** Valores cenográficos: NENHUM deles é uma conexão real. */
export const initialSnapshot: Snapshot = {
  source: 'demo',
  tasks: [],
  projects: [],
  agents: [
    { id:'chatgpt',label:'ChatGPT',state:'unknown',verified:false,source:'none',observedAt:null },
    { id:'antigravity',label:'Antigravity',state:'unknown',verified:false,source:'none',observedAt:null },
    { id:'codex',label:'Codex',state:'unknown',verified:false,source:'none',observedAt:null },
    { id:'claude',label:'Claude Code',state:'unknown',verified:false,source:'none',observedAt:null }
  ],
  services: [
    {id:'drive',label:'Google Drive',state:'unknown',checkedAt:null},
    {id:'github',label:'GitHub',state:'unknown',checkedAt:null},
    {id:'hostinger',label:'Hostinger',state:'unknown',checkedAt:null},
    {id:'mcp',label:'MCP local',state:'unknown',checkedAt:null},
    {id:'desktop',label:'Desktop Commander',state:'unknown',checkedAt:null}
  ]
};