import { AbstractScene } from "..";
import { SCENES } from "../scenes";


export const PAUSE_TEXT_STYLE = {
  fontFamily: "DotGothic16",
  fontSize: "32px",
};

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

    this.add.existing(
      <text
        x={500}
        y={260}
        text="Paused"
        resolution={2}
        style={{
          ...PAUSE_TEXT_STYLE,
          fontSize: "48px",
        }}
      />
    );

  }

  update() {
    if (this.key_esc.isDown || Phaser.Input.Keyboard.JustDown(this.key_p)) {
      console.log("Unpausing");
      this.resumeGame();
    }
  }

  resumeGame() {
    this.scene.resume(SCENES.GAME);
    this.scene.resume(SCENES.THREE_COMET);
    this.scene.stop(SCENES.UI_PAUSE);
  }

  shutdown() {}
}
