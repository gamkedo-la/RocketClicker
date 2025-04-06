import { signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import PhaserGamebus from "@game/lib/gamebus";
import { GameStatus } from "@game/state/game-state";
import SoundSystem from "@game/systems/SoundSystem";

import { ThreeCometScene } from "../three/three-comet-scene";

import { MATERIALS } from "@game/entities/materials/index";
import EffectsSystem from "@game/systems/EffectsSystem";
import MaterialsSystem from "@game/systems/MaterialsSystem";
import { AbstractScene } from "..";
import { addKeyboardSupport } from "../hud/keyboard-support";
import { SCENES } from "../scenes";

export const material_storage: Record<
  keyof typeof MATERIALS,
  Signal<number>
> = {
  kWh: signal(0),
  LH2: signal(0),
  LOX: signal(0),
  H2: signal(0),
  O2: signal(0),
  H2O: signal(0),
  PureMetals: signal(0),
  Metals: signal(0),
  StarDust: signal(100),
};

export class GameScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;
  threeCometScene: ThreeCometScene;

  constructor() {
    super(SCENES.GAME);
  }

  soundSystem!: SoundSystem;
  materialsSystem!: MaterialsSystem;
  effectsSystem!: EffectsSystem;

  create() {
    this.bus = this.gamebus.getBus();

    this.scene.run(SCENES.THREE_COMET);

    this.threeCometScene = this.scene.get(
      SCENES.THREE_COMET
    ) as ThreeCometScene;

    this.camera = this.cameras.main;

    addKeyboardSupport(this);

    this.registerSystems();

    this.gameState.setGameStatus(GameStatus.RUNNING);

    this.scene.run(SCENES.HUD);

    // TODO: it seems that the external + threejs wrecks the scale math, so here is a hack
    setTimeout(() => {
      this.scale.refresh();
    }, 100);
  }

  registerSystems() {
    console.log("registering systems");
    this.soundSystem = new SoundSystem(this);
    this.materialsSystem = new MaterialsSystem(this.gameState).create();
    this.effectsSystem = new EffectsSystem(this.gameState).create();
  }

  tickLength = 1000;
  tickTimer = 0;

  update(time: number, delta: number) {
    this.materialsSystem.update(time, delta);
    this.effectsSystem.update(time, delta);
  }

  shutdown() {}
}
