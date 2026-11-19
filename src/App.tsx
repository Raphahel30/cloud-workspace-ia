import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { AgentVisualState } from './core-contracts/agentState';
import Office from './components/Office';
import WorkstationProof from './components/WorkstationProof';
import FloorDetails from './components/FloorDetails';
import {
  AgentsScreen,
  IntegrationsScreen,
  ProjectsScreen,
  SecurityScreen,
  TestsLogsScreen,
  WorkspacesScreen,
} from './components/screens/OperationalScreens';
import {
  coreApi,
  type BootstrapResponse,
  type CoreOverviewResponse,
} from './lib/coreApiClient';
import { SCENE_COPY, type DemoScene } from './lib/scenePolicy';
import { floorOrder, floors, type FloorKey } from './data/floors';
import { initialSnapshot } from './data/demo';

const pages = [
  { id: 'office', icon: '◈', label: 'Escritório' },
  { id: 'projects', icon: '▤', label: 'Projetos' },
  { id: 'agents', icon: '◎', label: 'Agentes IA' },
  { id: 'workspaces', icon: '❐', label: 'Workspaces' },
  { id: 'connections', icon: '▦', label: 'Integrações' },
  { id: 'tests', icon: '▷', label: 'Testes e logs' },
  { id: 'security', icon: '◉', label: 'Segurança' },
] as const;
type Page = (typeof pages)[number]['id'];

