import { System } from "@game/systems/index";
import {
  MATERIALS,
  MATERIALS_GENERATION_ORDER,
} from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { Signal } from "@game/core/signals/types";

export default class MaterialsSystem implements System {
  material_storage: Record<keyof typeof MATERIALS, Signal<number>>;

  tickTimer = 0;
  tickLength = 1000;

  constructor(gameState: GameStateManager) {
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

      this.material_storage[MATERIALS.kWh].set(0);

      MATERIALS_GENERATION_ORDER.forEach((material_order) => {
        // Temporary bumping
        this.material_storage[material_order].update(
          (material) => material + 1
        );
        /*
        grid_buildings.forEach((buildingSignal) => {
          const building = buildingSignal.get();

          if (building === null) return;

          // TODO: Fuel cell is evaluating twice because it outputs twice
          if (
            building.output[material_order] === undefined ||
            (material_order === MATERIALS.H2O && building.name === "Fuel Cell")
          )
            return;

          //console.log(`${building.name} is generating ${material}'`);
          let successRate = 1;
          Object.entries(building.input).forEach(([input, value]) => {
            const material =
              this.material_storage[input as keyof typeof MATERIALS].get();
            successRate = Math.min(successRate || 1, material / value);
            this.material_storage[input as keyof typeof MATERIALS].update(
              (material) => Math.max(material - value, 0)
            );
          });

          if (!successRate) return;

          Object.entries(building.output).forEach(([output, value]) => {
            this.material_storage[output as keyof typeof MATERIALS].update(
              (material) => material + value * successRate
            );
          });
        });
        */
      });
    }
  }

  destroy(): void {}
}
