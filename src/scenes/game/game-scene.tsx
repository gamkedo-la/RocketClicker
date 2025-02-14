import { computed, effect, signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { Stack } from "@game/core/ui/Stack";
import PhaserGamebus from "@game/lib/gamebus";
import { GameStatus } from "@game/state/game-state";
import SoundSystem from "@game/systems/SoundSystem";

import { Building } from "@game/entities/buildings/types";
import { AbstractScene } from "..";
import { SCENES } from "../scenes";
import {
  MATERIALS,
  MATERIALS_GENERATION_ORDER,
  MATERIALS_NAMES,
} from "@game/entities/materials/index";
import { BUILDINGS } from "@game/entities/buildings/index";

let i = 0;

// background varies from black to white, when it moves
const UI_TEXT_STYLE = {
  color: "#ffffff",
  stroke: "#000000",
  strokeThickness: 3,
  align: "center",
};

function hasResources(
  building: Building,
  material_storage: Record<string, Signal<number>>
) {
  return Object.entries(building.building_cost).every(([material, value]) => {
    return material_storage[material as keyof typeof MATERIALS].get() >= value;
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
          // needs a scene reference
          // this.soundSystem.play("sfx-click");
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
          MATERIALS_NAMES[
            Object.keys(
              building.building_cost
            )[0] as keyof typeof MATERIALS_NAMES
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
              material_storage[material as keyof typeof MATERIALS].update(
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
        // needs a scene reference
        // this.soundSystem.play("sfx-click");
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
        style={UI_TEXT_STYLE}
      />
      <text
        x={0}
        y={-20}
        origin={0.5}
        text={computed(() => building.get()?.name ?? "")}
        wordWrapWidth={width}
        style={UI_TEXT_STYLE}
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
                  MATERIALS_NAMES[key as keyof typeof MATERIALS_NAMES]
                }]`
            )
            .join("\n");
          const outputs = Object.entries(building.get()?.output ?? {})
            .map(
              ([key, value]) =>
                `[← ${value.toLocaleString([], { maximumFractionDigits: 0 })} ${
                  MATERIALS_NAMES[key as keyof typeof MATERIALS_NAMES]
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
  name: keyof typeof MATERIALS;
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
        text={`${MATERIALS_NAMES[name]}`}
        style={UI_TEXT_STYLE}
      />
      {number_text}
    </container>
  );
}

function showFloatingChange(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: number,
  color: string = "#00ff00"
) {
  const formattedValue = value >= 0 ? `+${value}` : value.toString();
  const text = scene.add.text(x, y, formattedValue, {
    fontSize: "32px",
    color: color,
    fontStyle: "bold",
  });
  text.setOrigin(0.5);

  scene.tweens.add({
    targets: text,
    y: y - 120,
    alpha: { from: 1, to: 0 },
    duration: 3000,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy(),
  });
}

const tick = signal(0);

export const material_storage: Record<
  keyof typeof MATERIALS,
  Signal<number>
> = {
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
  paused: boolean;
  muted: boolean;
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
  key_p!: Phaser.Input.Keyboard.Key;
  key_m!: Phaser.Input.Keyboard.Key;
  soundSystem!: SoundSystem;

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
    this.key_p = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.key_m = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.registerSystems();

    this.gameState.setGameStatus(GameStatus.RUNNING);

    this.add.existing(
      <Stack x={10} y={10} spacing={10}>
        <text
          text={
            "Selected Building            Star Dust = SD | Metals = M | Pure Metals = PM"
          }
          style={UI_TEXT_STYLE}
        />
        <text
          text={computed(() => mouse_selected_building.get()?.name ?? "")}
          style={UI_TEXT_STYLE}
        />
      </Stack>
    );

    this.add.existing(
      <Stack x={130} y={90} spacing={8}>
        {BUILDINGS.map((building) => (
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
        {Object.entries(MATERIALS).map(([key, _]) => (
          <Material
            name={key as keyof typeof MATERIALS}
            value={material_storage[key as keyof typeof MATERIALS]}
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
          if (this.paused) {
            return;
          }
          console.log("Stardust mining button clicked!");
          console.log("Before:", material_storage[MATERIALS.StarDust].get());
          material_storage[MATERIALS.StarDust].update(
            (material) => material + 20
          );
          console.log("After:", material_storage[MATERIALS.StarDust].get());
          showFloatingChange(this, self.x, self.y, 20);
          (self.first! as any).fillColor = 0xaaaaa00;
          // needs a scene reference
          // this.soundSystem.play("sfx-mine-stardust");
        }}
        onPointerup={(self) => {
          (self.first! as any).fillColor = 0xffffaa;
        }}
        onPointerover={(self) => {
          (self.first! as any).fillColor = 0xffffaa;
          // needs a scene reference
          // this.soundSystem.play("sfx-click");
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
      if (hasResources(BUILDINGS[0], material_storage)) {
        mouse_selected_building.set(BUILDINGS[0]);
        this.soundSystem.play("build-generator");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_two.on("down", () => {
      if (hasResources(BUILDINGS[1], material_storage)) {
        mouse_selected_building.set(BUILDINGS[1]);
        this.soundSystem.play("build-solarpanel");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_three.on("down", () => {
      if (hasResources(BUILDINGS[2], material_storage)) {
        mouse_selected_building.set(BUILDINGS[2]);
        this.soundSystem.play("build-fuelcell");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_four.on("down", () => {
      if (hasResources(BUILDINGS[3], material_storage)) {
        mouse_selected_building.set(BUILDINGS[3]);
        this.soundSystem.play("build-duster");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_five.on("down", () => {
      if (hasResources(BUILDINGS[4], material_storage)) {
        mouse_selected_building.set(BUILDINGS[4]);
        this.soundSystem.play("build-miner");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_six.on("down", () => {
      if (hasResources(BUILDINGS[5], material_storage)) {
        mouse_selected_building.set(BUILDINGS[5]);
        this.soundSystem.play("build-chemicalplant");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_seven.on("down", () => {
      if (hasResources(BUILDINGS[6], material_storage)) {
        mouse_selected_building.set(BUILDINGS[6]);
        this.soundSystem.play("build-condenserl");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_eight.on("down", () => {
      if (hasResources(BUILDINGS[7], material_storage)) {
        mouse_selected_building.set(BUILDINGS[7]);
        this.soundSystem.play("build-electrolysis");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_nine.on("down", () => {
      if (hasResources(BUILDINGS[8], material_storage)) {
        mouse_selected_building.set(BUILDINGS[8]);
        this.soundSystem.play("build-H2compressor");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_zero.on("down", () => {
      if (hasResources(BUILDINGS[9], material_storage)) {
        mouse_selected_building.set(BUILDINGS[9]);
        this.soundSystem.play("build-O2compressor");
      } else {
        this.soundSystem.play("sfx-gui-deny");
      }
    });

    this.key_escape.on("down", () => {
      mouse_selected_building.set(null);
      this.soundSystem.play("sfx-gui-confirm");
    });

    this.key_p.on("down", () => {
      this.paused = !this.paused;
      if (this.paused) {
        this.scene.pause(SCENES.THREE_COMET);
        this.scene.launch(SCENES.UI_PAUSE);
      } else {
        this.scene.run(SCENES.THREE_COMET);
      }
      console.log(this.paused + " Is the Pause state");
    });

    this.key_m.on("down", () => {
      this.muted = !this.muted;
      this.soundSystem.setSoundMute(this.muted);
    });

    let timer = signal(0);

    const timer_event = this.time.addEvent({
      delay: 1000,
      repeat: -1,
      callback: () => {
        if (this.paused) {
          return;
        }
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
        style={{ ...UI_TEXT_STYLE, align: "center" }}
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
        material_storage[MATERIALS.LH2].get() > 140_000 &&
        material_storage[MATERIALS.LOX].get() > 30_000
      ) {
        timer_event.remove();
        timer_text.setStyle({ color: "#aaff00", fontSize: "48px" });
        rocket_text.setStyle({ color: "#ffaa00", fontSize: "48px" });
        rocket_text.setText("Rocket launched!");
      }
    });

    this.scene.run(SCENES.HUD);
    // TODO: it seems that the external + threejs wrecks the scale math, so here is a hack
    setTimeout(() => {
      this.scale.refresh();
    }, 100);
  }

  registerSystems() {
    console.log("registering systems");
    this.soundSystem = new SoundSystem(this);
  }

  tickLength = 1000;
  tickTimer = 0;

  update(_time: number, delta: number) {
    if (this.paused) {
      return;
    }
    this.tickTimer += delta;
    if (this.tickTimer >= this.tickLength) {
      this.tickTimer = 0;

      tick.update((tick) => tick + 1);

      material_storage[MATERIALS.kWh].set(0);

      MATERIALS_GENERATION_ORDER.forEach((material_order) => {
        grid_buildings.forEach((buildingSignal) => {
          const building = buildingSignal.get();

          if (building === null) return;

          // TODO: Fuel cell is evaluating twice because it outputs twice
          if (
            building.output[material_order] === undefined ||
            (material_order === MATERIALS.H2O && building.name === "Fuel Cell")
          )
            return;

          //console.log(`${building.name} is generating ${material}'`);
          let successRate = 1;
          Object.entries(building.input).forEach(([input, value]) => {
            const material =
              material_storage[input as keyof typeof MATERIALS].get();
            successRate = Math.min(successRate || 1, material / value);
            material_storage[input as keyof typeof MATERIALS].update(
              (material) => Math.max(material - value, 0)
            );
          });

          if (!successRate) return;

          Object.entries(building.output).forEach(([output, value]) => {
            material_storage[output as keyof typeof MATERIALS].update(
              (material) => material + value * successRate
            );
          });
        });
      });
    }
  }

  shutdown() {}
}