export default function App() {
  const [page, setPage] = useState<Page>('office');
  const [selected, setSelected] = useState<FloorKey>('agents');
  const [zoomed, setZoomed] = useState(false);
  const [scene, setScene] = useState<DemoScene>('unknown');
  const [actorStates, setActorStates] = useState<Record<string, AgentVisualState>>({});
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [proofMode, setProofMode] = useState(
    () => new URLSearchParams(window.location.search).get('proof') === 'workstation',
  );
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [overview, setOverview] = useState<CoreOverviewResponse | null>(null);
  const [coreStatusText, setCoreStatusText] = useState('Conectando núcleo local...');

  const refreshCore = useCallback(async () => {
    try {
      const boot = await coreApi.bootstrap();
      setBootstrap(boot);
      const ov = await coreApi.getOverview();
      setOverview(ov);
      setCoreStatusText(
        `Núcleo SQLite ativo · PID ${boot.sidecar.pid} · ${ov.counts.projects} projeto(s) G:\\`,
      );
    } catch {
      setCoreStatusText('Núcleo offline · exibindo apenas cena local');
    }
  }, []);

  useEffect(() => {
    void refreshCore();
    const onVis = () => {
      if (!document.hidden) {
        void refreshCore();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshCore]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  const previousZoom = useRef(false);
  useLayoutEffect(() => {
    if (previousZoom.current && !zoomed) {
      document
        .querySelectorAll<HTMLButtonElement>('.scene-sector-buttons button')
        [4 - floorOrder.indexOf(selected)]?.focus();
    }
    previousZoom.current = zoomed;
  }, [zoomed, selected]);

  const resetZoom = () => setZoomed(false);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        page !== 'office' ||
        (event.target instanceof HTMLElement && event.target.closest('select,input,textarea'))
      ) {
        return;
      }
      if (event.key === 'Escape' && zoomed) {
        event.preventDefault();
        resetZoom();
      }
      const index = Number(event.key) - 1;
      if (index >= 0 && index < 5) {
        event.preventDefault();
        setSelected(floorOrder[index]);
        setZoomed(true);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [page, selected, zoomed]);

  const snapshot = useMemo(() => initialSnapshot, []);
  const selectFloor = (floor: FloorKey) => {
    setSelected(floor);
    setZoomed(true);
  };

  const handleRestartSidecar = async () => {
    await coreApi.restartSidecar();
    await refreshCore();
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-symbol">
            CW<span>✦</span>
          </span>
          <div className="brand-word">
            <strong>Cloud Workspace</strong>
            <small>IA · CONTROL CENTER</small>
          </div>
        </div>
        <p className="side-label">ÁREA DE TRABALHO</p>
        <nav className="nav-items" aria-label="Navegação operacional">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-label={p.label}
              className={`nav-item ${page === p.id ? 'active' : ''}`}
              onClick={() => setPage(p.id)}
            >
              <span className="nav-icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>
        <div className="side-separator" />
        <p className="side-label">SETORES · 05 ANDARES</p>
        <div className="floor-nav">
          {[...floorOrder].reverse().map((f) => (
            <button
              type="button"
              key={f}
              className={`floor-nav-item ${selected === f && page === 'office' ? 'active' : ''}`}
              onClick={() => {
                setPage('office');
                selectFloor(f);
              }}
            >
              <span>{String(floors[f].number).padStart(2, '0')}</span>
              {floors[f].title}
            </button>
          ))}
        </div>
        <div className="side-separator" />
        <div className="workspace-box">
          <span className="workspace-box-icon">▱</span>
          <div>
            <strong>Projetos Code</strong>
            <small>
              {overview?.hardware.driveConnected
                ? `Drive G:\\ ativo · ${overview.counts.projects} projeto(s)`
                : 'Google Drive G:\\ streaming'}
            </small>
          </div>
        </div>
        <div className="side-spacer" />
        <div className="sidebar-bottom">
          <div className={overview ? 'offline-chip is-online' : 'offline-chip'}>
            <i /> {overview ? 'Núcleo Windows ativo' : 'Verificando núcleo'}
          </div>
          <p>{coreStatusText}</p>
        </div>
        <div className="side-version">
          v0.5.0-win · {bootstrap?.tauriDesktop ? 'TAURI SEA' : 'CORE + PIXIJS 8'}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumbs">
            CENTRAL / <strong>{pages.find((p) => p.id === page)?.label.toUpperCase()}</strong>
          </div>
          <div className="topbar-right">
            <span className={`dot ${overview ? 'teal' : 'amber'}`} />
            <span>
              {overview
                ? `SQLite WAL · ${overview.hardware.ssdFreeGb} GB SSD livre`
                : 'Conectando núcleo...'}
            </span>
            <span className="topbar-avatar">CW</span>
          </div>
        </header>

        <main className="main-content">
          {page === 'office' ? (
            proofMode ? (
              <WorkstationProof onBackToBuilding={() => setProofMode(false)} />
            ) : (
              <>
                <div className="headline">
                  <div>
                    <p className="overline">SEDE OPERACIONAL · NÚCLEO WINDOWS & PRÉDIO 16 BITS</p>
                    <h1>
                      Cloud Workspace <em>IA.</em>
                    </h1>
                    <p className="subtitle">
                      Centro operacional padronizado para Drive G:\, MCP local e workspaces. A cena pixel art permanece preservada e congelada para acabamento final.
                    </p>
                  </div>
                  <div className="headline-badges">
                    <button
                      type="button"
                      className="proof-launch-btn"
                      data-testid="open-workstation-proof"
                      onClick={() => setProofMode(true)}
                    >
                      ★ Prova Artística · 1 Estação R03_02
                    </button>
                    <span className="preview-badge">
                      ✦ {overview ? `CORE PID ${overview.hardware.sidecarPid}` : 'DEMO VISUAL'}
                    </span>
                  </div>
                </div>

                <div className="summary-strip">
                  <div className="summary-item">
                    <span className="summary-icon teal">◷</span>
                    <div>
                      <small>Simulador da cena 5 andares</small>
                      <strong>
                        {
                          {
                            active: 'DEMO: trabalhando',
                            alert: 'DEMO: alerta',
                            idle: 'DEMO: repouso',
                            waiting: 'DEMO: aprovação',
                            absent: 'DEMO: ausente',
                            unknown: 'Desconhecido',
                          }[scene]
                        }
                      </strong>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon gold">▦</span>
                    <div>
                      <small>Agentes IA (evidência real)</small>
                      <strong>
                        {overview
                          ? `${overview.counts.agentsRegistered} cadastrados · ${overview.counts.agentsVerifiedActive} ativos`
                          : `${snapshot.agents.length} · não verificados`}
                      </strong>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon blue">▥</span>
                    <div>
                      <small>Projetos em G:\ (somente leitura)</small>
                      <strong>
                        {overview
                          ? `${overview.counts.projects} projeto(s) · ${overview.counts.backups} backups`
                          : 'Consultando Drive...'}
                      </strong>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon purple">▱</span>
                    <div>
                      <small>Workspaces / Hardware</small>
                      <strong>
                        {overview
                          ? `${overview.counts.workspaces} área(s) · ${overview.hardware.freeRamGb} GB RAM livre`
                          : 'Aguardando núcleo'}
                      </strong>
                    </div>
                  </div>
                </div>

                <section className="scene-panel">
                  <div className="section-head">
                    <div>
                      <p className="overline">PRÉDIO INTERATIVO DE CINCO ANDARES (PRESERVADO · ETAPA 8)</p>
                      <h2>
                        Sede Cloud Workspace <span className="subtle">/ pixel art 16 bits</span>
                      </h2>
                    </div>
                    <div className="scene-controls">
                      <label htmlFor="scene-state">Simular</label>
                      <select
                        id="scene-state"
                        value={scene}
                        onChange={(e) => {
                          setScene(e.target.value as DemoScene);
                          setActorStates({});
                        }}
                      >
                        <option value="unknown">Desconhecido</option>
                        <option value="absent">DEMO · Ausente</option>
                        <option value="waiting">DEMO · Aprovação</option>
                        <option value="idle">DEMO · Repouso</option>
                        <option value="active">DEMO · Trabalhando</option>
                        <option value="alert">DEMO · Alerta</option>
                      </select>
                      <button
                        className="motion-toggle"
                        type="button"
                        aria-pressed={paused}
                        onClick={() => setPaused((v) => !v)}
                      >
                        {paused ? '▶ Retomar' : 'Ⅱ Pausar'}
                      </button>
                      <button
                        className="motion-toggle reduced-toggle"
                        type="button"
                        aria-pressed={reduced}
                        onClick={() => setReduced((v) => !v)}
                      >
                        Movimento reduzido
                      </button>
                    </div>
                  </div>
                  <Office
                    selected={selected}
                    onSelect={selectFloor}
                    scene={scene}
                    zoomed={zoomed}
                    onResetZoom={resetZoom}
                    paused={paused}
                    reduced={reduced}
                    actorStates={actorStates}
                  />
                  <div className="scene-footer">
                    <span>
                      <span className="legend-dot green" /> evento confirmado no futuro
                    </span>
                    <span>
                      <span className="legend-dot yellow" /> não verificado / DEMO
                    </span>
                    <span>
                      <span className="legend-dot red" /> falha demonstrada
                    </span>
                    <span className="scene-note">{SCENE_COPY[scene]}</span>
                  </div>
                </section>

                <div className="bottom-grid">
                  <FloorDetails
                    floor={selected}
                    scene={scene}
                    paused={paused || reduced}
                    onChoose={selectFloor}
                    actorStates={actorStates}
                    onDemoState={(id, state) =>
                      setActorStates((current) => ({ ...current, [id]: state }))
                    }
                  />
                  <section className="info-card">
                    <div className="section-card-title">
                      <div>
                        <p className="overline">AUDITORIA DO NÚCLEO LOCAL & PRESERVAÇÃO ETAPA 8</p>
                        <h3>Eventos recentes (SQLite)</h3>
                      </div>
                      <span className="card-badge">◷</span>
                    </div>
                    {(overview?.recentAudit ?? []).slice(0, 3).map((ev, idx) => (
                      <div className="event-row" key={`${ev.id ?? idx}`}>
                        <span className={`event-dot ${ev.status === 'ok' ? 'teal' : 'amber'}`} />
                        <div>
                          <strong>
                            {ev.action} · {ev.subject}
                          </strong>
                          <small>{ev.safeDetails}</small>
                        </div>
                        <time>{ev.status.toUpperCase()}</time>
                      </div>
                    ))}
                    <div className="event-row">
                      <span className="event-dot muted" />
                      <div>
                        <strong>Pixel art congelada para acabamento final (Etapa 8)</strong>
                        <small>
                          Prédio 5 andares e prova do Andar 03 preservados; ajustes de pose, mãos, mobília e oclusão ocorrerão com dados reais dos agentes.
                        </small>
                      </div>
                      <time>ETAPA 8</time>
                    </div>
                  </section>
                </div>
              </>
            )
          ) : page === 'projects' ? (
            <ProjectsScreen overview={overview} />
          ) : page === 'agents' ? (
            <AgentsScreen onUpdated={() => void refreshCore()} />
          ) : page === 'workspaces' ? (
            <WorkspacesScreen onUpdated={() => void refreshCore()} />
          ) : page === 'connections' ? (
            <IntegrationsScreen />
          ) : page === 'tests' ? (
            <TestsLogsScreen overview={overview} />
          ) : (
            <SecurityScreen bootstrap={bootstrap} onRestartSidecar={handleRestartSidecar} />
          )}
        </main>
        <footer className="app-footer">
          CLOUD WORKSPACE IA · CENTRAL OPERACIONAL WINDOWS{' '}
          <span>
            {overview
              ? `SIDECAR PID ${overview.hardware.sidecarPid} · ${overview.hardware.cpuModel}`
              : 'CONECTANDO NÚCLEO'}
          </span>
        </footer>
      </div>
    </div>
  );
}
