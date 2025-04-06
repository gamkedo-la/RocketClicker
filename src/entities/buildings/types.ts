import { Signal } from "@game/core/signals/types";

export interface Building {
  id: string;
  name: string;
  building_cost: Record<string, number>;

  input: Record<string, number>;
  output: Record<string, number>;

  effect: string;

  sounds: {
    build?: string;
    hover?: string;
    destroy?: string;
  };

  maximum_success_rate: Signal<number>;
  current_success_rate: Signal<number>;
  current_efficiency: Signal<number>;
}
