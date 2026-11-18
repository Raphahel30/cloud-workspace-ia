export type ProofAnimationMode = 'cycle' | 'walk' | 'sit' | 'type' | 'stand';
export type ProofPoseName = 'walk' | 'sit' | 'type' | 'stand';

export type ProofLayerKey =
  | 'wall'
  | 'floor'
  | 'rug'
  | 'plant'
  | 'chair'
  | 'character'
  | 'desk'
  | 'keyboard'
  | 'accessories'
  | 'monitor'
  | 'lamp'
  | 'lighting';

export const PROOF_LAYER_KEYS: ReadonlyArray<{ key: ProofLayerKey; label: string }> = [
  { key: 'wall', label: 'Parede / Janela' },
  { key: 'floor', label: 'Piso Quadriculado' },
  { key: 'rug', label: 'Tapete' },
  { key: 'plant', label: 'Planta' },
  { key: 'chair', label: 'Cadeira' },
  { key: 'character', label: 'Personagem R03_02' },
  { key: 'desk', label: 'Mesa c/ Gavetas' },
  { key: 'keyboard', label: 'Teclado & Mouse' },
  { key: 'accessories', label: 'Livro & Caneca' },
  { key: 'monitor', label: 'Monitor (Costas 3/4)' },
  { key: 'lamp', label: 'Luminária Teto' },
  { key: 'lighting', label: 'Luz Volumétrica' },
];

export interface WorkstationProofView {
  mode: ProofAnimationMode;
  paused: boolean;
  visibleLayers: Record<ProofLayerKey, boolean>;
}
