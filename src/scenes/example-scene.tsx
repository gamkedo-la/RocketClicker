import { AbstractScene } from "./index";
import { SCENES } from "./scenes";

/**
 * Example scene
 *
 * Copy this file, place it where it is relevant, update dependencies and have fun :)
 * Don't forget to add the scene to the scenes.ts file
 */

export class GameScene extends AbstractScene {
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

    this.key_one.on("down", () => {
      console.log("key_one");
    });

    this.key_two.on("down", () => {
      console.log("key_two");
    });
  }

  registerSystems() {
    console.log("registering systems");
  }

  update(_time: number, _delta: number) {}

  shutdown() {}
}
