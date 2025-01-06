import PhaserGamebus from "@game/lib/gamebus";
import { GameStateManager } from "@game/state/game-state";
import { SequenceEngine } from "../ui/animation/animation";

export abstract class AbstractScene extends Phaser.Scene {
  // Game plugins
  declare gameState: GameStateManager;
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  declare animationEngine: SequenceEngine;

  init() {
    // Required to make JSX magic happen
    (window as any).currentScene = this;

    this.animationEngine = new SequenceEngine(this);

    this.events.on("preupdate", () => {
      window.currentScene = this;
    });

    this.events.once("shutdown", () => {
      console.log("shutdown", this.scene.key, this, window.currentScene);

      this.shutdown();
    });
  }

  /**
   * Override to clean up things when the scene is shutdown
   */
  abstract shutdown(): void;
}
