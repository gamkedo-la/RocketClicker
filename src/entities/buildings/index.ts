import { MATERIALS } from "../materials";

import { Building } from "./types";

export const BUILDINGS: Building[] = [
  {
    name: "Generator",
    building_cost: { [MATERIALS.StarDust]: 50 },
    input: { [MATERIALS.StarDust]: 50 },
    output: { [MATERIALS.kWh]: 100 },
  },
  {
    name: "Solar Panel",
    building_cost: { [MATERIALS.Metals]: 1_000 },
    input: {},
    output: { [MATERIALS.kWh]: 5000 },
  },
  {
    name: "Fuel Cell",
    building_cost: { [MATERIALS.PureMetals]: 5_000 },
    input: { [MATERIALS.O2]: 120, [MATERIALS.H2]: 120 },
    output: { [MATERIALS.kWh]: 30_000, [MATERIALS.H2O]: 120 },
  },
  {
    name: "Duster",
    building_cost: { [MATERIALS.StarDust]: 100 },
    input: { [MATERIALS.kWh]: 200 },
    output: { [MATERIALS.StarDust]: 2_000 },
  },
  {
    name: "Miner",
    building_cost: { [MATERIALS.StarDust]: 1_000 },
    input: { [MATERIALS.kWh]: 1_000 },
    output: { [MATERIALS.Metals]: 1_000 },
  },
  {
    name: "Chemical plant",
    building_cost: { [MATERIALS.Metals]: 2_500 },
    input: { [MATERIALS.kWh]: 8750, [MATERIALS.Metals]: 35_000 },
    output: { [MATERIALS.PureMetals]: 3_500 },
  },
  {
    name: "Condenser",
    building_cost: { [MATERIALS.Metals]: 10_000 },
    input: { [MATERIALS.kWh]: 2_000 },
    output: { [MATERIALS.H2O]: 7_000 },
  },
  {
    name: "Electrolysis",
    building_cost: { [MATERIALS.Metals]: 50_000 },
    input: { [MATERIALS.kWh]: 50_000, [MATERIALS.H2O]: 10_000 },
    output: { [MATERIALS.O2]: 750, [MATERIALS.H2]: 1500 },
  },
  {
    name: "H2 Compressor",
    building_cost: { [MATERIALS.PureMetals]: 10_000 },
    input: { [MATERIALS.kWh]: 2500, [MATERIALS.H2]: 350 },
    output: { [MATERIALS.LH2]: 250 },
  },
  {
    name: "O2 Compressor",
    building_cost: { [MATERIALS.PureMetals]: 8_000 },
    input: { [MATERIALS.kWh]: 200, [MATERIALS.O2]: 300 },
    output: { [MATERIALS.LOX]: 200 },
  },
];
