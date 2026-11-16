import { useMemo, useState } from 'react';
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
  const [scene,setScene] = useState<DemoScene>('idle');
  const [paused,setPaused] = useState(false);
  const snapshot = useMemo(()=>initialSnapshot,[]);
  const selectFloor = (floor: FloorKey) => {setSelected(floor);setZoomed(true)};
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-symbol">CW<span>✦</span></span><div className="brand-word"><strong>Cloud Workspace</strong><small>IA · CONTROL CENTER</small></div></div>
      <p className="side-label">ÁREA DE TRABALHO</p>
      <nav className="nav-items">{pages.map(p=><button key={p.id} type="button" className={`nav-item ${page===p.id?'active':''}`} onClick={()=>setPage(p.id)}><span className="nav-icon">{p.icon}</span>{p.label}</button>)}</nav>
      <div className="side-separator"/>
      <p className="side-label">SETORES · 05 ANDARES</p>
      <div className="floor-nav">{[...floorOrder].reverse().map(f => <button type="button" key={f} className={`floor-nav-item ${selected===f && page==='office'?'active':''}`} onClick={()=>{setPage('office');selectFloor(f)}}><span>{String(floors[f].number).padStart(2,'0')}</span>{floors[f].title}</button>)}</div>
      <div className="side-separator"/>
      <div className="workspace-box"><span className="workspace-box-icon">▱</span><div><strong>Projetos Code</strong><small>Google Drive · destino planejado</small></div></div>
      <div className="side-spacer"/>
      <div className="sidebar-bottom"><div className="offline-chip"><i/> Ambiente demonstrativo</div><p>Sem monitoramento real de Windows, MCP, GitHub ou Drive.</p></div>
      <div className="side-version">v0.4.0-alpha · FASE 1D</div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="breadcrumbs">CENTRAL / <strong>{pages.find(p=>p.id===page)?.label.toUpperCase()}</strong></div><div className="topbar-right"><span className="dot amber"/><span>Telemetria indisponível</span><span className="topbar-avatar">CW</span></div></header>
      <main className="main-content">
        {page==='office'? <>
          <div className="headline"><div><p className="overline">SEDE OPERACIONAL · CINCO ANDARES</p><h1>Cloud Workspace <em>IA.</em></h1><p className="subtitle">Explore a sede 16 bits e acompanhe seus setores em um único lugar.</p></div><span className="preview-badge">✦ PRÉVIA INTERATIVA · DEMO</span></div>
          <div className="summary-strip">
            <div className="summary-item"><span className="summary-icon teal">◷</span><div><small>Estado visual</small><strong>{scene==='active'?'Demo: trabalhando':scene==='alert'?'Demo: alerta':'Demo: repouso'}</strong></div></div>
            <div className="summary-item"><span className="summary-icon gold">▦</span><div><small>Agentes cadastrados</small><strong>{snapshot.agents.length} · não verificados</strong></div></div>
            <div className="summary-item"><span className="summary-icon blue">▥</span><div><small>Conexões reais</small><strong>Não verificadas</strong></div></div>
            <div className="summary-item"><span className="summary-icon purple">▱</span><div><small>Projetos no aplicativo</small><strong>0 importados</strong></div></div>
          </div>
          <section className="scene-panel">
            <div className="section-head"><div><p className="overline">PRÉDIO INTERATIVO DE CINCO ANDARES</p><h2>Sede Cloud Workspace <span className="subtle">/ pixel art 16 bits</span></h2></div><div className="scene-controls"><label htmlFor="scene-state">Simular</label><select id="scene-state" value={scene} onChange={e=>setScene(e.target.value as DemoScene)}><option value="idle">Repouso</option><option value="active">Trabalhando</option><option value="alert">Alerta</option></select><button className="motion-toggle" type="button" aria-pressed={paused} onClick={()=>setPaused(v=>!v)}>{paused?"▶ Retomar":"Ⅱ Pausar"}</button></div></div>
            <Office selected={selected} onSelect={selectFloor} scene={scene} zoomed={zoomed} onResetZoom={()=>setZoomed(false)} paused={paused}/>
            <div className="scene-footer"><span><span className="legend-dot green"/> evento confirmado no futuro</span><span><span className="legend-dot yellow"/> não verificado</span><span><span className="legend-dot red"/> falha demonstrada</span><span className="scene-note">{SCENE_COPY[scene]}</span></div>
          </section>
          <div className="bottom-grid">
            <FloorDetails floor={selected} scene={scene} paused={paused} onChoose={selectFloor}/>
            <section className="info-card"><div className="section-card-title"><div><p className="overline">CENTRAL DE EVENTOS</p><h3>Atividade recente</h3></div><span className="card-badge">◷</span></div><div className="event-row"><span className="event-dot amber"/><div><strong>Reprodução de cena 16 bits</strong><small>Sprites vetoriais: digitando, repouso e alerta; playback pausável</small></div><time>DEMO</time></div><div className="event-row"><span className="event-dot muted"/><div><strong>Integrações não habilitadas</strong><small>MCP local, ferramentas e telemetria serão validados posteriormente</small></div><time>PENDENTE</time></div><div className="event-row"><span className="event-dot muted"/><div><strong>Projeto salvo no Drive</strong><small>Não significa que o aplicativo esteja sincronizando em tempo real</small></div><time>DEFINIDO</time></div></section>
          </div>
        </>: <section className="placeholder-module"><div className="module-icon">{pages.find(p=>p.id===page)?.icon}</div><p className="overline">MÓDULO PLANEJADO · SEM OPERAÇÕES REAIS</p><h1>{pages.find(p=>p.id===page)?.label}</h1><p>{page==='projects'?'Projetos só serão migrados após inventário e aprovação individual.':page==='tests'?'Testes futuros executarão Playwright em navegador separado, sem controlar o mouse.':page==='connections'?'Conexões Drive, GitHub, Hostinger e MCP só aparecerão ativas após verificação real.':'KeePassXC será desbloqueado sob demanda e não compartilhará a senha mestra com agentes.'}</p><div className="module-cta">Em desenvolvimento · nenhuma integração acionada</div></section>}
      </main>
      <footer className="app-footer">CLOUD WORKSPACE IA · PRÉVIA DE INTERFACE <span>SEM TELEMETRIA REAL · ESTADOS DEMO</span></footer>
    </div>
  </div>;
}