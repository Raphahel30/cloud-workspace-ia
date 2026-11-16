import { useEffect, useMemo, useState } from 'react';
import type { AgentVisualState } from './core-contracts/agentState';
import Office from './components/Office';
import FloorDetails from './components/FloorDetails';
import { SCENE_COPY, type DemoScene } from './lib/scenePolicy';
import { floorOrder, floors, type FloorKey } from './data/floors';
import { initialSnapshot } from './data/demo';

const pages = [
  {id:'office',icon:'◈',label:'Escritório'},
  {id:'projects',icon:'▤',label:'Projetos'},
  {id:'tests',icon:'▷',label:'Laboratório'},
  {id:'connections',icon:'▦',label:'Conexões'},
  {id:'security',icon:'◉',label:'Cofre seguro'},
] as const;
type Page = (typeof pages)[number]['id'];


export default function App() {
  const [page,setPage] = useState<Page>('office');
  const [selected,setSelected] = useState<FloorKey>('agents');
  const [zoomed,setZoomed] = useState(false);
  const [scene,setScene] = useState<DemoScene>('unknown');
  const [actorStates,setActorStates] = useState<Record<string,AgentVisualState>>({});
  const [paused,setPaused] = useState(false);
  const [reduced,setReduced] = useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
  const resetZoom=()=>{setZoomed(false);requestAnimationFrame(()=>document.querySelectorAll<HTMLButtonElement>('.scene-sector-buttons button')[4-floorOrder.indexOf(selected)]?.focus());};
  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(page!=='office'||(event.target instanceof HTMLElement&&event.target.closest('select,input,textarea')))return;
      if(event.key==='Escape'&&zoomed){event.preventDefault();resetZoom();}
      const index=Number(event.key)-1;
      if(index>=0&&index<5){event.preventDefault();setSelected(floorOrder[index]);setZoomed(true);}
    };
    window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[page,selected,zoomed]);
  const snapshot = useMemo(()=>initialSnapshot,[]);
  const selectFloor = (floor: FloorKey) => {setSelected(floor);setZoomed(true)};
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol">CW<span>✦</span></span><div className="brand-word"><strong>Cloud Workspace</strong><small>IA · CONTROL CENTER</small></div></div>
      <p className="side-label">ÁREA DE TRABALHO</p>
      <nav className="nav-items">{pages.map(p=><button key={p.id} type="button" aria-label={p.label} className={`nav-item ${page===p.id?'active':''}`} onClick={()=>setPage(p.id)}><span className="nav-icon">{p.icon}</span>{p.label}</button>)}</nav>
      <div className="side-separator"/>
      <p className="side-label">SETORES · 05 ANDARES</p>
      <div className="floor-nav">{[...floorOrder].reverse().map(f => <button type="button" key={f} className={`floor-nav-item ${selected===f && page==='office'?'active':''}`} onClick={()=>{setPage('office');selectFloor(f)}}><span>{String(floors[f].number).padStart(2,'0')}</span>{floors[f].title}</button>)}</div>
      <div className="side-separator"/>
      <div className="workspace-box"><span className="workspace-box-icon">▱</span><div><strong>Projetos Code</strong><small>Google Drive · destino planejado</small></div></div>
      <div className="side-spacer"/>
      <div className="sidebar-bottom"><div className="offline-chip"><i/> Ambiente demonstrativo</div><p>Sem monitoramento real de Windows, MCP, GitHub ou Drive.</p></div>
      <div className="side-version">v0.4.0-alpha · CENA PIXIJS 8</div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="breadcrumbs">CENTRAL / <strong>{pages.find(p=>p.id===page)?.label.toUpperCase()}</strong></div><div className="topbar-right"><span className="dot amber"/><span>DEMO · Telemetria indisponível</span><span className="topbar-avatar">CW</span></div></header>
      <main className="main-content">
        {page==='office'? <>
          <div className="headline"><div><p className="overline">SEDE OPERACIONAL · CINCO ANDARES</p><h1>Cloud Workspace <em>IA.</em></h1><p className="subtitle">Explore a sede 16 bits e acompanhe seus setores em um único lugar.</p></div><span className="preview-badge">✦ PRÉVIA INTERATIVA · DEMO</span></div>
          <div className="summary-strip">
            <div className="summary-item"><span className="summary-icon teal">◷</span><div><small>Cenário global</small><strong>{({active:'DEMO: trabalhando',alert:'DEMO: alerta',idle:'DEMO: repouso',waiting:'DEMO: aprovação',absent:'DEMO: ausente',unknown:'Desconhecido'})[scene]}</strong></div></div>
            <div className="summary-item"><span className="summary-icon gold">▦</span><div><small>Agentes cadastrados</small><strong>{snapshot.agents.length} · não verificados</strong></div></div>
            <div className="summary-item"><span className="summary-icon blue">▥</span><div><small>Conexões reais</small><strong>Não verificadas</strong></div></div>
            <div className="summary-item"><span className="summary-icon purple">▱</span><div><small>Projetos no aplicativo</small><strong>0 importados</strong></div></div>
          </div>
          <section className="scene-panel">
            <div className="section-head"><div><p className="overline">PRÉDIO INTERATIVO DE CINCO ANDARES</p><h2>Sede Cloud Workspace <span className="subtle">/ pixel art 16 bits</span></h2></div><div className="scene-controls"><label htmlFor="scene-state">Simular</label><select id="scene-state" value={scene} onChange={e=>{setScene(e.target.value as DemoScene);setActorStates({});}}><option value="unknown">Desconhecido</option><option value="absent">DEMO · Ausente</option><option value="waiting">DEMO · Aprovação</option><option value="idle">DEMO · Repouso</option><option value="active">DEMO · Trabalhando</option><option value="alert">DEMO · Alerta</option></select><button className="motion-toggle" type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?"▶ Retomar":"Ⅱ Pausar"}</button><button className="motion-toggle reduced-toggle" type="button" aria-pressed={reduced} onClick={()=>setReduced(v=>!v)}>Movimento reduzido</button></div></div>
            <Office selected={selected} onSelect={selectFloor} scene={scene} zoomed={zoomed} onResetZoom={resetZoom} paused={paused} reduced={reduced} actorStates={actorStates}/>
            <div className="scene-footer"><span><span className="legend-dot green"/> evento confirmado no futuro</span><span><span className="legend-dot yellow"/> não verificado</span><span><span className="legend-dot red"/> falha demonstrada</span><span className="scene-note">{SCENE_COPY[scene]}</span></div>
          </section>
          <div className="bottom-grid">
            <FloorDetails floor={selected} scene={scene} paused={paused||reduced} onChoose={selectFloor} actorStates={actorStates} onDemoState={(id,state)=>setActorStates(current=>({...current,[id]:state}))}/>
            <section className="info-card"><div className="section-card-title"><div><p className="overline">CENTRAL DE EVENTOS</p><h3>Atividade recente</h3></div><span className="card-badge">◷</span></div><div className="event-row"><span className="event-dot amber"/><div><strong>Reprodução de cena 16 bits</strong><small>Atlas original: caminhada, digitação, espera e alerta; reprodução pausável</small></div><time>DEMO</time></div><div className="event-row"><span className="event-dot muted"/><div><strong>Integrações não habilitadas</strong><small>MCP local, ferramentas e telemetria serão validados posteriormente</small></div><time>PENDENTE</time></div><div className="event-row"><span className="event-dot muted"/><div><strong>Drive previsto no planejamento</strong><small>Nenhum armazenamento externo conectado nesta interface</small></div><time>DEFINIDO</time></div></section>
          </div>
        </>: <section className="placeholder-module"><div className="module-icon">{pages.find(p=>p.id===page)?.icon}</div><p className="overline">MÓDULO PLANEJADO · SEM OPERAÇÕES REAIS</p><h1>{pages.find(p=>p.id===page)?.label}</h1><p>{page==='projects'?'Projetos só serão migrados após inventário e aprovação individual.':page==='tests'?'Testes futuros executarão Playwright em navegador separado, sem controlar o mouse.':page==='connections'?'Conexões Drive, GitHub, Hostinger e MCP só aparecerão ativas após verificação real.':'KeePassXC será desbloqueado sob demanda e não compartilhará a senha mestra com agentes.'}</p><div className="module-cta">Em desenvolvimento · nenhuma integração acionada</div></section>}
      </main>
      <footer className="app-footer">CLOUD WORKSPACE IA · PRÉVIA DE INTERFACE <span>SEM TELEMETRIA REAL · ESTADOS DEMO</span></footer>
    </div>
  </div>;
}