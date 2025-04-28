import { signal } from "@game/core/signals/signals";
import type { Signal } from "@game/core/signals/types";
import {
  COMET_SPIN_FORCE,
  HIGH_SPEED_BUILDING_EFFECT_MIN,
  MAX_COMET_SPIN,
  SPEED_BUILDING_EFFECT_MIN,
} from "@game/state/consts";
import { GameStateManager } from "@game/state/game-state";
import { System } from ".";
import { EFFECTS, TILES_FORCES } from "../entities/buildings";

export interface BuildingAlert {
  type: "warning" | "error";
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
  blinking: true,
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

  alertTicks = signal(0, { label: "alerts ticks" });

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
                COMET_SPIN_FORCE *
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

      // Check building-specific conditions
      if (!currentAlert) {
        switch (building.id) {
          case "miner": {
            const spinRate = Math.abs(this.gameState.getCometSpin().get());
            if (spinRate < 5) {
              this.alertTicks.set(this.alertTicks.get() + 1);
              currentAlert = TOO_SLOW_ALERT;
            }
            break;
          }
        }
      }

      if (currentAlert && currentAlert.message !== alert.get()?.message) {
        alert.set(currentAlert);
      } else if (!currentAlert && alert.get()) {
        alert.set(null);
      }
    });
  }

  destroy(): void {
    this.buildingAlerts.clear();
  }
}
