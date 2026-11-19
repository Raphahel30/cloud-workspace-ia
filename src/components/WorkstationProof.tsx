import { useEffect, useRef, useState } from 'react';
import {
  PROOF_LAYER_KEYS,
  type ProofAnimationMode,
  type ProofCameraView,
  type ProofLayerKey,
} from '../scene/workstationProofTypes';
import type { WorkstationProofRenderer } from '../scene/WorkstationProofRenderer';

const DEFAULT_LAYERS: Record<ProofLayerKey, boolean> = {
  wall: true,
  floor: true,
  wallDecor: true,
  rug: true,
  plant: true,
  chairBack: true,
  seatShadow: true,
  character: true,
  chairArmFront: true,
  desk: true,
  keyboard: true,
  characterForearms: true,
  accessories: true,
  monitor: true,
  lamp: true,
  lighting: true,
};

const MODE_BUTTONS: Array<{ mode: ProofAnimationMode; label: string }> = [
  { mode: 'cycle', label: 'Ciclo Completo (Auto)' },
  { mode: 'walk', label: '1. Caminhar (walk)' },
  { mode: 'sit', label: '2. Sentar (sit)' },
  { mode: 'type', label: '3. Digitar (type)' },
  { mode: 'stand', label: '4. Levantar (stand)' },
];

export default function WorkstationProof(props: { onBackToBuilding?: () => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WorkstationProofRenderer | null>(null);
  const [camera, setCamera] = useState<ProofCameraView>(() =>
    new URLSearchParams(window.location.search).get('view') === 'floor03' ? 'floor03-full' : 'station-zoom',
  );
  const [mode, setMode] = useState<ProofAnimationMode>('type');
  const [paused, setPaused] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<ProofLayerKey, boolean>>(DEFAULT_LAYERS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const viewRef = useRef({ camera, mode, paused, visibleLayers });
  viewRef.current = { camera, mode, paused, visibleLayers };

  useEffect(() => {
    let cancelled = false;
    import('../scene/WorkstationProofRenderer')
      .then(async ({ WorkstationProofRenderer }) => {
        if (cancelled || !hostRef.current) return;
        const instance = new WorkstationProofRenderer(hostRef.current, viewRef.current);
        rendererRef.current = instance;
        await instance.init();
        if (!cancelled) {
          instance.update(viewRef.current);
          setReady(true);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        rendererRef.current?.destroy();
        rendererRef.current = null;
        setError('Falha ao carregar os sprites RGBA da prova artística em PixiJS 8.');
        console.error(err);
      });

    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (ready) {
      rendererRef.current?.update({ camera, mode, paused, visibleLayers });
    }
  }, [camera, mode, paused, visibleLayers, ready]);

  const toggleLayer = (key: ProofLayerKey) => {
    setVisibleLayers((curr) => ({ ...curr, [key]: !curr[key] }));
  };

  return (
    <section className="proof-panel" aria-label="Prova artística de encaixe sentado e biblioteca expandida R03_02">
      <div className="proof-header">
        <div>
          <p className="overline">PROVA ARTÍSTICA R03_02 · ENCAIXE NA CADEIRA &amp; BIBLIOTECA MODULAR (38 ASSETS RGBA)</p>
          <h2>
            {camera === 'floor03-full'
              ? 'Andar 03 Completo — 4 Estações, Robô IA & Decoração Modular'
              : 'Estação 01 — Oclusão em Cadeira + 16 Camadas Independentes'}{' '}
            <span className="subtle">/ PixiJS 8</span>
          </h2>
        </div>
        <div className="proof-header-actions">
          <button
            type="button"
            className="motion-toggle"
            data-testid="proof-pause-toggle"
            aria-pressed={paused}
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? '▶ Retomar' : 'Ⅱ Pausar'}
          </button>
          {props.onBackToBuilding && (
            <button type="button" className="view-all" onClick={props.onBackToBuilding}>
              ← Voltar ao prédio demonstrativo
            </button>
          )}
        </div>
      </div>

      <div className="proof-controls-bar">
        <div className="proof-camera-group" role="group" aria-label="Alternar câmera da prova">
          <button
            type="button"
            data-testid="proof-camera-station"
            className={`proof-mode-btn ${camera === 'station-zoom' ? 'active' : ''}`}
            aria-pressed={camera === 'station-zoom'}
            onClick={() => setCamera('station-zoom')}
          >
            Zoom Estação 01 (Encaixe)
          </button>
          <button
            type="button"
            data-testid="proof-camera-floor03"
            className={`proof-mode-btn ${camera === 'floor03-full' ? 'active' : ''}`}
            aria-pressed={camera === 'floor03-full'}
            onClick={() => setCamera('floor03-full')}
          >
            Andar 03 Completo (4 Estações)
          </button>
        </div>

        <div className="proof-mode-group" role="group" aria-label="Estados de animação da estação">
          {MODE_BUTTONS.map((btn) => (
            <button
              key={btn.mode}
              type="button"
              data-testid={`proof-mode-${btn.mode}`}
              className={`proof-mode-btn ${mode === btn.mode ? 'active' : ''}`}
              aria-pressed={mode === btn.mode}
              onClick={() => setMode(btn.mode)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="proof-grid">
        <div className="proof-stage-wrap">
          <div ref={hostRef} className="proof-pixi-host" data-testid="workstation-proof-renderer" />
          {!ready && !error && <p className="scene-loading">Carregando 38 assets RGBA em camadas…</p>}
          {error && <p className="scene-error">{error}</p>}
          <div className="scene-flag">
            <span className="scene-flag-dot" />{' '}
            {camera === 'floor03-full'
              ? 'ANDAR 03 · 38 ASSETS MODULARES'
              : 'ENCAIXE SENTADO · OCLUSÃO CADEIRA + MESA'}
          </div>
        </div>

        <aside className="proof-layers-panel" aria-label="Inspeção individual de camadas">
          <p className="sector-label">
            CAMADAS INDEPENDENTES ({PROOF_LAYER_KEYS.filter((l) => visibleLayers[l.key]).length}/16 ATIVAS)
          </p>
          <p className="proof-layers-hint">
            Desligue a mesa, a parede ou o braço frontal da cadeira para comprovar o apoio real do quadril sobre o assento e os 38 sprites separados.
          </p>
          <div className="proof-layer-list">
            {PROOF_LAYER_KEYS.map(({ key, label }) => (
              <label key={key} className="proof-layer-item">
                <input
                  type="checkbox"
                  data-testid={`toggle-layer-${key}`}
                  checked={visibleLayers[key]}
                  onChange={() => toggleLayer(key)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <div className="proof-layer-actions">
            <button
              type="button"
              className="view-all"
              onClick={() => setVisibleLayers({ ...DEFAULT_LAYERS })}
            >
              Mostrar todas as camadas
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
