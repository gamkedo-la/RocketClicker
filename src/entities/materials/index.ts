import { RESOURCES } from "@game/assets";
import { Building } from "../buildings/types";
import { Signal } from "@game/core/signals/types";

export const MATERIALS = {
  kWh: "kWh",
  LH2: "LH2",
  LOX: "LOX",
  H2: "H2",
  O2: "O2",
  H2O: "H2O",
  StarDust: "StarDust",
  Metals: "Metals",
  PureMetals: "PureMetals",
} as const;

export type Material = keyof typeof MATERIALS;

export const MATERIALS_NAMES = {
  kWh: "kWh",
  LH2: "LH2",
  LOX: "LOX",
  H2: "H2",
  O2: "O2",
  H2O: "H2O",
  StarDust: "(SD)",
  Metals: "(M)",
  PureMetals: "(PM)",
};

export const MATERIALS_ICONS = {
  kWh: RESOURCES.kWh,
  LH2: RESOURCES.LH2,
  LOX: RESOURCES.LOX,
  H2: RESOURCES.H2,
  O2: RESOURCES.O2,
  H2O: RESOURCES.H2O,
  StarDust: RESOURCES.stardust,
  Metals: RESOURCES.metals,
  PureMetals: RESOURCES["pure-metals"],
};

/**
 * The order in which materials are generated each tick.
 *
 * It follows a bit of how dependent each material is on other materials.
 *
 * @see MATERIALS
 */
export const MATERIALS_GENERATION_ORDER = [
  MATERIALS.kWh,
  MATERIALS.StarDust,
  MATERIALS.Metals,
  MATERIALS.PureMetals,
  MATERIALS.H2O,
  MATERIALS.H2,
  MATERIALS.O2,
  MATERIALS.LOX,
  MATERIALS.LH2,
];

export function hasResources(
  building: Building,
  material_storage: Record<string, Signal<number>>
) {
  return Object.entries(building.building_cost).every(([material, value]) => {
    return material_storage[material as keyof typeof MATERIALS].get() >= value;
  });
}
