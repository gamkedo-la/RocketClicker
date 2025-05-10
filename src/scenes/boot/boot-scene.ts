import { AbstractScene } from "..";
import { DebugPanel, DebugParameters } from "../debug/debug-panel";
import { SCENES } from "../scenes";

export class Boot extends AbstractScene {
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
      });
    }

    this.scenesManager.boot(this.scene);
  }

  shutdown() {}
}
