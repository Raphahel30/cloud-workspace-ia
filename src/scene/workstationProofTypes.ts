export type ProofAnimationMode = 'cycle' | 'walk' | 'sit' | 'type' | 'stand';
export type ProofPoseName = 'walk' | 'sit' | 'type' | 'stand';
export type ProofCameraView = 'station-zoom' | 'floor03-full';

export type ProofLayerKey =
  | 'wall'
  | 'floor'
  | 'wallDecor'
  | 'rug'
  | 'plant'
  | 'chairBack'
  | 'seatShadow'
  | 'character'
  | 'chairArmFront'
  | 'desk'
  | 'keyboard'
  | 'characterForearms'
  | 'accessories'
  | 'monitor'
  | 'lamp'
  | 'lighting';

export const PROOF_LAYER_KEYS: ReadonlyArray<{ key: ProofLayerKey; label: string }> = [
  { key: 'wall', label: 'Parede Ripada / Janela' },
  { key: 'floor', label: 'Piso Quadriculado' },
  { key: 'wallDecor', label: 'Hologramas / Plantas / Elevador' },
  { key: 'rug', label: 'Tapetes' },
  { key: 'plant', label: 'Plantas & Floreiras' },
  { key: 'chairBack', label: 'Cadeira (Encosto & Assento)' },
  { key: 'seatShadow', label: 'Sombra de Assento (Contato)' },
  { key: 'character', label: 'Personagens (Corpo Sentado)' },
  { key: 'chairArmFront', label: 'Braço Frontal da Cadeira (Oclusão)' },
  { key: 'desk', label: 'Mesas c/ Gavetas' },
  { key: 'keyboard', label: 'Teclados & Mouse' },
  { key: 'characterForearms', label: 'Antebraços / Mãos (Sobre Mesa)' },
  { key: 'accessories', label: 'Livros, Canecas, Tablet, Lápis' },
  { key: 'monitor', label: 'Monitores (Costas 3/4)' },
  { key: 'lamp', label: 'Luminárias Teto / Spots' },
  { key: 'lighting', label: 'Iluminação Volumétrica' },
];

export interface WorkstationProofView {
  camera: ProofCameraView;
  mode: ProofAnimationMode;
  paused: boolean;
  visibleLayers: Record<ProofLayerKey, boolean>;
}
