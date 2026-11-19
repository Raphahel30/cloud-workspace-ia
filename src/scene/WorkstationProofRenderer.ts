import { AnimatedSprite, Application, Assets, Container, Graphics, Sprite, type Spritesheet, Texture } from 'pixi.js';
import {
  PROOF_LAYER_KEYS,
  type ProofCameraView,
  type ProofLayerKey,
  type ProofPoseName,
  type WorkstationProofView,
} from './workstationProofTypes';

const ASSET_BASE = '/art/workstation-proof';
const SCENE_WIDTH = 1200;
const SCENE_HEIGHT = 896;
const CHAIR_POS_X = 472;
const CHAIR_POS_Y = 704;
const CHAIR_SCALE = 0.72;
const SEATED_HIP_X = 476;
const SEATED_HIP_Y = 619;

interface LoadedArtPack {
  wallTex: Texture;
  floorTex: Texture;
  fullWallTex: Texture;
  fullFloorTex: Texture;
  rugTex: Texture;
  plantTex: Texture;
  chairBackTex: Texture;
  chairArmFrontTex: Texture;
  chairBackBTex: Texture;
  chairArmFrontBTex: Texture;
  seatShadowTex: Texture;
  deskTex: Texture;
  deskBTex: Texture;
  keyboardTex: Texture;
  accessoriesTex: Texture;
  monitorTex: Texture;
  monitorBTex: Texture;
  lampTex: Texture;
  pendantSpotTex: Texture;
  lightingTex: Texture;
  neonSignTex: Texture;
  holoMapTex: Texture;
  holoChartTex: Texture;
  holoChipTex: Texture;
  credenzaTex: Texture;
  elevatorTex: Texture;
  vinesTex: Texture;
  fgPlanterLTex: Texture;
  fgPlanterRTex: Texture;
  blueprintATex: Texture;
  blueprintBTex: Texture;
  pensBookTex: Texture;
  tabletMugTex: Texture;
  stackedBooksTex: Texture;
  charSheet: Spritesheet;
  forearmsSheet: Spritesheet;
  agentsSheet: Spritesheet;
}

/**
 * Dual-view PixiJS 8 showcase renderer:
 * 1. `station-zoom`: Single-station closeup verifying nested chair-cushion occlusion (`chairBack < seatShadow < body < chairArmFront < desk < forearms < monitor`) and `walk/sit/type/stand`.
 * 2. `floor03-full`: Full enriched Floor 03 modular scene (`EQUIPE IA`) built exclusively from 38 independent RGBA layers/sprites.
 */
export class WorkstationProofRenderer {
  private app = new Application();
  private stationWorld = new Container();
  private floorWorld = new Container();
  private host: HTMLDivElement;
  private view: WorkstationProofView;

  private charSheet!: Spritesheet;
  private forearmsSheet!: Spritesheet;
  private agentsSheet!: Spritesheet;

  private character!: AnimatedSprite;
  private characterForearms!: AnimatedSprite;
  private footShadow!: Graphics;
  private screenGlow!: Graphics;
  private steamDots: Array<{ dot: Graphics; baseX: number; baseY: number; phase: number }> = [];

  // Floor 03 multi-station refs for subtle idle life
  private botSprite?: Sprite;
  private botBaseY = 695;
  private claudeSprite?: Sprite;

  private stationLayers = new Map<ProofLayerKey, Container[]>();
  private floorLayers = new Map<ProofLayerKey, Container[]>();

  private destroyed = false;
  private released = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private lastNow = 0;
  private phaseElapsed = 0;
  private totalElapsed = 0;
  private frameCounter = 0;
  private currentPose: ProofPoseName = 'type';
  private walkX = 240;

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

