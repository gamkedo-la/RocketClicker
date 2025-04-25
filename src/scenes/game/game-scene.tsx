import PhaserGamebus from "@game/lib/gamebus";
import { GameStatus } from "@game/state/game-state";

import { ThreeCometScene } from "../three/three-comet-scene";

import CometSpinSystem from "@game/systems/CometSpinSystem";
import EffectsSystem from "@game/systems/EffectsSystem";
import MaterialsSystem from "@game/systems/MaterialsSystem";
import { AbstractScene } from "..";
import { addKeyboardSupport } from "../hud/keyboard-support";
import { SCENES } from "../scenes";
import { SoundManager } from "@game/core/sound/sound-manager";

export class GameScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;
  declare soundManager: SoundManager;

  camera: Phaser.Cameras.Scene2D.Camera;
  threeCometScene: ThreeCometScene;

  constructor() {
    super(SCENES.GAME);
  }

  materialsSystem!: MaterialsSystem;
  effectsSystem!: EffectsSystem;
  cometSpinSystem!: CometSpinSystem;

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

    this.materialsSystem = new MaterialsSystem(this.gameState).create();
    this.effectsSystem = new EffectsSystem(this.gameState).create();
    this.cometSpinSystem = new CometSpinSystem(this.gameState).create();
  }

  update(time: number, delta: number) {
    this.cometSpinSystem.update(time, delta);
    this.materialsSystem.update(time, delta);
    this.effectsSystem.update(time, delta);
  }

  shutdown() {}
}
