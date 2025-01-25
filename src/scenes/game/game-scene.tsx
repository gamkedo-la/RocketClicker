import { GameStatus } from "@game/state/game-state";
import { computed, effect, signal } from "@game/state/lib/signals";
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
          (self.first! as Phaser.GameObjects.Rectangle).fillColor = 0xffff00;
        }
      }}
      onPointerout={(self) => {
        (self.first! as Phaser.GameObjects.Rectangle).fillColor =
          current_rectangle_color.get();
      }}
      onPointerdown={(self) => {
        if (canBuildBuilding.get()) {
          (self.first! as Phaser.GameObjects.Rectangle).fillColor = 0x00ff00;
          if (mouse_selected_building.get()?.name !== building.name) {
            mouse_selected_building.set(building);
          } else {
            mouse_selected_building.set(null);
          }
        }
      }}
      onPointerup={(self) => {
        (self.first! as Phaser.GameObjects.Rectangle).fillColor =
          current_rectangle_color.get();
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
        y={3}
        origin={{ x: 0.5, y: 0 }}
        text={`${Object.values(building.building_cost)} ${
          materials_names[
            Object.keys(
              building.building_cost
            )[0] as keyof typeof materials_names
          ]
        }`}
        style={computed(() => ({
          color: canBuildBuilding.get() ? "#00ff00" : "#ff0000",
          fontSize: "14px",
        }))}
      />
      <text
        x={0}
        y={20}
        origin={{ x: 0.5, y: 0 }}
        text={`${Object.keys(building.input).join(", ")} → ${Object.keys(
          building.output
        ).join(", ")}`}
        style={{ color: "#ffffff" }}
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
  building: Signal<Building | null> | null;
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
          (self.first! as Phaser.GameObjects.Rectangle).fillColor = 0xaaaaff;
        }

        lastClick = pointer.time;
      }}
      onPointerup={(self) => {
        (self.first! as Phaser.GameObjects.Rectangle).fillColor = 0xdddddd;
      }}
      onPointerover={(self) => {
        (self.first! as Phaser.GameObjects.Rectangle).fillColor =
          mouse_selected_building.get() !== null ? 0xaaffaa : 0xdddddd;
      }}
      onPointerout={(self) => {
        (self.first! as Phaser.GameObjects.Rectangle).fillColor = 0xffffff;
      }}
    >
      <rectangle width={width} height={height} fillColor={0xffffff} />
      <text
        x={0}
        y={0}
        origin={0.5}
        text={computed(() => (building.get() ? "" : text))}
        style={{ color: "#000000" }}
      />
      <text
        x={0}
        y={-20}
        origin={0.5}
        text={computed(() => building.get()?.name ?? "")}
        wordWrapWidth={width}
        style={{ color: "#000000", align: "center" }}
      />
      <text
        x={0}
        y={25}
        origin={0.5}
        text={computed(() => {
          if (building.get() === null) return "";
          const inputs = Object.entries(building.get()?.input ?? {})
            .map(
              ([key, value]) =>
                `[→ ${value.toLocaleString([], { maximumFractionDigits: 0 })} ${
                  materials_names[key as keyof typeof materials_names]
                }]`
            )
            .join("\n");
          const outputs = Object.entries(building.get()?.output ?? {})
            .map(
              ([key, value]) =>
                `[← ${value.toLocaleString([], { maximumFractionDigits: 0 })} ${
                  materials_names[key as keyof typeof materials_names]
                }]`
            )
            .join("\n");
          return `${inputs}\n${outputs}`;
        })}
        style={{ color: "#ffffff", fontSize: "12px" }}
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
  let prev = 0;

  const number_text: Phaser.GameObjects.Text = (
    <text
      x={10}
      y={0}
      origin={0}
      text={computed(() =>
        value.get().toLocaleString([], { maximumFractionDigits: 0 })
      )}
      style={{ color: "#000000" }}
    />
  );

  effect(() => {
    let curr = value.get();

    // console.log(name, "prev", prev, "curr", curr);

    if (prev < curr) {
      number_text.setStyle({ color: "#00ff00" });
    } else if (prev > curr) {
      number_text.setStyle({ color: "#ff0000" });
    }

    prev = curr;
  });

  return (
    <container x={x} y={y}>
      <text
        x={0}
        y={0}
        origin={{ x: 1, y: 0 }}
        text={`${materials_names[name]}`}
        style={{ color: "#000000" }}
      />
      {number_text}
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

const materials_names = {
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

const tick = signal(0);

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

    this.scene.run(SCENES.THREE_COMET);

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

    this.gameState.setGameStatus(GameStatus.RUNNING);

    this.add.existing(
      <Stack x={10} y={10} spacing={10}>
        <text
          text={
            "Selected Building            Star Dust = SD | Metals = M | Pure Metals = PM"
          }
        />
        <text
          text={computed(() => mouse_selected_building.get()?.name ?? "")}
        />
      </Stack>
    );

    this.add.existing(
      <Stack x={130} y={90} spacing={8}>
        {buildings.map((building) => (
          <Button building={building} />
        ))}
      </Stack>
    );

    const grid_container = (
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
        {Object.entries(materials).map(([key, _]) => (
          <Material
            name={key as keyof typeof materials}
            value={material_storage[key as keyof typeof materials]}
          />
        ))}
      </Stack>
    );

    this.add.existing(
      <container
        x={920}
        y={500}
        width={100}
        height={100}
        interactive
        onPointerdown={(self) => {
          material_storage[materials.StarDust].update(
            (material) => material + 20
          );
          (self.first! as any).fillColor = 0xaaaaa00;
        }}
        onPointerup={(self) => {
          (self.first! as any).fillColor = 0xffffaa;
        }}
        onPointerover={(self) => {
          (self.first! as any).fillColor = 0xffffaa;
        }}
        onPointerout={(self) => {
          (self.first! as any).fillColor = 0xffffff;
        }}
      >
        <rectangle width={140} height={60} fillColor={0xffffff} />
        <text
          x={0}
          y={0}
          origin={0.5}
          text={"Mine StarDust\n(+20)"}
          style={{ color: "#000000", align: "center" }}
        />
      </container>
    );

    this.key_one.on("down", () => {
      if (hasResources(buildings[0], material_storage)) {
        mouse_selected_building.set(buildings[0]);
      }
    });

    this.key_two.on("down", () => {
      if (hasResources(buildings[1], material_storage)) {
        mouse_selected_building.set(buildings[1]);
      }
    });

    this.key_three.on("down", () => {
      if (hasResources(buildings[2], material_storage)) {
        mouse_selected_building.set(buildings[2]);
      }
    });

    this.key_four.on("down", () => {
      if (hasResources(buildings[3], material_storage)) {
        mouse_selected_building.set(buildings[3]);
      }
    });

    this.key_five.on("down", () => {
      if (hasResources(buildings[4], material_storage)) {
        mouse_selected_building.set(buildings[4]);
      }
    });

    this.key_six.on("down", () => {
      if (hasResources(buildings[5], material_storage)) {
        mouse_selected_building.set(buildings[5]);
      }
    });

    this.key_seven.on("down", () => {
      if (hasResources(buildings[6], material_storage)) {
        mouse_selected_building.set(buildings[6]);
      }
    });

    this.key_eight.on("down", () => {
      if (hasResources(buildings[7], material_storage)) {
        mouse_selected_building.set(buildings[7]);
      }
    });

    this.key_nine.on("down", () => {
      if (hasResources(buildings[8], material_storage)) {
        mouse_selected_building.set(buildings[8]);
      }
    });

    this.key_zero.on("down", () => {
      if (hasResources(buildings[9], material_storage)) {
        mouse_selected_building.set(buildings[9]);
      }
    });

    this.key_escape.on("down", () => {
      mouse_selected_building.set(null);
    });

    let timer = signal(0);

    const timer_event = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        timer.update((timer) => timer + 1);
      },
    });

    let timer_text = this.add.existing(
      <text
        text={computed(() => {
          const minutes = Math.floor(timer.get() / 60);
          const seconds = timer.get() % 60;
          return `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;
        })}
        origin={0.33}
        x={this.cameras.main.width / 2}
        y={75}
        style={{ fontSize: "32px", align: "center" }}
      />
    );

    let rocket_text = this.add.existing(
      <text
        text={`You need 140,000 LH2 and 30,000 LOX to launch the rocket`}
        origin={0.5}
        x={this.cameras.main.width / 2 + 20}
        y={125}
        style={{ align: "center" }}
      />
    );

    effect(() => {
      if (
        material_storage[materials.LH2].get() > 140_000 &&
        material_storage[materials.LOX].get() > 30_000
      ) {
        timer_event.remove();
        timer_text.setStyle({ color: "#aaff00", fontSize: "48px" });
        rocket_text.setStyle({ color: "#ffaa00", fontSize: "48px" });
        rocket_text.setText("Rocket launched!");
      }
    });
  }

  registerSystems() {}

  tickLength = 1000;
  tickTimer = 0;

  update(_time: number, delta: number) {
    this.tickTimer += delta;
    if (this.tickTimer >= this.tickLength) {
      this.tickTimer = 0;

      tick.update((tick) => tick + 1);

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

  shutdown() {}
}
