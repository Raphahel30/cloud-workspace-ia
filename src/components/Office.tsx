import { useEffect, useState, type CSSProperties } from 'react';
import { floors, floorOrder, type FloorKey } from '../data/floors';
import { type DemoScene } from '../lib/scenePolicy';

/** This view contains only project-owned SVGs, never arbitrary uploaded SVG or remote HTML.
 * By embedding the bundled vector scene, we can independently pause character/LED animations
 * and apply floor-specific effects. This is a prototype ahead of a true sprite atlas/PixiJS renderer.
 */
export default function Office({selected,onSelect,scene,zoomed,onResetZoom,paused}:{
  selected:FloorKey;
  onSelect:(floor:FloorKey)=>void;
  scene:DemoScene;
  zoomed:boolean;
  onResetZoom:()=>void;
  paused:boolean;
}) {
  const [markup,setMarkup] = useState('');
  useEffect(()=>{
    let cancelled=false;
    const url=`/building-${scene}.svg`;
    fetch(url).then(res=>{
      if(!res.ok) throw new Error('Falha ao carregar cenário local');
      return res.text();
    }).then(svg=>{if(!cancelled && svg.startsWith('<svg'))setMarkup(svg);})
      .catch(()=>{if(!cancelled)setMarkup('');});
    return ()=>{cancelled=true};
  },[scene]);
  return <div className={`office-stage building-stage ${zoomed?'zoomed':''} ${paused?'animation-paused':''}`}
    style={{'--focus-y':floors[selected].focusY} as CSSProperties}
    aria-label="Prédio demonstrativo de cinco andares em pixel art">
      {markup?<div className="office-art building-art inline-building" dangerouslySetInnerHTML={{__html:markup}}/>:
        <img className="office-art building-art" src={`/building-${scene}.svg`}
           alt="Prédio de cinco andares: recepção, chefe, funcionários IA, MCP e servidores" draggable={false}/>}
      {!zoomed && floorOrder.map(f=><button key={f} type="button"
        className={`building-hotspot floor-${f} ${selected===f?'is-selected':''}`}
        onClick={()=>onSelect(f)}
        aria-label={`Ampliar andar ${floors[f].number}: ${floors[f].title}`}
        title={`Andar ${floors[f].number} — ${floors[f].title}`}/>) }
      {zoomed && <button className="building-back" type="button" onClick={onResetZoom}>← Voltar ao prédio</button>}
      {zoomed && <div className="building-focused">ANDAR {String(floors[selected].number).padStart(2,'0')} — {floors[selected].title}</div>}
      <div className="scene-flag"><span className="scene-flag-dot"/> DEMONSTRAÇÃO · SEM DADOS REAIS</div>
    </div>;
}