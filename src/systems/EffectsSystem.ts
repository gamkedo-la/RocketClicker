import { signal } from "@game/core/signals/signals";
import type { Signal } from "@game/core/signals/types";
import {
  HIGH_SPEED_BUILDING_EFFECT_MIN,
  MAX_COMET_SPIN,
  SPEED_BUILDING_EFFECT_MIN,
  VIBRATION_EFFECT_FORCE,
} from "@game/state/consts";
import { GameStateManager } from "@game/state/game-state";
import { System } from ".";
import { EFFECTS, TILES_FORCES } from "../entities/buildings";

export interface BuildingAlert {
  type: "positive" | "warning" | "error";
  message: string;
  blinking: boolean;
}

const TOO_FAST_ALERT: BuildingAlert = {
  type: "warning",
  message: "TOO FAST",
  blinking: true,
};

const TOO_SLOW_ALERT: BuildingAlert = {
  type: "warning",
  message: "TOO SLOW",
  blinking: true,
};

const TOO_DARK_ALERT: BuildingAlert = {
  type: "warning",
  message: "LOW LIGHT",
  blinking: true,
};

const TOO_WARM_ALERT: BuildingAlert = {
  type: "warning",
  message: "TOO BRIGHT",
  blinking: true,
};

const MISSING_MATERIALS_ALERT: BuildingAlert = {
  type: "error",
  message: "NO MATERIALS",
  blinking: true,
};

const MISSING_ENERGY_ALERT: BuildingAlert = {
  type: "error",
  message: "NO POWER",
  blinking: true,
};

const POSITIVE_ALERT: BuildingAlert = {
  type: "positive",
  message: "OK",
  blinking: false,
};

export default class EffectsSystem implements System {
  private buildingAlerts = new Map<number, Signal<BuildingAlert | null>>();

  constructor(private gameState: GameStateManager) {}

  create(): this {
    return this;
  }

  getAlert(cellId: number): Signal<BuildingAlert | null> {
    let alert = this.buildingAlerts.get(cellId);
    if (!alert) {
      alert = signal(null);
      this.buildingAlerts.set(cellId, alert);
    }
    return alert;
  }

  removeAlert(cellId: number) {
    this.buildingAlerts.delete(cellId);
  }

  update(_time: number, delta: number): void {
    const grid_buildings = this.gameState.state.get()?.board.grid_buildings;

    grid_buildings.forEach((buildingSignal, cellId: number) => {
      const building = buildingSignal.get();
      const alert = this.getAlert(cellId);

      if (building === null) {
        alert.set(null);
        return;
      }

      // Check for alerts based on effects and conditions
      let currentAlert: BuildingAlert | null = null;

      building.effects.forEach((effect) => {
        switch (effect) {
          case EFFECTS.VIBRATION:
            const force = TILES_FORCES[cellId] ?? 0;
            this.gameState.addCometSpin(
              force *
                VIBRATION_EFFECT_FORCE *
                delta *
                building.current_efficiency.get()
            );
            break;
          case EFFECTS.DAMP:
            this.gameState.getCometSpin().update((spin) => {
              const efficiency = building.current_efficiency.get();
              const sign = Math.sign(spin);
              return spin - 0.05 * efficiency * sign;
            });
            break;
          case EFFECTS.SPEED:
            // building tax covers this effect
            const spinRate = Math.abs(this.gameState.getCometSpin().get());
            if (spinRate < SPEED_BUILDING_EFFECT_MIN) {
              currentAlert = TOO_SLOW_ALERT;
            }
            break;
          case EFFECTS.HIGH_SPEED:
            // building tax covers this effect
            const highSpeedSpinRate = Math.abs(
              this.gameState.getCometSpin().get()
            );
            if (highSpeedSpinRate < HIGH_SPEED_BUILDING_EFFECT_MIN) {
              currentAlert = TOO_SLOW_ALERT;
            }
            break;
          case EFFECTS.SLOW: {
            const efficiency =
              1 -
              Math.abs(this.gameState.getCometSpin().get() / MAX_COMET_SPIN);
            building.current_efficiency.set(efficiency);
            if (efficiency < 0.5) {
              currentAlert = TOO_FAST_ALERT;
            }
            break;
          }
          case EFFECTS.LIGHT: {
            const efficiency =
              1 - Math.abs(this.gameState.getCometAngle().get() / Math.PI);
            building.current_efficiency.set(efficiency);
            if (efficiency < 0.5) {
              currentAlert = TOO_DARK_ALERT;
            }
            break;
          }
          case EFFECTS.COLD: {
            const efficiency = Math.abs(
              this.gameState.getCometAngle().get() / Math.PI
            );
            building.current_efficiency.set(efficiency);
            if (efficiency < 0.5) {
              currentAlert = TOO_WARM_ALERT;
            }
            break;
          }
        }
      });

      if (building.missing_materials) {
        currentAlert = MISSING_MATERIALS_ALERT;
      }

      if (building.missing_energy) {
        currentAlert = MISSING_ENERGY_ALERT;
      }

      if (currentAlert) {
        // No idea how to fix this decently
        // @ts-ignore
        if (alert.get()?.message !== currentAlert.message) {
          alert.set(currentAlert);
        }
      } else {
        if (alert.get() !== null) {
          alert.set(POSITIVE_ALERT);
        }
      }
    });
  }

  destroy(): void {
    this.buildingAlerts.clear();
  }
}
