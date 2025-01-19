import { Scene } from "phaser";
import { SCENES } from "../scenes";
import { DebugPanel, DebugParameters } from "../game/debug-panel";

export class Boot extends Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    //  Assets that will be used on the preloader (logo, etc) may be loaded here in the future
  }

  create() {
    if (import.meta.env.VITE_DEBUG) {
      DebugPanel.init();

      this.events.on("update", () => {
        DebugParameters.fps = this.game.loop.actualFps;
        DebugPanel.update();
      });
    }
    this.scene.launch(SCENES.PRELOADER);
  }
}
