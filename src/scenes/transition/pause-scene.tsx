
import { TEXT_STYLE } from "@game/consts";
import { Stack } from "../../ui/components/Stack";
import { RESOURCES } from "../../assets";
import { AbstractScene } from "..";
import { GameStateManager } from "./state/game-state";
import { SCENES } from "../scenes";
import { Game, Types } from "phaser";


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
