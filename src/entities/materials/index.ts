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
