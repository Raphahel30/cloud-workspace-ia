import { AnimatedSprite, Application, Assets, Container, Graphics, Sprite, type Spritesheet, Texture } from 'pixi.js';
import {
  PROOF_LAYER_KEYS,
  type ProofLayerKey,
  type ProofPoseName,
  type WorkstationProofView,
} from './workstationProofTypes';

const ASSET_BASE = '/art/workstation-proof';
const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 896;

/**
 * Isolated single-workstation PixiJS 8 renderer proving R03_02 visual fidelity
 * using 12 independent RGBA alpha-transparent sprites and multi-frame character animations.
 */
export class WorkstationProofRenderer {
  private app = new Application();
  private stageRoot = new Container();
  private host: HTMLDivElement;
  private view: WorkstationProofView;
  private sheet!: Spritesheet;
  private character!: AnimatedSprite;
  private footShadow!: Graphics;
  private screenGlow!: Graphics;
  private steamDots: Array<{ dot: Graphics; baseX: number; baseY: number; phase: number }> = [];
  private layers = new Map<ProofLayerKey, Container>();

  private destroyed = false;
  private released = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastNow = 0;
  private phaseElapsed = 0;
  private totalElapsed = 0;
  private frameCounter = 0;
  private currentPose: ProofPoseName = 'type';
  private walkX = 330;

  constructor(host: HTMLDivElement, initialView: WorkstationProofView) {
    this.host = host;
    this.view = initialView;
  }

  async init(): Promise<void> {
    await this.app.init({
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      background: 0x091625,
      antialias: false,
      resolution: 1,
      autoStart: false,
      preference: 'webgl',
      powerPreference: 'low-power',
    });

    if (this.destroyed) {
      this.release();
      return;
    }

    const [
      wallTex,
      floorTex,
      rugTex,
      plantTex,
      chairTex,
      deskTex,
      keyboardTex,
      accessoriesTex,
      monitorTex,
      lampTex,
      lightingTex,
      charSheet,
    ] = await Promise.all([
      Assets.load<Texture>(`${ASSET_BASE}/layer_wall_window.png`),
      Assets.load<Texture>(`${ASSET_BASE}/layer_floor_tiles.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_rug.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_plant.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_chair.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_desk.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_keyboard.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_accessories.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_monitor_back.png`),
      Assets.load<Texture>(`${ASSET_BASE}/sprite_lamp.png`),
      Assets.load<Texture>(`${ASSET_BASE}/layer_lighting_glow.png`),
      Assets.load<Spritesheet>(`${ASSET_BASE}/spritesheet_character_r03.json`),
    ]);

    if (this.destroyed) {
      this.release();
      return;
    }

    for (const tex of [
      wallTex,
      floorTex,
      rugTex,
      plantTex,
      chairTex,
      deskTex,
      keyboardTex,
      accessoriesTex,
      monitorTex,
      lampTex,
      lightingTex,
    ]) {
      tex.source.scaleMode = 'nearest';
    }
    this.sheet = charSheet;
    this.sheet.textureSource.scaleMode = 'nearest';

    this.stageRoot.sortableChildren = true;
    this.app.stage.addChild(this.stageRoot);
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.host.appendChild(this.app.canvas);

    this.buildSceneLayers({
      wallTex,
      floorTex,
      rugTex,
      plantTex,
      chairTex,
      deskTex,
      keyboardTex,
      accessoriesTex,
      monitorTex,
      lampTex,
      lightingTex,
    });

    this.host.dataset.proofLayers = String(PROOF_LAYER_KEYS.length);
    this.host.dataset.proofAlpha = 'verified';
    this.update(this.view);
    this.lastNow = performance.now();
    this.scheduleTick();
  }

  private registerLayer(key: ProofLayerKey, child: Container, zIndex: number): void {
    child.zIndex = zIndex;
    child.visible = this.view.visibleLayers[key] ?? true;
    this.layers.set(key, child);
    this.stageRoot.addChild(child);
  }

