import { useEffect, useRef, useState } from 'react';
import {
  PROOF_LAYER_KEYS,
  type ProofAnimationMode,
  type ProofLayerKey,
} from '../scene/workstationProofTypes';
import type { WorkstationProofRenderer } from '../scene/WorkstationProofRenderer';

const DEFAULT_LAYERS: Record<ProofLayerKey, boolean> = {
  wall: true,
  floor: true,
  rug: true,
  plant: true,
  chair: true,
  character: true,
  desk: true,
  keyboard: true,
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
  const [mode, setMode] = useState<ProofAnimationMode>('type');
  const [paused, setPaused] = useState(false);
  const [visibleLayers, setVisibleLayers] = useState<Record<ProofLayerKey, boolean>>(DEFAULT_LAYERS);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const viewRef = useRef({ mode, paused, visibleLayers });
  viewRef.current = { mode, paused, visibleLayers };

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
      rendererRef.current?.update({ mode, paused, visibleLayers });
    }
  }, [mode, paused, visibleLayers, ready]);

  const toggleLayer = (key: ProofLayerKey) => {
    setVisibleLayers((curr) => ({ ...curr, [key]: !curr[key] }));
  };

  return (
    <section className="proof-panel" aria-label="Prova artística de uma estação completa estilo R03_02">
      <div className="proof-header">
        <div>
          <p className="overline">PROVA ARTÍSTICA ISOLADA · DIREÇÃO R03_02 (PIXEL ART 16 BITS)</p>
          <h2>
            Estação 01 — 12 Camadas RGBA Independentes <span className="subtle">/ PixiJS 8</span>
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
          <div
            ref={hostRef}
            className="proof-pixi-host"
            data-testid="workstation-proof-renderer"
          />
          {!ready && !error && <p className="scene-loading">Carregando 12 sprites RGBA em camadas…</p>}
          {error && <p className="scene-error">{error}</p>}
          <div className="scene-flag">
            <span className="scene-flag-dot" /> PROVA 1 ESTAÇÃO · SPRITES SEPARADOS
          </div>
        </div>

        <aside className="proof-layers-panel" aria-label="Inspeção individual de camadas">
          <p className="sector-label">CAMADAS INDEPENDENTES ({PROOF_LAYER_KEYS.filter((l) => visibleLayers[l.key]).length}/12 ATIVAS)</p>
          <p className="proof-layers-hint">
            Ligue ou desligue qualquer sprite em tempo real para comprovar que nenhuma pintura estática é usada como fundo.
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
