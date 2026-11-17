import { useEffect, useRef, useState } from 'react';
import { floors, floorOrder, type FloorKey } from '../data/floors';
import { type DemoScene } from '../lib/scenePolicy';
import type { ActorStates } from '../scene/visualInputs';
import type { OfficeRenderer } from '../scene/OfficeRenderer';

type Props={selected:FloorKey;onSelect:(floor:FloorKey)=>void;scene:DemoScene;zoomed:boolean;onResetZoom:()=>void;paused:boolean;reduced:boolean;actorStates:ActorStates};
export default function Office(props:Props) {
  const host=useRef<HTMLDivElement>(null);
  const renderer=useRef<OfficeRenderer|null>(null);
  const current=useRef(props);current.current=props;
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    import('../scene/OfficeRenderer').then(async({OfficeRenderer})=>{
      if(cancelled||!host.current)return;
      const instance=new OfficeRenderer(host.current,current.current,f=>current.current.onSelect(f));
      renderer.current=instance;
      await instance.init();
      if(!cancelled){instance.update(current.current);setReady(true);}
    }).catch(e=>{
      if(cancelled)return;
      renderer.current?.destroy();renderer.current=null;
      setError('A cena WebGL não pôde iniciar. Os setores continuam acessíveis pelo painel.');
      console.error(e);
    });
    return()=>{cancelled=true;renderer.current?.destroy();renderer.current=null;};
  },[]);
  useEffect(()=>{if(ready)renderer.current?.update(props);},[props.selected,props.zoomed,props.scene,props.paused,props.reduced,props.actorStates,ready]);
  return <div className="office-stage pixi-stage" aria-label="Prédio demonstrativo de cinco andares em pixel art">
    <div ref={host} className="pixi-host" data-testid="office-renderer"/>
    {!ready&&!error&&<p className="scene-loading" role="status">Preparando escritório em pixel art…</p>}
    {error&&<p className="scene-error" role="alert">{error}</p>}
    <div className="scene-flag"><span className="scene-flag-dot"/> DEMO · SEM CONEXÕES REAIS</div>
    <div className="scene-location"><span>SEDE / VISÃO {props.zoomed?'DO SETOR':'GERAL'}</span><strong>{props.zoomed?floors[props.selected].title:'Um escritório. Cinco universos.'}</strong><small>Objetos independentes · PixiJS 8</small></div>
    <div className="scene-sector-buttons" aria-label="Selecionar andar">
      {[...floorOrder].reverse().map(f=><button type="button" key={f} aria-label={`Ampliar andar ${floors[f].number}: ${floors[f].title}`} aria-pressed={props.zoomed&&props.selected===f} onClick={()=>props.onSelect(f)}><span>{String(floors[f].number).padStart(2,'0')}</span><span>{floors[f].title}</span><b>↗</b></button>)}
    </div>
    {props.zoomed&&<button className="building-back" type="button" onClick={props.onResetZoom}>← Voltar ao prédio <kbd>Esc</kbd></button>}
    <div className="scene-caption" aria-live="polite">{props.paused?'Ⅱ Animações pausadas':props.reduced?'Movimento reduzido':props.scene==='unknown'?'? Telemetria desconhecida':'◌ Simulação visual em reprodução'}<span>Teclas 1–5: setores · Esc: visão geral</span></div>
  </div>;
}
