import { signal } from "@game/core/signals/signals";
import { MATERIALS } from "../materials";

import { Building } from "./types";
import { RESOURCES } from "@game/assets";

export function getBuildingById(id: string): Building {
  const building = BUILDINGS.find((b) => b.id === id);

  if (!building) {
    throw new Error(`Building with id ${id} not found`);
  }

  return {
    id: building.id!,
    name: building.name!,
    effects: building.effects!,
    building_cost: { ...building.building_cost },
    input: { ...building.input },
    output: { ...building.output },
    sounds: {
      build: building.sounds?.build ?? "",
      hover: building.sounds?.hover ?? "",
      destroy: building.sounds?.destroy ?? "",
    },
    maximum_success_rate: signal(0.5),
    current_success_rate: signal(0),
    current_efficiency: signal(0),
  };
}

export const TILES_FORCES: Record<number, number> = {
  // Left side
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
  // Right side
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
  // Middle
  4: 0,
  8: 0,
  12: 0,
  16: 0,
  20: 0,
};

export const EFFECTS = {
  VIBRATION: "Vibration",
  DAMP: "Damp",
  SPEED: "Speed",
  SLOW: "Slow",
  LIGHT: "Light",
  COLD: "Cold",
  HIGH_SPEED: "High Speed",
} as const;

export const EFFECTS_EXPLANATIONS = {
  [EFFECTS.VIBRATION]: "Vibrations make the comet spin faster",
  [EFFECTS.DAMP]: "Dampens the comet spin",
  [EFFECTS.SPEED]: "Efficiency will be higher when the comet spins",
  [EFFECTS.HIGH_SPEED]: "Needs high speed so it can start",
  [EFFECTS.SLOW]: "The slower the comet spins, the better",
  [EFFECTS.LIGHT]: "This building needs light to work properly",
  [EFFECTS.COLD]: "Hiding from the light is better",
};

export const BUILDINGS: Partial<Building>[] = [
  {
    id: "generator",
    name: "Generator",
    effects: [EFFECTS.VIBRATION, EFFECTS.SPEED],
    building_cost: { [MATERIALS.CometDust]: 50 },
    input: { [MATERIALS.CometDust]: 50 },
    output: { [MATERIALS.kWh]: 100 },
    sounds: {
      build: RESOURCES["build-generator"],
    },
  },
  {
    id: "solar-panel",
    name: "Solar Panel",
    effects: [EFFECTS.LIGHT],
    building_cost: { [MATERIALS.Metals]: 1_000 },
    input: {},
    output: { [MATERIALS.kWh]: 5000 },
    sounds: {
      build: RESOURCES["build-solarpanel"],
    },
  },
  {
    id: "fuel-cell",
    name: "Fuel Cell",
    effects: [EFFECTS.DAMP],
    building_cost: { [MATERIALS.PureMetals]: 5_000 },
    input: { [MATERIALS.O2]: 120, [MATERIALS.H2]: 120 },
    output: { [MATERIALS.kWh]: 30_000, [MATERIALS.H2O]: 120 },
    sounds: {
      build: RESOURCES["build-fuelcell"],
    },
  },
  {
    id: "duster",
    name: "Duster",
    effects: [EFFECTS.SPEED],
    building_cost: { [MATERIALS.CometDust]: 100 },
    input: { [MATERIALS.kWh]: 200 },
    output: { [MATERIALS.CometDust]: 2_000 },
    sounds: {
      build: RESOURCES["build-duster"],
    },
  },
  {
    id: "miner",
    name: "Miner",
    effects: [EFFECTS.VIBRATION, EFFECTS.SPEED],
    building_cost: { [MATERIALS.CometDust]: 1_000 },
    input: { [MATERIALS.kWh]: 1_000 },
    output: { [MATERIALS.Metals]: 1_000 },
    sounds: {
      build: RESOURCES["build-miner"],
    },
  },
  {
    id: "chemical-plant",
    name: "Chemical plant",
    effects: [EFFECTS.SLOW],
    building_cost: { [MATERIALS.Metals]: 2_500 },
    input: { [MATERIALS.kWh]: 8750, [MATERIALS.Metals]: 35_000 },
    output: { [MATERIALS.PureMetals]: 3_500 },
    sounds: {
      build: RESOURCES["build-chemicalplant"],
    },
  },
  {
    id: "condenser",
    name: "Condenser",
    effects: [EFFECTS.SPEED],
    building_cost: { [MATERIALS.Metals]: 10_000 },
    input: { [MATERIALS.kWh]: 2_000 },
    output: { [MATERIALS.H2O]: 7_000 },
    sounds: {
      build: RESOURCES["build-condenser"],
    },
  },
  {
    id: "electrolysis",
    name: "Electrolysis",
    effects: [EFFECTS.DAMP],
    building_cost: { [MATERIALS.Metals]: 50_000 },
    input: { [MATERIALS.kWh]: 50_000, [MATERIALS.H2O]: 10_000 },
    output: { [MATERIALS.O2]: 750, [MATERIALS.H2]: 1500 },
    sounds: {
      build: RESOURCES["build-electrolysis"],
    },
  },
  {
    id: "h2-compressor",
    name: "H2 Compressor",
    effects: [EFFECTS.HIGH_SPEED],
    building_cost: { [MATERIALS.PureMetals]: 10_000 },
    input: { [MATERIALS.kWh]: 2500, [MATERIALS.H2]: 350 },
    output: { [MATERIALS.LH2]: 250 },
    sounds: {
      build: RESOURCES["build-H2compressor"],
    },
  },
  {
    id: "o2-compressor",
    name: "O2 Compressor",
    effects: [EFFECTS.HIGH_SPEED],
    building_cost: { [MATERIALS.PureMetals]: 8_000 },
    input: { [MATERIALS.kWh]: 200, [MATERIALS.O2]: 300 },
    output: { [MATERIALS.LOX]: 200 },
    sounds: {
      build: RESOURCES["build-O2compressor"],
    },
  },
];