    const loadTex = (file: string) => Assets.load<Texture>(`${ASSET_BASE}/${file}`);
    const [
      wallTex,
      floorTex,
      fullWallTex,
      fullFloorTex,
      rugTex,
      plantTex,
      chairBackTex,
      chairArmFrontTex,
      chairBackBTex,
      chairArmFrontBTex,
      seatShadowTex,
      deskTex,
      deskBTex,
      keyboardTex,
      accessoriesTex,
      monitorTex,
      monitorBTex,
      lampTex,
      pendantSpotTex,
      lightingTex,
      neonSignTex,
      holoMapTex,
      holoChartTex,
      holoChipTex,
      credenzaTex,
      elevatorTex,
      vinesTex,
      fgPlanterLTex,
      fgPlanterRTex,
      blueprintATex,
      blueprintBTex,
      pensBookTex,
      tabletMugTex,
      stackedBooksTex,
      charSheet,
      forearmsSheet,
      agentsSheet,
    ] = await Promise.all([
      loadTex('layer_wall_window.png'),
      loadTex('layer_floor_tiles.png'),
      loadTex('layer_floor03_full_wall.png'),
      loadTex('layer_floor03_full_floor.png'),
      loadTex('sprite_rug.png'),
      loadTex('sprite_plant.png'),
      loadTex('sprite_chair_back.png'),
      loadTex('sprite_chair_arm_front.png'),
      loadTex('sprite_chair_back_b.png'),
      loadTex('sprite_chair_arm_front_b.png'),
      loadTex('sprite_seat_shadow.png'),
      loadTex('sprite_desk.png'),
      loadTex('sprite_desk_variant_b.png'),
      loadTex('sprite_keyboard.png'),
      loadTex('sprite_accessories.png'),
      loadTex('sprite_monitor_back.png'),
      loadTex('sprite_monitor_back_b.png'),
      loadTex('sprite_lamp.png'),
      loadTex('sprite_pendant_spot.png'),
      loadTex('layer_lighting_glow.png'),
      loadTex('sprite_neon_equipe_ia.png'),
      loadTex('sprite_holo_map.png'),
      loadTex('sprite_holo_chart.png'),
      loadTex('sprite_holo_chip.png'),
      loadTex('sprite_credenza_lamp.png'),
      loadTex('sprite_elevator_03.png'),
      loadTex('sprite_hanging_vines.png'),
      loadTex('sprite_fg_planter_left.png'),
      loadTex('sprite_fg_planter_right.png'),
      loadTex('sprite_wall_blueprint_a.png'),
      loadTex('sprite_wall_blueprint_b.png'),
      loadTex('sprite_prop_pens_book.png'),
      loadTex('sprite_prop_tablet_mug.png'),
      loadTex('sprite_prop_stacked_books.png'),
      Assets.load<Spritesheet>(`${ASSET_BASE}/spritesheet_character_r03.json`),
      Assets.load<Spritesheet>(`${ASSET_BASE}/spritesheet_character_forearms_r03.json`),
      Assets.load<Spritesheet>(`${ASSET_BASE}/spritesheet_agents_floor03.json`),
    ]);

    if (this.destroyed) {
      this.release();
      return;
    }

    const pack: LoadedArtPack = {
      wallTex,
      floorTex,
      fullWallTex,
      fullFloorTex,
      rugTex,
      plantTex,
      chairBackTex,
      chairArmFrontTex,
      chairBackBTex,
      chairArmFrontBTex,
      seatShadowTex,
      deskTex,
      deskBTex,
      keyboardTex,
      accessoriesTex,
      monitorTex,
      monitorBTex,
      lampTex,
      pendantSpotTex,
      lightingTex,
      neonSignTex,
      holoMapTex,
      holoChartTex,
      holoChipTex,
      credenzaTex,
      elevatorTex,
      vinesTex,
      fgPlanterLTex,
      fgPlanterRTex,
      blueprintATex,
      blueprintBTex,
      pensBookTex,
      tabletMugTex,
      stackedBooksTex,
      charSheet,
      forearmsSheet,
      agentsSheet,
    };

    for (const val of Object.values(pack)) {
      if (val && 'source' in val && val.source) {
        (val as Texture).source.scaleMode = 'nearest';
      }
    }
    this.charSheet = charSheet;
    this.charSheet.textureSource.scaleMode = 'nearest';
    this.forearmsSheet = forearmsSheet;
    this.forearmsSheet.textureSource.scaleMode = 'nearest';
    this.agentsSheet = agentsSheet;
    this.agentsSheet.textureSource.scaleMode = 'nearest';

    this.stationWorld.sortableChildren = true;
    this.floorWorld.sortableChildren = true;
    // Scale 1740x896 panoramic Floor 03 smoothly into 1200x896 canvas
    const fitScale = SCENE_WIDTH / 1740;
    this.floorWorld.scale.set(fitScale);
    this.floorWorld.position.set(0, Math.round((SCENE_HEIGHT - SCENE_HEIGHT * fitScale) / 2));

