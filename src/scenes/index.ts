import { SequenceEngine } from "@game/core/animation/animation";
import PhaserGamebus from "@game/lib/gamebus";
import { GameStateManager } from "@game/state/game-state";
import { MotionMachine } from "../core/motion-machine/motion-machine";
import { DebugParameters } from "./debug/debug-panel";
import { ScenesManager } from "../state/scenes-manager";
import { SoundManager } from "@game/core/sound/sound-manager";

export abstract class AbstractScene extends Phaser.Scene {
  // Game plugins
  declare gameState: GameStateManager;
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;
  declare soundManager: SoundManager;
  declare scenesManager: ScenesManager;

  declare animationEngine: SequenceEngine;

  declare motionMachines: MotionMachine<any, any>[];

  init() {
    // Required to make JSX magic happen
    (window as any).currentScene = this;

    this.animationEngine = new SequenceEngine(this);

    this.events.on("preupdate", () => {
      window.currentScene = this;
      if (import.meta.env.VITE_DEBUG) {
        DebugParameters.frameBudget = performance.now();
      }
    });

    this.events.on("update", (_time: number, delta: number) => {
      for (let i = 0; i < this.motionMachines.length; i++) {
        this.motionMachines[i].update(delta);
      }
    });

    if (import.meta.env.VITE_DEBUG) {
      this.events.on("postupdate", () => {
        DebugParameters.frameBudget =
          performance.now() - DebugParameters.frameBudget;
      });
    }

    this.events.once("shutdown", () => {
      if (import.meta.env.VITE_DEBUG) {
        console.log("shutdown", this.scene.key);
      }
      this.shutdown();
    });

    this.motionMachines = [];
  }

  addMotionMachine(motionMachine: MotionMachine<any, any>) {
    this.motionMachines.push(motionMachine);
  }

  /**
   * Override to clean up things when the scene is shutdown
   */
  abstract shutdown(): void;
}
