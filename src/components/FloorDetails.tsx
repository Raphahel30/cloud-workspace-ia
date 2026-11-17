import type { AgentVisualState } from '../core-contracts/agentState';
import type { ActorStates } from '../scene/visualInputs';
import { floors, floorOrder, type FloorKey } from '../data/floors';
import { type DemoScene } from '../lib/scenePolicy';

type Role = { id:string; label: string; initials: string; color: string; area: FloorKey };
const roles: Role[] = [
  {id:'chatgpt',label: 'ChatGPT', initials: 'GPT', color:'#37c49c', area:'agents'},
  {id:'antigravity',label: 'Antigravity', initials: 'AG', color:'#b398fa', area:'agents'},
  {id:'codex',label: 'Codex', initials: 'CX', color:'#81cef1', area:'agents'},
  {id:'claude',label: 'Claude Code', initials: 'CC', color:'#e7b46d', area:'agents'},
  {id:'mcp',label: 'MCP local', initials: 'MCP', color:'#7eabe5', area:'infra'},
  {id:'playwright',label: 'Playwright', initials: 'PW', color:'#d8a6ef', area:'infra'},
];

function PixelAgent({ initials, color, mood, paused }: {initials: string; color: string; mood: string; paused: boolean}) {
  return <svg className={`pixel-avatar mood-${mood} ${paused?'avatar-paused':''}`} viewBox="0 0 74 72" role="img" aria-label={`${initials} — ${mood} ilustrativo`}>
    <rect x="13" y="61" width="49" height="5" rx="1" fill="#071624"/>
    <g className="avatar-body">
      <rect x="26" y="36" width="28" height="24" fill={color} stroke="#071b30" strokeWidth="3" />
      <rect x="31" y="58" width="8" height="6" fill="#263d59"/><rect x="44" y="58" width="8" height="6" fill="#263d59"/>
      <rect x="22" y="10" width="36" height="30" rx="3" fill="#253b5a" stroke="#0a192b" strokeWidth="3" />
      <rect x="25" y="15" width="30" height="20" fill="#101e33" stroke="#6c93ab" strokeWidth="2"/>
      <rect x="30" y="21" width="5" height="4" fill="#64d4f0"/><rect x="46" y="21" width="5" height="4" fill="#64d4f0"/>
      <rect x="31" y="29" width="18" height="2" fill="#66c4cc"/>
      <rect className="avatar-arm" x="17" y="43" width="9" height="13" fill="#dea977"/>
      <rect className="avatar-arm alt" x="53" y="43" width="9" height="13" fill="#dea977"/>
      <text x="40" y="53" textAnchor="middle" fontSize="9" fontWeight="900" fill="#091a2c" fontFamily="monospace">{initials}</text>
    </g>
    {mood==='idle' && <text className="avatar-z" x="55" y="10" fill="#bdd7f4" fontSize="11" fontWeight="800">Zz</text>}
    {mood==='alert' && <text className="avatar-z" x="57" y="11" fill="#ff667d" fontSize="14" fontWeight="900">!</text>}
  </svg>;
}

const floorServices: Record<FloorKey, string[]> = {
  reception: ['Projetos cadastrados: 0', 'Fila de tarefas: não conectada', 'Aprovações: sem integração'],
  boss: ['Tarefas do Cloud Workspace: não verificadas', 'Decisões pendentes: indisponível', 'Chefe ausente fora de tarefas reais'],
  agents: ['ChatGPT', 'Antigravity', 'Codex', 'Claude Code'],
  infra: ['MCP local', 'Playwright headless', 'Limites de CPU/RAM'],
  servers: ['Google Drive', 'GitHub', 'Hostinger'],
};

export default function FloorDetails({floor, scene, paused, onChoose, actorStates, onDemoState}: {floor:FloorKey;scene:DemoScene;paused:boolean;onChoose:(f:FloorKey)=>void;actorStates:ActorStates;onDemoState:(id:string,state:AgentVisualState)=>void}) {
  const f=floors[floor];
  const mood=scene==='active'?'typing':scene==='alert'?'alert':scene==='waiting'?'waiting':scene==='unknown'?'unknown':'idle';
  const agents=roles.filter(r=>r.area===floor);
  return <section className="sector-detail info-card" aria-label={`Detalhes do andar ${f.number}`}>
    <header className="sector-heading">
      <div><p className="overline">ANDAR {String(f.number).padStart(2,'0')} · INSPEÇÃO</p><h3>{f.glyph} {f.title}</h3><p>{f.detail}</p></div>
      <span className="sector-state">DADOS DEMONSTRATIVOS</span>
    </header>
    <div className="sector-content">
      <div className="sector-monitor"><p className="sector-label">{floor==='agents'?'AGENTES CADASTRÁVEIS':floor==='infra'?'FERRAMENTAS PREVISTAS':'COMPONENTES DO SETOR'}</p>
        {agents.length>0?<div className="sprite-grid">{agents.map(a=><div className="sprite-chip" key={a.label}>
          {(actorStates[a.id]??scene)!=='absent'&&<PixelAgent initials={a.initials} color={a.color} mood={actorStates[a.id]==='working'?'typing':actorStates[a.id]==='error'?'alert':actorStates[a.id]??mood} paused={paused||(actorStates[a.id]??scene)==='unknown'}/>}
          <strong>{a.label}</strong><small>Não verificado</small>
          {floor==='agents'&&<label className="agent-demo-label">DEMO individual<select aria-label={`DEMO individual ${a.label}`} value={actorStates[a.id]??''} onChange={e=>onDemoState(a.id,e.target.value as AgentVisualState)}><option value="" disabled>Cenário global</option><option value="unknown">Desconhecido</option><option value="absent">Ausente</option><option value="idle">Ocioso</option><option value="working">Trabalhando</option><option value="waiting">Aprovação</option><option value="error">Alerta</option></select></label>}
        </div>)}</div>:<div className="sector-list">{floorServices[floor].map(s=><div key={s}><span className="sector-led"/>{s}<small>não verificado</small></div>)}</div>}</div>
      <div className="sector-aside"><p className="sector-label">COMPORTAMENTO</p>
        <strong>{({active:'DEMO: trabalho ilustrativo',alert:'DEMO: alerta',waiting:'DEMO: aguardando aprovação',unknown:'Desconhecido / sem dados',absent:'DEMO: ausente',idle:'DEMO: repouso'})[scene]}</strong>
        <p>O movimento nesta prévia nunca confirma atividade ou conexão real. Quando a integração for criada, estados dependerão de eventos verificáveis.</p>
        <div className="floor-jump-row">{floorOrder.map(k=><button key={k} type="button" className={k===floor?'selected':''} onClick={()=>onChoose(k)} aria-label={`Inspecionar andar ${floors[k].number}`}>{floors[k].number}</button>)}</div>
      </div>
    </div>
  </section>;
}
