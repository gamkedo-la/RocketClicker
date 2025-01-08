import { GameStatus } from "@game/state/game-state";
import { computed, signal } from "@game/state/lib/signals";
import { Signal } from "@game/state/lib/types";
import { AbstractScene } from "..";
import PhaserGamebus from "../../lib/gamebus";
import { Stack } from "../../ui/components/Stack";
import { SCENES } from "../scenes";

let i = 0;

function hasResources(
  building: Building,
  material_storage: Record<string, Signal<number>>
) {
  return Object.entries(building.building_cost).every(([material, value]) => {
    return material_storage[material as keyof typeof materials].get() >= value;
  });
}

function Button({
  x,
  y,
  building,
}: {
  x?: number;
  y?: number;
  building: Building;
}) {
  const width = 180;
  const height = 60;

  let canBuildBuilding = computed(() =>
    hasResources(building, material_storage)
  );

  let current_rectangle_color = computed(() =>
    canBuildBuilding.get() ? 0xffffff : 0xaaaaaa
  );

  /*
   TODO: fsm signal for mouse state
   because then I don't have this mess on the pointers in the interaction
   */

  return (
    <container
      x={x}
      y={y}
      width={width}
      height={height}
      interactive
      onPointerover={(self) => {
        if (canBuildBuilding.get()) {
          self.first!.fillColor = 0xffff00;
        }
      }}
      onPointerout={(self) => {
        self.first!.fillColor = current_rectangle_color.get();
      }}
      onPointerdown={(self) => {
        if (canBuildBuilding.get()) {
          self.first!.fillColor = 0x00ff00;
          if (mouse_selected_building.get()?.name !== building.name) {
            mouse_selected_building.set(building);
          } else {
            mouse_selected_building.set(null);
          }
        }
      }}
      onPointerup={(self) => {
        self.first!.fillColor = current_rectangle_color.get();
      }}
    >
      <rectangle
        width={width}
        height={20}
        fillColor={current_rectangle_color}
        strokeColor={0x000000}
        origin={{ x: 0.5, y: 1 }}
      />
      <text
        x={0}
        y={0}
        origin={{ x: 0.5, y: 1 }}
        text={`[${i++ < 9 ? i : 0}] ${building.name}`}
        style={{ color: "#000000" }}
      />
      <text
        x={0}
        y={5}
        origin={{ x: 0.5, y: 0 }}
        text={`${Object.values(building.building_cost)} ${Object.keys(
          building.building_cost
        )}`}
        style={computed(() => ({
          color: canBuildBuilding.get() ? "#00ff00" : "#ff0000",
        }))}
      />
      <text
        x={0}
        y={20}
        origin={{ x: 0.5, y: 0 }}
        text={`${Object.keys(building.input).join(", ")} -> ${Object.keys(
          building.output
        ).join(", ")}`}
        style={{ color: "#000000" }}
      />
    </container>
  );
}

function Cell({
  x,
  y,
  text,
  id,
  building,
}: {
  x?: number;
  y?: number;
  text: string;
  id: number;
  building: Signal<Building | null>;
}) {
  const width = 100;
  const height = 100;

  let lastClick = 0;

  if (building === null) {
    return (
      <container x={x} y={y} width={width} height={height}>
        <rectangle width={width} height={height} fillColor={0x123456} />
        <text
          x={0}
          y={0}
          origin={0.5}
          text={text}
          style={{ color: "#ffffff" }}
        />
      </container>
    );
  }

  return (
    <container
      x={x}
      y={y}
      width={width}
      height={height}
      interactive
      onPointerdown={(self, pointer) => {
        if (pointer.time - lastClick < 500) {
          grid_buildings.get(id)!.set(null);
        } else if (mouse_selected_building.get() !== null) {
          const building = mouse_selected_building.get()!;
          Object.entries(building.building_cost).forEach(
            ([material, value]) => {
              material_storage[material as keyof typeof materials].update(
                (material) => material - value
              );
            }
          );
          grid_buildings.get(id)!.set(mouse_selected_building.get());
          mouse_selected_building.set(null);
          self.first!.fillColor = 0xaaaaff;
        }

        lastClick = pointer.time;
      }}
      onPointerup={(self) => {
        self.first!.fillColor = 0xdddddd;
      }}
      onPointerover={(self) => {
        self.first!.fillColor =
          mouse_selected_building.get() !== null ? 0xaaffaa : 0xdddddd;
      }}
      onPointerout={(self) => {
        self.first!.fillColor = 0xffffff;
      }}
    >
      <rectangle width={width} height={height} fillColor={0xffffff} />
      <text
        x={0}
        y={computed(() => (building.get() ? -20 : 0))}
        origin={0.5}
        text={text}
        style={{ color: "#000000" }}
      />
      <text
        x={0}
        y={10}
        origin={0.5}
        text={computed(() => building.get()?.name ?? "")}
        wordWrapWidth={width}
        style={{ color: "#000000", align: "center" }}
      />
    </container>
  );
}

