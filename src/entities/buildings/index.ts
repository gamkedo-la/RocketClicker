import { signal } from "@game/core/signals/signals";
import { MATERIALS } from "../materials";

import { Building } from "./types";

export function getBuildingById(id: string): Building {
  const building = BUILDINGS.find((b) => b.id === id);

  if (!building) {
    throw new Error(`Building with id ${id} not found`);
  }

  return {
    id: building.id!,
    name: building.name!,
    building_cost: { ...building.building_cost },
    input: { ...building.input },
    output: { ...building.output },
    effect: building.effect!,
    maximum_success_rate: signal(1),
    current_success_rate: signal(1),
    current_efficiency: signal(1),
  };
}

export const EFFECTS = {
  VIBRATION: "Vibration",
  DAMP: "Damp",
  SPEED: "Speed",
  SLOW: "Slow",
  LIGHT: "Light",
  COLD: "Cold",
} as const;

export const EFFECTS_EXPLANATIONS = {
  [EFFECTS.VIBRATION]: "Vibrations make the comet spin faster",
  [EFFECTS.DAMP]: "Dampens the comet spin",
  [EFFECTS.SPEED]: "Efficiency will be higher when the comet spins",
  [EFFECTS.SLOW]: "The slower the comet spins, the better",
  [EFFECTS.LIGHT]: "This building needs light to work properly",
  [EFFECTS.COLD]: "Hiding from the light is better",
};

export const BUILDINGS: Partial<Building>[] = [
  {
    id: "generator",
    name: "Generator",
    effect: EFFECTS.VIBRATION,
    building_cost: { [MATERIALS.StarDust]: 50 },
    input: { [MATERIALS.StarDust]: 50 },
    output: { [MATERIALS.kWh]: 100 },
  },
  {
    id: "solar-panel",
    name: "Solar Panel",
    effect: EFFECTS.LIGHT,
    building_cost: { [MATERIALS.Metals]: 1_000 },
    input: {},
    output: { [MATERIALS.kWh]: 5000 },
  },
  {
    id: "fuel-cell",
    name: "Fuel Cell",
    effect: EFFECTS.DAMP,
    building_cost: { [MATERIALS.PureMetals]: 5_000 },
    input: { [MATERIALS.O2]: 120, [MATERIALS.H2]: 120 },
    output: { [MATERIALS.kWh]: 30_000, [MATERIALS.H2O]: 120 },
  },
  {
    id: "duster",
    name: "Duster",
    effect: EFFECTS.SPEED,
    building_cost: { [MATERIALS.StarDust]: 100 },
    input: { [MATERIALS.kWh]: 200 },
    output: { [MATERIALS.StarDust]: 2_000 },
  },
  {
    id: "miner",
    name: "Miner",
    effect: EFFECTS.VIBRATION,
    building_cost: { [MATERIALS.StarDust]: 1_000 },
    input: { [MATERIALS.kWh]: 1_000 },
    output: { [MATERIALS.Metals]: 1_000 },
  },
  {
    id: "chemical-plant",
    name: "Chemical plant",
    effect: EFFECTS.SLOW,
    building_cost: { [MATERIALS.Metals]: 2_500 },
    input: { [MATERIALS.kWh]: 8750, [MATERIALS.Metals]: 35_000 },
    output: { [MATERIALS.PureMetals]: 3_500 },
  },
  {
    id: "condenser",
    name: "Condenser",
    effect: EFFECTS.SPEED,
    building_cost: { [MATERIALS.Metals]: 10_000 },
    input: { [MATERIALS.kWh]: 2_000 },
    output: { [MATERIALS.H2O]: 7_000 },
  },
  {
    id: "electrolysis",
    name: "Electrolysis",
    effect: EFFECTS.DAMP,
    building_cost: { [MATERIALS.Metals]: 50_000 },
    input: { [MATERIALS.kWh]: 50_000, [MATERIALS.H2O]: 10_000 },
    output: { [MATERIALS.O2]: 750, [MATERIALS.H2]: 1500 },
  },
  {
    id: "h2-compressor",
    name: "H2 Compressor",
    effect: EFFECTS.COLD,
    building_cost: { [MATERIALS.PureMetals]: 10_000 },
    input: { [MATERIALS.kWh]: 2500, [MATERIALS.H2]: 350 },
    output: { [MATERIALS.LH2]: 250 },
  },
  {
    id: "o2-compressor",
    name: "O2 Compressor",
    effect: EFFECTS.COLD,
    building_cost: { [MATERIALS.PureMetals]: 8_000 },
    input: { [MATERIALS.kWh]: 200, [MATERIALS.O2]: 300 },
    output: { [MATERIALS.LOX]: 200 },
  },
];