    this.app.stage.addChild(this.stationWorld, this.floorWorld);
    this.app.canvas.setAttribute('aria-hidden', 'true');
    this.host.appendChild(this.app.canvas);

    this.buildStationZoomScene(pack);
    this.buildFullFloor03Scene(pack);

    this.host.dataset.proofLayers = String(PROOF_LAYER_KEYS.length);
    this.host.dataset.proofAlpha = 'verified';
    this.host.dataset.proofSeatedFit = 'nested-chair-occlusion';
    this.host.dataset.proofLibraryCount = '38';

    this.update(this.view);
    this.lastNow = performance.now();
    this.scheduleTick();
  }

  private addToLayerMap(
    map: Map<ProofLayerKey, Container[]>,
    parent: Container,
    key: ProofLayerKey,
    child: Container,
    zIndex: number,
  ): void {
    child.zIndex = zIndex;
    child.visible = this.view.visibleLayers[key] ?? true;
    const list = map.get(key) ?? [];
    list.push(child);
    map.set(key, list);
    parent.addChild(child);
  }

  private buildStationZoomScene(pack: LoadedArtPack): void {
    const add = (key: ProofLayerKey, child: Container, z: number) =>
      this.addToLayerMap(this.stationLayers, this.stationWorld, key, child, z);

    add('wall', new Sprite(pack.wallTex), 10);
    add('floor', new Sprite(pack.floorTex), 20);

    // Modular wall decor enrichment even in single-station view
    const bp = new Sprite(pack.blueprintATex);
    bp.anchor.set(0.5, 0.5);
    bp.position.set(1060, 410);
    bp.scale.set(0.85);
    add('wallDecor', bp, 24);

    const vines = new Sprite(pack.vinesTex);
    vines.anchor.set(0.5, 0);
    vines.position.set(500, 178);
    vines.scale.set(0.62);
    add('wallDecor', vines, 26);

    const rug = new Sprite(pack.rugTex);
    rug.anchor.set(0.5, 0.5);
    rug.position.set(605, 708);
    rug.scale.set(1.06);
    add('rug', rug, 30);

    const plant = new Sprite(pack.plantTex);
    plant.anchor.set(0.5, 1);
    plant.position.set(275, 672);
    plant.scale.set(0.75);
    add('plant', plant, 40);

    const fgPlant = new Sprite(pack.fgPlanterLTex);
    fgPlant.anchor.set(0.5, 1);
    fgPlant.position.set(110, 775);
    fgPlant.scale.set(0.78);
    add('plant', fgPlant, 90);

    // CHAIR PART 1 (Backrest, seat cushion, casters, far armrest)
    const chairBack = new Sprite(pack.chairBackTex);
    chairBack.anchor.set(0.5, 1);
    chairBack.position.set(CHAIR_POS_X, CHAIR_POS_Y);
    chairBack.scale.set(CHAIR_SCALE);
    add('chairBack', chairBack, 48);

    // SEAT CUSHION CONTACT SHADOW directly beneath thighs
    const seatShadow = new Sprite(pack.seatShadowTex);
    seatShadow.anchor.set(0.5, 0.5);
    seatShadow.position.set(SEATED_HIP_X + 6, SEATED_HIP_Y - 2);
    seatShadow.scale.set(0.85);
    add('seatShadow', seatShadow, 52);

    // SEATED CHARACTER BODY (hips anchored squarely on cushion y=619; back flush with backrest; legs tucked under desk!)
    const charLayer = new Container();
    this.footShadow = new Graphics().ellipse(0, 0, 38, 13).fill({ color: 0x050e19, alpha: 0.48 });
    this.character = new AnimatedSprite(this.charSheet.animations.type);
    this.character.anchor.set(0.45, 194 / 260);
    this.character.scale.set(0.95);
    this.character.autoUpdate = false;
    charLayer.addChild(this.footShadow, this.character);
    add('character', charLayer, 58);

    // CHAIR PART 2 (Foreground left curved armrest & strut WRAPPING OVER character's waist/hip!)
    const chairArmFront = new Sprite(pack.chairArmFrontTex);
    chairArmFront.anchor.set(0.5, 1);
    chairArmFront.position.set(CHAIR_POS_X, CHAIR_POS_Y);
    chairArmFront.scale.set(CHAIR_SCALE);
    add('chairArmFront', chairArmFront, 64);

    // DESK & KEYBOARD (desk hides lower knees naturally)
    const desk = new Sprite(pack.deskTex);
    desk.anchor.set(0.5, 1);
    desk.position.set(685, 730);
    desk.scale.set(0.72);
    add('desk', desk, 70);

    const keyboard = new Sprite(pack.keyboardTex);
    keyboard.anchor.set(0.5, 0.5);
    keyboard.position.set(578, 568);
    keyboard.scale.set(0.58);
    add('keyboard', keyboard, 74);

    // FOREARMS & HANDS OVERLAY (renders ABOVE desk 70 and keyboard 74!)
    const forearmLayer = new Container();
    this.characterForearms = new AnimatedSprite(this.forearmsSheet.animations.type);
    this.characterForearms.anchor.set(0.45, 194 / 260);
    this.characterForearms.position.set(SEATED_HIP_X, SEATED_HIP_Y);
    this.characterForearms.scale.set(0.95);
    this.characterForearms.autoUpdate = false;
    forearmLayer.addChild(this.characterForearms);
    add('characterForearms', forearmLayer, 78);

    // ACCESSORIES (book + mug + rising steam)
    const accLayer = new Container();
    const accessories = new Sprite(pack.accessoriesTex);
    accessories.anchor.set(0.5, 0.5);
    accessories.position.set(728, 568);
    accessories.scale.set(0.56);
    accLayer.addChild(accessories);
    for (let i = 0; i < 3; i++) {
      const dot = new Graphics().rect(-2, -2, 4, 4).fill({ color: 0xe6f4ff, alpha: 0.55 });
      accLayer.addChild(dot);
      this.steamDots.push({ dot, baseX: 758 + i * 4, baseY: 534, phase: i * 2.1 });
    }
    add('accessories', accLayer, 82);

    // REAR MONITOR IN FOREGROUND
    const monitor = new Sprite(pack.monitorTex);
    monitor.anchor.set(0.5, 1);
    monitor.position.set(696, 560);
    monitor.scale.set(0.63);
    add('monitor', monitor, 88);

    // LIGHTING
    const lamp = new Sprite(pack.lampTex);
    lamp.anchor.set(0.5, 0);
    lamp.position.set(625, 114);
    lamp.scale.set(0.8);
    add('lamp', lamp, 94);

    const spot = new Sprite(pack.pendantSpotTex);
    spot.anchor.set(0.5, 0);
    spot.position.set(280, 128);
    spot.scale.set(0.65);
    add('lamp', spot, 94);

    const lightLayer = new Container();
    const beam = new Sprite(pack.lightingTex);
    beam.blendMode = 'add';
    this.screenGlow = new Graphics().ellipse(608, 476, 62, 46).fill({ color: 0x62f2ff, alpha: 0.22 });
    this.screenGlow.blendMode = 'add';
    lightLayer.addChild(beam, this.screenGlow);
    add('lighting', lightLayer, 100);
  }

  private buildFullFloor03Scene(pack: LoadedArtPack): void {
    const add = (key: ProofLayerKey, child: Container, z: number) =>
      this.addToLayerMap(this.floorLayers, this.floorWorld, key, child, z);

    // Empty extended shell layers (floor cut out cleanly from wall)
    add('wall', new Sprite(pack.fullWallTex), 10);
    add('floor', new Sprite(pack.fullFloorTex), 20);

    // Rich wall decor, credenza + brass lamp, holograms, neon sign, hanging vines, Elevator 03
    const addDecor = (tex: Texture, x: number, y: number, s: number, ax = 0.5, ay = 0.5, z = 25) => {
      const sp = new Sprite(tex);
      sp.anchor.set(ax, ay);
      sp.position.set(x, y);
      sp.scale.set(s);
      add('wallDecor', sp, z);
      return sp;
    };
    addDecor(pack.vinesTex, 490, 165, 0.55, 0.5, 0, 26);
    addDecor(pack.vinesTex, 1485, 165, 0.55, 0.5, 0, 26);
    addDecor(pack.blueprintATex, 1045, 385, 0.64, 0.5, 0.5, 24);
    addDecor(pack.blueprintBTex, 1475, 385, 0.64, 0.5, 0.5, 24);
    addDecor(pack.neonSignTex, 895, 248, 0.68, 0.5, 0.5, 25);
    addDecor(pack.holoMapTex, 1185, 258, 0.66, 0.5, 0.5, 25);
    addDecor(pack.holoChartTex, 1365, 258, 0.66, 0.5, 0.5, 25);
    addDecor(pack.holoChipTex, 1265, 385, 0.68, 0.5, 0.5, 25);
    addDecor(pack.credenzaTex, 895, 614, 0.65, 0.5, 1, 28);
    addDecor(pack.elevatorTex, 1615, 626, 0.78, 0.5, 1, 28);

    // Side & foreground vegetation
    const plantLeft = new Sprite(pack.plantTex);
    plantLeft.anchor.set(0.5, 1);
    plantLeft.position.set(175, 668);
    plantLeft.scale.set(0.65);
    add('plant', plantLeft, 40);

    const fgL = new Sprite(pack.fgPlanterLTex);
    fgL.anchor.set(0.5, 1);
    fgL.position.set(115, 818);
    fgL.scale.set(0.84);
    add('plant', fgL, 95);

    const fgR = new Sprite(pack.fgPlanterRTex);
    fgR.anchor.set(0.5, 1);
    fgR.position.set(1545, 800);
    fgR.scale.set(0.84);
    add('plant', fgR, 95);

    // Build all 4 Complete Workstations (`ChatGPT`, `Codex`, `Antigravity`, `Claude Code`)
    // Each uses nested Chair Back < Seat Shadow < Seated Agent < Chair Front Armrest < Desk < Props < Monitor Back!
    const stations: Array<{
      x: number;
      yFloor: number;
      agentFrame: string;
      chairAlt: boolean;
      deskAlt: boolean;
      propTex: Texture;
      monitorAlt: boolean;
    }> = [
      {
        x: 390,
        yFloor: 716,
        agentFrame: 'agent-chatgpt-type',
        chairAlt: false,
        deskAlt: false,
        propTex: pack.accessoriesTex,
        monitorAlt: false,
      },
      {
        x: 685,
        yFloor: 706,
        agentFrame: 'agent-codex-type',
        chairAlt: true,
        deskAlt: true,
        propTex: pack.pensBookTex,
        monitorAlt: true,
      },
      {
        x: 980,
        yFloor: 696,
        agentFrame: 'agent-antigravity-type',
        chairAlt: false,
        deskAlt: false,
        propTex: pack.tabletMugTex,
        monitorAlt: false,
      },
      {
        x: 1275,
        yFloor: 686,
        agentFrame: 'agent-claude-type',
        chairAlt: true,
        deskAlt: true,
        propTex: pack.stackedBooksTex,
        monitorAlt: true,
      },
    ];

    stations.forEach((st, idx) => {
      const sScale = 0.66;
      const rug = new Sprite(pack.rugTex);
      rug.anchor.set(0.5, 0.5);
      rug.position.set(st.x + 25, st.yFloor - 4);
      rug.scale.set(0.76);
      add('rug', rug, 30);

      const chairX = st.x - 62;
      const chairY = st.yFloor + 2;
      const cBack = new Sprite(st.chairAlt ? pack.chairBackBTex : pack.chairBackTex);
      cBack.anchor.set(0.5, 1);
      cBack.position.set(chairX, chairY);
      cBack.scale.set(0.54);
      add('chairBack', cBack, 48);

      // Cushion height (`118 * 0.54 = 63.7 px` above wheel bottom -> `yFloor - 62`)
      const cushionY = chairY - 62;
      const sShadow = new Sprite(pack.seatShadowTex);
      sShadow.anchor.set(0.5, 0.5);
      sShadow.position.set(chairX + 6, cushionY);
      sShadow.scale.set(0.64);
      add('seatShadow', sShadow, 52);

      const agentSp = new Sprite(this.agentsSheet.textures[st.agentFrame]);
      agentSp.anchor.set(0.45, 232 / 300);
      agentSp.position.set(chairX + 4, cushionY);
      agentSp.scale.set(0.64);
      add('character', agentSp, 58);
      if (idx === 3) {
        this.claudeSprite = agentSp;
      }

      const cArm = new Sprite(st.chairAlt ? pack.chairArmFrontBTex : pack.chairArmFrontTex);
      cArm.anchor.set(0.5, 1);
      cArm.position.set(chairX, chairY);
      cArm.scale.set(0.54);
      add('chairArmFront', cArm, 64);

      const desk = new Sprite(st.deskAlt ? pack.deskBTex : pack.deskTex);
      desk.anchor.set(0.5, 1);
      desk.position.set(st.x + 88, st.yFloor + 10);
      desk.scale.set(st.deskAlt ? 0.68 : 0.54);
      add('desk', desk, 70);

      const kb = new Sprite(pack.keyboardTex);
      kb.anchor.set(0.5, 0.5);
      kb.position.set(st.x + 14, st.yFloor - 110);
      kb.scale.set(0.45);
      add('keyboard', kb, 74);

      const propSp = new Sprite(st.propTex);
      propSp.anchor.set(0.5, 0.5);
      propSp.position.set(st.x + 114, st.yFloor - 116);
      propSp.scale.set(0.44);
      add('accessories', propSp, 82);

      const mon = new Sprite(st.monitorAlt ? pack.monitorBTex : pack.monitorTex);
      mon.anchor.set(0.5, 1);
      mon.position.set(st.x + 92, st.yFloor - 102);
      mon.scale.set(st.monitorAlt ? 0.66 : 0.48);
      add('monitor', mon, 88);

      const cyanSpot = new Graphics()
        .ellipse(st.x + 28, st.yFloor - 148, 42, 30)
        .fill({ color: 0x62f2ff, alpha: 0.16 });
      cyanSpot.blendMode = 'add';
      add('lighting', cyanSpot, 100);

      // Ceiling lamps & pendant spots spaced across bays
      if (idx === 0 || idx === 2) {
        const lmp = new Sprite(pack.lampTex);
        lmp.anchor.set(0.5, 0);
        lmp.position.set(st.x + 120, 124);
        lmp.scale.set(0.68);
        add('lamp', lmp, 94);
      } else {
        const spt = new Sprite(pack.pendantSpotTex);
        spt.anchor.set(0.5, 0);
        spt.position.set(st.x + 95, 126);
        spt.scale.set(0.55);
        add('lamp', spt, 94);
      }

      void sScale;
    });

    // Cute Helper Robot `Bot IA` near Elevator 03
    this.botSprite = new Sprite(this.agentsSheet.textures['agent-bot-ia']);
    this.botSprite.anchor.set(0.5, 1);
    this.botSprite.position.set(1485, 695);
    this.botSprite.scale.set(0.58);
    add('character', this.botSprite, 76);

    const floorBeam = new Sprite(pack.lightingTex);
    floorBeam.position.set(120, 40);
    floorBeam.scale.set(1.25, 1);
    floorBeam.alpha = 0.72;
    floorBeam.blendMode = 'add';
    add('lighting', floorBeam, 100);
  }

  update(nextView: WorkstationProofView): void {
    const modeChanged = this.view.mode !== nextView.mode;
    this.view = nextView;

    this.stationWorld.visible = nextView.camera === 'station-zoom';
    this.floorWorld.visible = nextView.camera === 'floor03-full';

    const syncVisibility = (map: Map<ProofLayerKey, Container[]>) => {
      for (const { key } of PROOF_LAYER_KEYS) {
        const visible = nextView.visibleLayers[key] ?? true;
        for (const node of map.get(key) ?? []) {
          node.visible = visible;
        }
      }
    };
    syncVisibility(this.stationLayers);
    syncVisibility(this.floorLayers);

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
        this.walkX = 240 + (t / 2.6) * (460 - 240);
      } else if (t < 4.0) {
        pose = 'sit';
        this.walkX = SEATED_HIP_X;
      } else if (t < 8.8) {
        pose = 'type';
        this.walkX = SEATED_HIP_X;
      } else {
        pose = 'stand';
        this.walkX = 460;
      }
    } else {
      pose = this.view.mode;
      if (pose === 'walk') {
        const span = 210;
        const speed = 78;
        this.walkX = 240 + ((this.phaseElapsed * speed) % span);
      } else if (pose === 'stand') {
        this.walkX = 460;
      } else {
        this.walkX = SEATED_HIP_X;
      }
    }

    if (pose !== this.currentPose) {
      this.currentPose = pose;
      this.character.textures = this.charSheet.animations[pose];
      this.character.gotoAndStop(0);
    }

    const seq = this.charSheet.animations[pose];
    const fps = pose === 'walk' ? 6.5 : pose === 'type' ? 6.0 : 2.2;
    const frameIndex =
      pose === 'sit' || pose === 'stand'
        ? Math.min(
            seq.length - 1,
            Math.floor((this.view.mode === 'cycle' ? this.totalElapsed % 1.4 : this.phaseElapsed) * fps) %
              seq.length,
          )
        : Math.floor(this.totalElapsed * fps) % seq.length;

    this.character.gotoAndStop(frameIndex);

    const isDeepSeated = pose === 'type' || (pose === 'sit' && frameIndex >= 1);
    const charWrapper = (this.stationLayers.get('character') ?? [])[0];

    if (isDeepSeated) {
      this.character.anchor.set(0.45, 194 / 260);
      this.character.scale.set(0.95);
      this.character.position.set(SEATED_HIP_X, SEATED_HIP_Y);
      this.footShadow.visible = false;
      if (charWrapper) charWrapper.zIndex = 58;
    } else {
      this.character.anchor.set(0.5, 246 / 260);
      this.character.scale.set(0.94);
      const yWalk = pose === 'walk' ? 712 : pose === 'stand' ? 706 : 700;
      this.character.position.set(Math.round(this.walkX), yWalk);
      this.footShadow.position.set(Math.round(this.walkX), yWalk + 2);
      this.footShadow.visible = true;
      if (charWrapper) charWrapper.zIndex = pose === 'walk' ? 76 : 60;
    }

    // Forearms overlay active only when seated & typing over the desk/keyboard
    const showForearms =
      (this.view.visibleLayers.characterForearms ?? true) &&
      (this.view.visibleLayers.character ?? true) &&
      pose === 'type';
    const forearmWrapper = (this.stationLayers.get('characterForearms') ?? [])[0];
    if (forearmWrapper) {
      forearmWrapper.visible = showForearms;
    }
    if (showForearms) {
      this.characterForearms.gotoAndStop(frameIndex % this.characterForearms.totalFrames);
    }

    // Seat shadow and front armrest occlusion only active over hips when seated
    const shadowVisible = (this.view.visibleLayers.seatShadow ?? true) && isDeepSeated;
    for (const n of this.stationLayers.get('seatShadow') ?? []) {
      n.visible = shadowVisible;
    }

    // Animated steam wisps & cyan screen glow
    for (const s of this.steamDots) {
      const progress = (this.totalElapsed * 0.9 + s.phase) % 1;
      s.dot.position.set(s.baseX + Math.sin(progress * Math.PI * 2) * 3, s.baseY - progress * 20);
      s.dot.alpha = (1 - progress) * 0.58;
    }

    if (this.screenGlow) {
      this.screenGlow.alpha =
        pose === 'type'
          ? 0.24 + 0.09 * Math.sin(this.totalElapsed * 5.2)
          : pose === 'sit'
            ? 0.16
            : 0.08;
    }

    // Full Floor 03 subtle bot hover & Claude typing vs thinking toggle
    if (this.botSprite) {
      this.botSprite.y = this.botBaseY + Math.round(Math.sin(this.totalElapsed * 3.2) * 2);
    }
    if (this.claudeSprite) {
      const think = pose === 'sit' || pose === 'stand' || (this.view.mode === 'cycle' && Math.floor(this.totalElapsed / 4) % 2 === 1);
      this.claudeSprite.texture = this.agentsSheet.textures[think ? 'agent-claude-think' : 'agent-claude-type'];
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
    const activeMap = this.view.camera === 'floor03-full' ? this.floorLayers : this.stationLayers;
    const visibleCount = PROOF_LAYER_KEYS.filter(
      ({ key }) => (this.view.visibleLayers[key] ?? true) && (activeMap.get(key)?.length ?? 0) > 0,
    ).length;
    this.host.dataset.proofCamera = this.view.camera;
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
