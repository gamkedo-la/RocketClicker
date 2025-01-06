import { GameStatus } from "@game/state/game-state";
import { AbstractScene } from "..";
import PhaserGamebus from "../../lib/gamebus";
import { SCENES } from "../consts";

export class GameScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(SCENES.GAME);
  }

  key_one!: Phaser.Input.Keyboard.Key;
  key_two!: Phaser.Input.Keyboard.Key;

  create() {
    this.bus = this.gamebus.getBus();

    this.camera = this.cameras.main;

    this.key_one = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE
    );
    this.key_two = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO
    );

    this.registerSystems();

    if (import.meta.env.VITE_DEBUG) {
      this.scene.run(SCENES.DEBUG);
    }

    this.gameState.setGameStatus(GameStatus.RUNNING);
  }

  registerSystems() {}

  update(time: number, delta: number) {}

  shutdown() {
    if (import.meta.env.VITE_DEBUG) {
      this.scene.stop(SCENES.DEBUG);
    }
  }
}