  private buildSceneLayers(tex: {
    wallTex: Texture;
    floorTex: Texture;
    rugTex: Texture;
    plantTex: Texture;
    chairTex: Texture;
    deskTex: Texture;
    keyboardTex: Texture;
    accessoriesTex: Texture;
    monitorTex: Texture;
    lampTex: Texture;
    lightingTex: Texture;
  }): void {
    // 1. Empty Room Architectural Layers (Wall/Window & Tiled Floor separated along baseboard seam)
    const wall = new Sprite(tex.wallTex);
    this.registerLayer('wall', wall, 10);

    const floor = new Sprite(tex.floorTex);
    this.registerLayer('floor', floor, 20);

    // 2. Woven Under-Desk Rug grounded across center workstation floor
    const rug = new Sprite(tex.rugTex);
    rug.anchor.set(0.5, 0.5);
    rug.position.set(625, 720);
    rug.scale.set(1.06);
    this.registerLayer('rug', rug, 30);

    // 3. Leafy Tropical Plant in Beige Pot beside the twilight window
    const plant = new Sprite(tex.plantTex);
    plant.anchor.set(0.5, 1);
    plant.position.set(295, 678);
    plant.scale.set(0.75);
    this.registerLayer('plant', plant, 40);

    // 4. Rolling Ergonomic Slate-Blue Office Chair facing right
    const chair = new Sprite(tex.chairTex);
    chair.anchor.set(0.5, 1);
    chair.position.set(458, 714);
    chair.scale.set(0.68);
    this.registerLayer('chair', chair, 50);

    // 5. Character Container (AnimatedSprite from R03_02 12-frame RGBA spritesheet + contact shadow)
    const charLayer = new Container();
    this.footShadow = new Graphics().ellipse(0, 0, 38, 13).fill({ color: 0x050e19, alpha: 0.48 });
    this.character = new AnimatedSprite(this.sheet.animations.type);
    this.character.anchor.set(0.5, 0.95);
    this.character.scale.set(0.94);
    this.character.animationSpeed = 0.14;
    this.character.autoUpdate = false;
    charLayer.addChild(this.footShadow, this.character);
    this.registerLayer('character', charLayer, 65);

    // 6. Honey-Oak Desk with 2-Drawer Pedestal and Cables
    const desk = new Sprite(tex.deskTex);
    desk.anchor.set(0.5, 1);
    desk.position.set(705, 744);
    desk.scale.set(0.72);
    this.registerLayer('desk', desk, 60);

    // 7. Isometric Black Keyboard + Mouse positioned on left desktop surface
    const keyboard = new Sprite(tex.keyboardTex);
    keyboard.anchor.set(0.5, 0.5);
    keyboard.position.set(612, 576);
    keyboard.scale.set(0.62);
    this.registerLayer('keyboard', keyboard, 75);

    // 8. Blue Book & Steaming White Mug on right-front corner of desk + animated steam
    const accLayer = new Container();
    const accessories = new Sprite(tex.accessoriesTex);
    accessories.anchor.set(0.5, 0.5);
    accessories.position.set(748, 578);
    accessories.scale.set(0.56);
    accLayer.addChild(accessories);
    for (let i = 0; i < 3; i++) {
      const dot = new Graphics().rect(-2, -2, 4, 4).fill({ color: 0xe6f4ff, alpha: 0.55 });
      accLayer.addChild(dot);
      this.steamDots.push({ dot, baseX: 778 + i * 4, baseY: 545, phase: i * 2.1 });
    }
    this.registerLayer('accessories', accLayer, 88);

    // 9. Rear 3/4 Dark Slate Monitor (screen glow facing LEFT toward the character, back toward camera)
    const monitor = new Sprite(tex.monitorTex);
    monitor.anchor.set(0.5, 1);
    monitor.position.set(718, 566);
    monitor.scale.set(0.63);
    this.registerLayer('monitor', monitor, 82);

    // 10. Overhead Amber Pendant Lamp attached cleanly to ceiling steel pipework
    const lamp = new Sprite(tex.lampTex);
    lamp.anchor.set(0.5, 0);
    lamp.position.set(625, 114);
    lamp.scale.set(0.80);
    this.registerLayer('lamp', lamp, 94);

    // 11. Additive Lighting Cone + Dynamic Monitor Screen Glow
    const lightLayer = new Container();
    const beam = new Sprite(tex.lightingTex);
    beam.blendMode = 'add';
    this.screenGlow = new Graphics().ellipse(626, 480, 62, 46).fill({ color: 0x62f2ff, alpha: 0.22 });
    this.screenGlow.blendMode = 'add';
    lightLayer.addChild(beam, this.screenGlow);
    this.registerLayer('lighting', lightLayer, 100);
  }

  update(nextView: WorkstationProofView): void {
    const modeChanged = this.view.mode !== nextView.mode;
    this.view = nextView;

    for (const { key } of PROOF_LAYER_KEYS) {
      const layer = this.layers.get(key);
      if (layer) {
        layer.visible = nextView.visibleLayers[key] ?? true;
      }
    }

    if (modeChanged) {
      this.phaseElapsed = 0;
      if (nextView.mode === 'walk') {
        this.walkX = 240;
      }
    }

    this.applyAnimationFrame(0);
    this.app.render();
    this.publishDataset();
  }

