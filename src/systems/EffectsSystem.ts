import { GameStateManager } from "@game/state/game-state";
import { System } from ".";
import { EFFECTS, TILES_FORCES } from "../entities/buildings";
import { COMET_SPIN_FORCE, MAX_COMET_SPIN } from "@game/state/consts";

export default class EffectsSystem implements System {
  constructor(private gameState: GameStateManager) {}

  create(): this {
    return this;
  }

  update(_time: number, delta: number): void {
    const grid_buildings = this.gameState.state.get()?.board.grid_buildings;

    grid_buildings.forEach((buildingSignal, cellId: number) => {
      const building = buildingSignal.get();

      if (building === null) return;

      building.effects.forEach((effect) => {
        switch (effect) {
          case EFFECTS.VIBRATION:
            const force = TILES_FORCES[cellId] ?? 0;
            this.gameState.addCometSpin(
              force *
                COMET_SPIN_FORCE *
                delta *
                building.current_efficiency.get()
            );
            break;
          case EFFECTS.DAMP:
            this.gameState
              .getCometSpin()
              .update(
                (spin) => spin * 0.999 * building.current_efficiency.get()
              );
            break;
          case EFFECTS.SPEED:
            // building tax covers for this now?
            break;
          case EFFECTS.SLOW:
            building.current_efficiency.set(
              1 - Math.abs(this.gameState.getCometSpin().get() / MAX_COMET_SPIN)
            );
            break;
          case EFFECTS.LIGHT:
            building.current_efficiency.set(
              1 - Math.abs(this.gameState.getCometAngle().get() / Math.PI)
            );
            break;
          case EFFECTS.COLD:
            building.current_efficiency.set(
              Math.abs(this.gameState.getCometAngle().get() / Math.PI)
            );
            break;
        }
      });
    });
  }

  destroy(): void {}
}
