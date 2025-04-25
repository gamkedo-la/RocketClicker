import { computed, mutable, signal } from "@game/core/signals/signals";
import { MutableSignal, Signal } from "@game/core/signals/types";
import { MATERIALS } from "@game/entities/materials/index";
import { Building } from "@game/entities/buildings/types";
import { MAX_COMET_SPIN } from "./consts";

export const GameStatus = {
  LOADING: "loading",
  RUNNING: "running",
  ROCKET_LAUNCHED: "rocket_launched",
  ENDED: "ended",
} as const;

export interface BoardState {
  boardWidth: number;
  boardHeight: number;
  grid: Array<Array<number>>;
  grid_buildings: Map<number, Signal<Building | null>>;
}

export interface State {
  status: (typeof GameStatus)[keyof typeof GameStatus];
  time: number;
  score: number;
  material_storage: Record<keyof typeof MATERIALS, Signal<number>>;
  board: BoardState;
  mouse_selected_building: Signal<MouseSelectedBuilding>;
  mouse_selected_bulldoze: Signal<boolean>;
  comet_spin_velocity: Signal<number>;
  comet_spin_velocity_abs: Signal<number>;
  can_place_building: Signal<boolean>;
  comet_angle: Signal<number>;
  hovered_building: Signal<Building | null>;
  sound_volume: Signal<number>;
}

export interface MouseSelectedBuilding {
  building: Building | null;
}

export interface GameState {
  state: MutableSignal<State | null>;
}

/* Ha, is this the way to go with states + signals?
 * Will this look unparseable at 10/100 signals?
 * Could this "global" declaration allow for splitting files?
 *
 * Not really because this won't allow for resetting the state easily.
 * How would this "save to disk" or be loaded across multiple games?
 */

const comet_spin_velocity = signal(3, {
  label: "Comet Spin",
  tweakpaneOptions: {
    min: -MAX_COMET_SPIN,
    max: MAX_COMET_SPIN,
  },
});

const comet_spin_velocity_abs = computed(
  () => Math.abs(comet_spin_velocity.get()),
  {
    label: "Absolute Comet Spin",
    tweakpaneOptions: {
      min: 0,
      max: MAX_COMET_SPIN,
    },
  }
);