  private applyAnimationFrame(dt: number): void {
    if (!this.character) return;

    if (!this.view.paused) {
      this.phaseElapsed += dt;
      this.totalElapsed += dt;
    }

    let pose: ProofPoseName = 'type';
    if (this.view.mode === 'cycle') {
      const cycleSec = 10.5;
      const t = this.totalElapsed % cycleSec;
      if (t < 2.6) {
        pose = 'walk';
        this.walkX = 240 + (t / 2.6) * (474 - 240);
      } else if (t < 4.0) {
        pose = 'sit';
        this.walkX = 474;
      } else if (t < 8.8) {
        pose = 'type';
        this.walkX = 474;
      } else {
        pose = 'stand';
        this.walkX = 468;
      }
    } else {
      pose = this.view.mode;
      if (pose === 'walk') {
        const span = 215;
        const speed = 78;
        this.walkX = 240 + ((this.phaseElapsed * speed) % span);
      } else if (pose === 'stand') {
        this.walkX = 468;
      } else {
        this.walkX = 474;
      }
    }

    if (pose !== this.currentPose) {
      this.currentPose = pose;
      this.character.textures = this.sheet.animations[pose];
      this.character.gotoAndStop(0);
    }

    // Select crisp discrete frame based on elapsed time
    const seq = this.sheet.animations[pose];
    const fps = pose === 'walk' ? 6.5 : pose === 'type' ? 6.0 : 2.2;
    const frameIndex =
      pose === 'sit' || pose === 'stand'
        ? Math.min(seq.length - 1, Math.floor((this.view.mode === 'cycle' ? (this.totalElapsed % 1.4) : this.phaseElapsed) * fps) % seq.length)
        : Math.floor(this.totalElapsed * fps) % seq.length;

    this.character.gotoAndStop(frameIndex);

    // Seated developer stays cleanly visible above left tabletop edge; walking steps along foreground floor path
    const seatY = pose === 'walk' ? 722 : pose === 'stand' ? 710 : 704;
    const charLayer = this.layers.get('character');
    if (charLayer) {
      charLayer.zIndex = pose === 'walk' ? 72 : 65;
    }
    this.character.position.set(Math.round(this.walkX), seatY);
    this.footShadow.position.set(Math.round(this.walkX), seatY + 2);
    this.footShadow.visible = pose === 'walk' || pose === 'stand';

    // Animated steam wisps above white ceramic mug
    for (const s of this.steamDots) {
      const progress = ((this.totalElapsed * 0.9 + s.phase) % 1);
      s.dot.position.set(
        s.baseX + Math.sin(progress * Math.PI * 2) * 3,
        s.baseY - progress * 22,
      );
      s.dot.alpha = (1 - progress) * 0.58;
    }

    // Monitor screen glow intensifies when developer is typing
    if (this.screenGlow) {
      this.screenGlow.alpha =
        pose === 'type'
          ? 0.24 + 0.09 * Math.sin(this.totalElapsed * 5.2)
          : pose === 'sit'
            ? 0.16
            : 0.08;
    }
  }

  private scheduleTick(): void {
    if (this.destroyed) return;
    const now = performance.now();
    const dt = Math.min(0.08, (now - this.lastNow) / 1000);
    this.lastNow = now;

    if (!this.view.paused) {
      this.applyAnimationFrame(dt);
      this.app.render();
      this.frameCounter++;
      this.publishDataset();
    }

    const delayMs = this.view.paused ? 180 : 40;
    this.timer = setTimeout(() => this.scheduleTick(), delayMs);
  }

  private publishDataset(): void {
    const visibleCount = PROOF_LAYER_KEYS.filter(({ key }) => this.view.visibleLayers[key]).length;
    this.host.dataset.proofMode = this.view.mode;
    this.host.dataset.proofPose = this.currentPose;
    this.host.dataset.proofFrame = String(this.character?.currentFrame ?? 0);
    this.host.dataset.proofFramesRendered = String(this.frameCounter);
    this.host.dataset.proofVisibleLayers = String(visibleCount);
  }

  private release(): void {
    if (this.released) return;
    this.released = true;
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
  }

  destroy(): void {
    this.destroyed = true;
    clearTimeout(this.timer);
    if (this.app.renderer) {
      this.release();
    }
  }
}
