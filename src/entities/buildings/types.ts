import { Signal } from "@game/core/signals/types";

export interface Building {
  id: string;
  name: string;
  building_cost: Record<string, number>;

  input: Record<string, number>;
  output: Record<string, number>;

  maximum_success_rate: Signal<number>;
  current_success_rate: Signal<number>;
  current_temperature: Signal<number>;
}
