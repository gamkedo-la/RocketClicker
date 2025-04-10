import { Signal } from "@game/core/signals/types";
import {
  MATERIALS,
  MATERIALS_GENERATION_ORDER,
} from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { System } from "@game/systems/index";
import { EFFECTS } from "../entities/buildings";

export default class MaterialsSystem implements System {
  material_storage: Record<keyof typeof MATERIALS, Signal<number>>;

  tickTimer = 0;
  tickLength = 500;

  constructor(private gameState: GameStateManager) {
    gameState.state.subscribe((state) => {
      this.material_storage = state.material_storage;
    });
  }

  create(): this {
    return this;
  }

  update(_time: number, delta: number): void {
    this.tickTimer += delta;
    if (this.tickTimer >= this.tickLength) {
      this.tickTimer = 0;

      // TODO: improve how this is displayed
      this.material_storage[MATERIALS.kWh].set(0);

      const grid_buildings = this.gameState.state.get()?.board.grid_buildings;

      const spin_velocity =
        this.gameState.state.get()?.comet_spin_velocity_abs.get() ?? 0;
      const buildings_tax = Math.max(Math.min((spin_velocity - 20) / 20, 1), 0);

      MATERIALS_GENERATION_ORDER.forEach((material_order) => {
        grid_buildings.forEach((buildingSignal) => {
          const building = buildingSignal.get();

          if (building === null) return;

          // TODO: Fuel cell is evaluating twice because it outputs twice
          if (
            building.output[material_order] === undefined ||
            (material_order === MATERIALS.H2O && building.name === "Fuel Cell")
          ) {
            return;
          }

          let successRate =
            // damp and vibrate are affected by the success rate
            building.effects.includes(EFFECTS.DAMP) ||
            building.effects.includes(EFFECTS.VIBRATION)
              ? building.maximum_success_rate.get()
              : Math.min(
                  building.maximum_success_rate.get(),
                  building.current_efficiency.get()
                );

          // We need to apply the speed effect here because speed and vibration are combined
          if (
            building.effects.includes(EFFECTS.SPEED) ||
            building.effects.includes(EFFECTS.HIGH_SPEED)
          ) {
            successRate *= buildings_tax;
          }

          Object.entries(building.input).forEach(([input, value]) => {
            // How much of the input material is available?
            const material =
              this.material_storage[input as keyof typeof MATERIALS].get();
            // How much of the input material is needed?
            successRate = Math.min(successRate, material / value);
          });

          building.current_success_rate.set(successRate);

          // damp and vibrate are affected by the success rate
          if (
            building.effects.includes(EFFECTS.DAMP) ||
            building.effects.includes(EFFECTS.VIBRATION)
          ) {
            building.current_efficiency.set(successRate);
          }

          if (!successRate) return;

          Object.entries(building.input).forEach(([input, value]) => {
            // Subtract the input material from the available material
            this.material_storage[input as keyof typeof MATERIALS].update(
              (material) =>
                Math.max(material - Math.floor(value * successRate), 0)
            );
          });

          Object.entries(building.output).forEach(([output, value]) => {
            this.material_storage[output as keyof typeof MATERIALS].update(
              (material) => material + Math.floor(value * successRate)
            );
          });
        });
      });
    }
  }

  destroy(): void {}
}