function Material({
  x,
  y,
  name,
  value,
}: {
  x?: number;
  y?: number;
  name: keyof typeof materials;
  value: Signal<number>;
}) {
  return (
    <container x={x} y={y}>
      <text
        x={0}
        y={0}
        origin={{ x: 1, y: 0 }}
        text={`${name}`}
        style={{ color: "#000000" }}
      />
      <text
        x={10}
        y={0}
        origin={0}
        text={computed(() => value.get().toString())}
        style={{ color: "#000000" }}
      />
    </container>
  );
}

const materials = {
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

const materials_generation_order = [
  materials.kWh,
  materials.StarDust,
  materials.Metals,
  materials.PureMetals,
  materials.H2O,
  materials.H2,
  materials.O2,
  materials.LOX,
  materials.LH2,
];

const material_storage: Record<keyof typeof materials, Signal<number>> = {
  kWh: signal(0),
  LH2: signal(0),
  LOX: signal(0),
  H2: signal(0),
  O2: signal(0),
  H2O: signal(0),
  PureMetals: signal(0),
  Metals: signal(0),
  StarDust: signal(100),
};

const buildings: Building[] = [
  {
    name: "Generator",
    building_cost: { [materials.StarDust]: 50 },
    input: { [materials.StarDust]: 50 },
    output: { [materials.kWh]: 100 },
  },
  {
    name: "Solar Panel",
    building_cost: { [materials.Metals]: 1_000 },
    input: {},
    output: { [materials.kWh]: 5000 },
  },
  {
    name: "Fuel Cell",
    building_cost: { [materials.PureMetals]: 5_000 },
    input: { [materials.O2]: 120, [materials.H2]: 120 },
    output: { [materials.kWh]: 30_000, [materials.H2O]: 120 },
  },
  {
    name: "Duster",
    building_cost: { [materials.StarDust]: 100 },
    input: { [materials.kWh]: 200 },
    output: { [materials.StarDust]: 2_000 },
  },
  {
    name: "Miner",
    building_cost: { [materials.StarDust]: 1_000 },
    input: { [materials.kWh]: 1_000 },
    output: { [materials.Metals]: 1_000 },
  },
  {
    name: "Chemical plant",
    building_cost: { [materials.Metals]: 2_500 },
    input: { [materials.kWh]: 8750, [materials.Metals]: 35_000 },
    output: { [materials.PureMetals]: 3_500 },
  },
  {
    name: "Condenser",
    building_cost: { [materials.Metals]: 10_000 },
    input: { [materials.kWh]: 2_000 },
    output: { [materials.H2O]: 7_000 },
  },
  {
    name: "Electrolysis",
    building_cost: { [materials.Metals]: 50_000 },
    input: { [materials.kWh]: 50_000, [materials.H2O]: 10_000 },
    output: { [materials.O2]: 750, [materials.H2]: 1500 },
  },
  {
    name: "H2 Compressor",
    building_cost: { [materials.PureMetals]: 10_000 },
    input: { [materials.kWh]: 2500, [materials.H2]: 350 },
    output: { [materials.LH2]: 250 },
  },
  {
    name: "O2 Compressor",
    building_cost: { [materials.PureMetals]: 8_000 },
    input: { [materials.kWh]: 200, [materials.O2]: 300 },
    output: { [materials.LOX]: 200 },
  },
];

interface Building {
  name: string;
  building_cost: Record<string, number>;

  input: Record<string, number>;
  output: Record<string, number>;
}

const grid = [
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
];

const grid_buildings: Map<number, Signal<Building | null>> = new Map<
  number,
  Signal<Building | null>
>();

grid.forEach((row) => {
  row.forEach((cell) => {
    grid_buildings.set(cell, signal<Building | null>(null));
  });
});

const mouse_selected_building = signal<Building | null>(null);

export class GameScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(SCENES.GAME);
  }

  key_one!: Phaser.Input.Keyboard.Key;
  key_two!: Phaser.Input.Keyboard.Key;
  key_three!: Phaser.Input.Keyboard.Key;
  key_four!: Phaser.Input.Keyboard.Key;
  key_five!: Phaser.Input.Keyboard.Key;
  key_six!: Phaser.Input.Keyboard.Key;
  key_seven!: Phaser.Input.Keyboard.Key;
  key_eight!: Phaser.Input.Keyboard.Key;
  key_nine!: Phaser.Input.Keyboard.Key;
  key_zero!: Phaser.Input.Keyboard.Key;
  key_escape!: Phaser.Input.Keyboard.Key;

  create() {
    this.bus = this.gamebus.getBus();

    this.camera = this.cameras.main;

    this.key_one = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE
    );
    this.key_two = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO
    );
    this.key_three = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE
    );
    this.key_four = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.FOUR
    );
    this.key_five = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.FIVE
    );
    this.key_six = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SIX
    );
    this.key_seven = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SEVEN
    );
    this.key_eight = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.EIGHT
    );
    this.key_nine = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.NINE
    );
    this.key_zero = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ZERO
    );
    this.key_escape = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    this.registerSystems();

    if (import.meta.env.VITE_DEBUG) {
      this.scene.run(SCENES.DEBUG);
    }

    this.gameState.setGameStatus(GameStatus.RUNNING);

    this.add.existing(
      <Stack x={130} y={90} spacing={8}>
        {buildings.map((building) => (
          <Button building={building} />
        ))}
      </Stack>
    );

    this.add.existing(
      <Stack x={300} y={200} spacing={10}>
        {grid.map((row, y) => (
          <Stack spacing={10} direction="horizontal">
            {row.map((cell, x) => {
              const building = grid_buildings.get(cell)!;
              if (cell === 12)
                return <Cell text={`rocket`} id={cell} building={null} />;
              return <Cell text={`${x},${y}`} id={cell} building={building} />;
            })}
          </Stack>
        ))}
      </Stack>
    );

    this.add.existing(
      <Stack x={920} y={80} spacing={23}>
        {Object.entries(materials).map(([key, value]) => (
          <Material
            name={key as keyof typeof materials}
            value={computed(() =>
              material_storage[key as keyof typeof materials]
                .get()
                .toFixed(0)
                .toLocaleString()
            )}
          />
        ))}
      </Stack>
    );

    this.add.existing(
      <Stack x={10} y={10} spacing={10}>
        <text text={"Selected Building"} />
        <text
          text={computed(() => mouse_selected_building.get()?.name ?? "")}
        />
      </Stack>
    );

    this.key_one.on("down", () => {
      mouse_selected_building.set(buildings[0]);
    });

    this.key_two.on("down", () => {
      mouse_selected_building.set(buildings[1]);
    });

    this.key_three.on("down", () => {
      mouse_selected_building.set(buildings[2]);
    });

    this.key_four.on("down", () => {
      mouse_selected_building.set(buildings[3]);
    });

    this.key_five.on("down", () => {
      mouse_selected_building.set(buildings[4]);
    });

    this.key_six.on("down", () => {
      mouse_selected_building.set(buildings[5]);
    });

    this.key_seven.on("down", () => {
      mouse_selected_building.set(buildings[6]);
    });

    this.key_eight.on("down", () => {
      mouse_selected_building.set(buildings[7]);
    });

    this.key_nine.on("down", () => {
      mouse_selected_building.set(buildings[8]);
    });

    this.key_zero.on("down", () => {
      mouse_selected_building.set(buildings[9]);
    });

    this.key_escape.on("down", () => {
      mouse_selected_building.set(null);
    });
  }

  registerSystems() {}

  tickLength = 1000;
  tickTimer = 0;

  update(time: number, delta: number) {
    this.tickTimer += delta;
    if (this.tickTimer >= this.tickLength) {
      this.tickTimer = 0;

      material_storage[materials.kWh].set(0);

      materials_generation_order.forEach((material_order) => {
        grid_buildings.forEach((buildingSignal) => {
          const building = buildingSignal.get();

          if (building === null) return;

          // TODO: Fuel cell is evaluating twice because it outputs twice
          if (
            building.output[material_order] === undefined ||
            (material_order === materials.H2O && building.name === "Fuel Cell")
          )
            return;

          //console.log(`${building.name} is generating ${material}'`);
          let successRate = 1;
          Object.entries(building.input).forEach(([input, value]) => {
            const material =
              material_storage[input as keyof typeof materials].get();
            successRate = Math.min(successRate || 1, material / value);
            material_storage[input as keyof typeof materials].update(
              (material) => Math.max(material - value, 0)
            );
          });

          console.log(successRate);

          if (!successRate) return;

          Object.entries(building.output).forEach(([output, value]) => {
            material_storage[output as keyof typeof materials].update(
              (material) => material + value * successRate
            );
          });
        });
      });
    }
  }

  shutdown() {
    if (import.meta.env.VITE_DEBUG) {
      this.scene.stop(SCENES.DEBUG);
    }
  }
}
