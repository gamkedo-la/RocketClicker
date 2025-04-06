import { GameStateManager } from "@game/state/game-state";
import { System } from ".";
import { EFFECTS } from "../entities/buildings";

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

      const effect = building.effect;

      switch (effect) {
        case EFFECTS.VIBRATION:
          const leftSideForces: Record<number, number> = {
            24: -1.0, // Strongest
            23: -0.75, // Strong
            19: -0.75,
            22: -0.5, // Medium
            18: -0.5,
            14: -0.5,
            21: -0.25, // Weak
            17: -0.25,
            13: -0.25,
            9: -0.25,
          };

          const rightSideForces: Record<number, number> = {
            0: 1.0, // Strongest
            1: 0.75, // Strong
            5: 0.75,
            2: 0.5, // Medium
            6: 0.5,
            10: 0.5,
            3: 0.25, // Weak
            7: 0.25,
            11: 0.25,
            15: 0.25,
          };

          const force = leftSideForces[cellId] ?? rightSideForces[cellId] ?? 0;

          this.gameState.addCometSpin(force * 0.005);
          break;
        case EFFECTS.DAMP:
          this.gameState.getCometSpin().update((spin) => {
            return spin * 0.999;
          });
          break;
        case EFFECTS.SPEED:
          building.current_efficiency.set(
            Math.abs(this.gameState.getCometSpin().get() / 10)
          );
          break;
        case EFFECTS.SLOW:
          building.current_efficiency.set(
            1 - Math.abs(this.gameState.getCometSpin().get() / 10)
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
  }

  destroy(): void {}
}
