import { AbstractScene } from "..";
import { SCENES } from "../scenes";

export class PauseScene extends AbstractScene {
  constructor() {
    super(SCENES.UI_PAUSE);
  }

  key_esc!: Phaser.Input.Keyboard.Key;
  key_p!: Phaser.Input.Keyboard.Key;

  create() {
    this.key_esc = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.key_p = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
  }

  update() {
    if (this.key_esc.isDown || Phaser.Input.Keyboard.JustDown(this.key_p)) {
      this.resumeGame();
    }
  }

  resumeGame() {
    this.scene.resume(SCENES.GAME);
    this.scene.stop(SCENES.UI_PAUSE);
  }

  shutdown() {}
}