export class GameStateManager
  extends Phaser.Plugins.BasePlugin
  implements GameState
{
  state: MutableSignal<State> = mutable({
    status: GameStatus.LOADING,
    time: 0,
    score: 0,
    material_storage: Object.fromEntries(
      Object.keys(MATERIALS).map((material) => [material, signal(0)])
    ) as Record<keyof typeof MATERIALS, Signal<number>>,
    board: {
      boardWidth: 5,
      boardHeight: 5,
      grid: Array.from({ length: 5 }, () => Array(5).fill(0)),
      grid_buildings: new Map(),
    },
    comet_spin_velocity,
    comet_spin_velocity_abs,
    comet_angle: signal(0, {
      label: "Comet Angle",
      tweakpaneOptions: {
        min: -Math.PI,
        max: Math.PI,
      },
    }),
    can_place_building: computed(() => comet_spin_velocity_abs.get() <= 20.0, {
      label: "Can Place Building",
    }),
    mouse_selected_building: signal<MouseSelectedBuilding>({ building: null }),
    mouse_selected_bulldoze: signal<boolean>(false),
    hovered_building: signal<Building | null>(null),
    sound_volume: signal(1, {
      label: "Sound volume",
      tweakpaneOptions: {
        min: 0,
        max: 1,
      },
    }),
  });

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);

    const board = this.state.get().board;

    // Initialize the grid_buildings map with empty signals
    for (let y = 0; y < board.boardHeight; y++) {
      for (let x = 0; x < board.boardWidth; x++) {
        const cellId = y * board.boardWidth + x;
        board.grid_buildings.set(cellId, signal<Building | null>(null));
      }
    }
  }

  private mutateState(mutation: (state: State) => boolean): void {
    this.state.mutate(mutation);
  }

  setGameStatus(status: (typeof GameStatus)[keyof typeof GameStatus]) {
    this.mutateState((state) => {
      state.status = status;
      return true;
    });
  }

  /**
   * Add a building to a specific cell on the board
   */
  addBuildingToCell(cellId: number, building: Building): boolean {
    const board = this.state.get().board;

    if (cellId < 0 || cellId >= board.boardWidth * board.boardHeight) {
      console.error(`Invalid cell ID: ${cellId}`);
      return false;
    }

    // consume resources
    this.consumeBuildingConstruction(building);

    const buildingSignal = board.grid_buildings.get(cellId);
    if (!buildingSignal) {
      console.error(`No building signal found for cell ID: ${cellId}`);
      return false;
    }

    buildingSignal.set(building);
    return true;
  }

  addBuilding(x: number, y: number, building: Building): boolean {
    const cellId = this.gridToCell(x, y);
    return this.addBuildingToCell(cellId, building);
  }

  consumeBuildingConstruction(building: Building): void {
    const material_storage = this.state.get().material_storage;
    const building_cost = building.building_cost;
    for (const [material, amount] of Object.entries(building_cost)) {
      material_storage[material as keyof typeof MATERIALS].update(
        (current) => current - amount
      );
    }
  }

  /**
   * Remove a building from a specific cell on the board
   */
  removeBuildingFromCell(cellId: number): boolean {
    const board = this.state.get().board;

    if (cellId < 0 || cellId >= board.boardWidth * board.boardHeight) {
      console.error(`Invalid cell ID: ${cellId}`);
      return false;
    }

    const buildingSignal = board.grid_buildings.get(cellId);
    if (!buildingSignal) {
      console.error(`No building signal found for cell ID: ${cellId}`);
      return false;
    }

    buildingSignal.set(null);
    return true;
  }

  removeBuilding(x: number, y: number): boolean {
    const cellId = this.gridToCell(x, y);
    return this.removeBuildingFromCell(cellId);
  }

  /**
   * Get the building at a specific cell on the board
   */
  getBuildingAtCell(cellId: number): Building | null {
    const board = this.state.get().board;

    if (cellId < 0 || cellId >= board.boardWidth * board.boardHeight) {
      console.error(`Invalid cell ID: ${cellId}`);
      return null;
    }

    const buildingSignal = board.grid_buildings.get(cellId);
    if (!buildingSignal) {
      console.error(`No building signal found for cell ID: ${cellId}`);
      return null;
    }

    return buildingSignal.get();
  }

  getBuildingAt(x: number, y: number): Building | null {
    const cellId = this.gridToCell(x, y);
    return this.getBuildingAtCell(cellId);
  }

  /**
   * Convert grid coordinates to a cell ID
   */
  gridToCell(x: number, y: number): number {
    const board = this.state.get().board;

    if (x < 0 || x >= board.boardWidth || y < 0 || y >= board.boardHeight) {
      console.error(`Invalid grid coordinates: ${x}, ${y}`);
      return -1;
    }

    return y * board.boardWidth + x;
  }

  /**
   * Convert a cell ID to grid coordinates
   */
  cellToGrid(cellId: number): { x: number; y: number } | null {
    const board = this.state.get().board;

    if (cellId < 0 || cellId >= board.boardWidth * board.boardHeight) {
      console.error(`Invalid cell ID: ${cellId}`);
      return null;
    }

    const x = cellId % board.boardWidth;
    const y = Math.floor(cellId / board.boardWidth);

    return { x, y };
  }

  changeMaterial(material: keyof typeof MATERIALS, amount: number): void {
    const materialStorage = this.state.get().material_storage;
    materialStorage[material].update((current) => current + amount);
  }

  setMouseSelectedBuilding(building: Building | null): void {
    if (building !== null) {
      this.state.get().mouse_selected_bulldoze.set(false);
    }
    this.state.get().mouse_selected_building.set({ building });
  }

  toggleMouseSelectedBulldoze(): void {
    this.setMouseSelectedBuilding(null);
    this.state.get().mouse_selected_bulldoze.update((current) => !current);
  }

  setCometSpin(spin: number): void {
    this.state.get().comet_spin_velocity.set(spin);
  }

  addCometSpin(amount: number): void {
    this.state
      .get()
      .comet_spin_velocity.update((current) =>
        Math.min(MAX_COMET_SPIN, Math.max(-MAX_COMET_SPIN, current + amount))
      );
  }

  getCometSpin(): Signal<number> {
    return this.state.get().comet_spin_velocity;
  }

  getCometAngle(): Signal<number> {
    return this.state.get().comet_angle;
  }

  setCometAngle(angle: number): void {
    this.state.get().comet_angle.set(angle);
  }

  setHoveredBuilding(building: Building | null): void {
    this.state.get().hovered_building.set(building);
  }

  getHoveredBuilding(): Signal<Building | null> {
    return this.state.get().hovered_building;
  }

  getSoundVolume(): Signal<number> {
    return this.state.get().sound_volume;
  }

  setSoundVolume(volume: number): void {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.state.get().sound_volume.set(normalizedVolume);
  }
}
