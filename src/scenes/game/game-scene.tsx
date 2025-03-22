import { computed, effect, signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { Stack } from "@game/core/ui/Stack";
import PhaserGamebus from "@game/lib/gamebus";
import { GameStatus } from "@game/state/game-state";
import SoundSystem from "@game/systems/SoundSystem";

import { ThreeCometScene } from "../three/three-comet-scene";

import { BUILDINGS } from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { MATERIALS, MATERIALS_NAMES } from "@game/entities/materials/index";
import MaterialsSystem from "@game/systems/MaterialsSystem";
import { AbstractScene } from "..";
import { SCENES } from "../scenes";

let i = 0;

// background varies from black to white, when it moves
const UI_TEXT_STYLE = {
  color: "#ffffff",
  stroke: "#000000",
  strokeThickness: 2,
  fontSize: "24px",
  align: "center",
  fontFamily: "jersey15",
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
      onPointerover={(self, pointer) => {
        if (grid_buildings.get(id)?.get() !== null) {
          const tooltipText = (
            <text
              text="Double-click to remove"
              x={pointer.x + 10}
              y={pointer.y - 10}
              style={{
                fontSize: "14px",
                backgroundColor: "#000000",
                padding: { x: 5, y: 2 },
                color: "#ffffff",
              }}
            />
          );
          self.scene.add.existing(tooltipText);
          (self as any).tooltipText = tooltipText;

          (self.first! as Phaser.GameObjects.Rectangle).strokeColor = 0xff0000;
          (self.first! as Phaser.GameObjects.Rectangle).lineWidth = 2;
        }
        (self.first! as Phaser.GameObjects.Rectangle).fillColor =
          mouse_selected_building.get() !== null ? 0xaaffaa : 0xdddddd;
        // needs a scene reference
        // this.soundSystem.play("sfx-click");
      }}
      onPointerout={(self) => {
        if ((self as any).tooltipText) {
          (self as any).tooltipText.destroy();
          (self as any).tooltipText = null;
        }
        (self.first! as Phaser.GameObjects.Rectangle).strokeColor = 0x000000;
        (self.first! as Phaser.GameObjects.Rectangle).lineWidth = 1;
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

const mouse_selected_building = signal<Building | null>(null);

export class GameScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;
  threeCometScene: ThreeCometScene;

  constructor() {
    super(SCENES.GAME);
  }
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
  key_w!: Phaser.Input.Keyboard.Key;
  key_w_pressed: boolean;
  key_a!: Phaser.Input.Keyboard.Key;
  key_a_pressed: boolean;
  key_s!: Phaser.Input.Keyboard.Key;
  key_s_pressed: boolean;
  key_d!: Phaser.Input.Keyboard.Key;
  key_d_pressed: boolean;
  key_p!: Phaser.Input.Keyboard.Key;
  key_m!: Phaser.Input.Keyboard.Key;

  soundSystem!: SoundSystem;
  materialsSystem!: MaterialsSystem;

  create() {
    this.bus = this.gamebus.getBus();

    this.scene.run(SCENES.THREE_COMET);
    this.threeCometScene = this.scene.get(
      SCENES.THREE_COMET
    ) as ThreeCometScene;

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
    this.key_w = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.key_a = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.key_s = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.key_d = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.key_p = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.key_m = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);

    this.registerSystems();

    this.gameState.setGameStatus(GameStatus.RUNNING);

    <Stack x={130} y={90} spacing={8}>
      {BUILDINGS.map((building) => (
        <Button building={building} />
      ))}
    </Stack>;

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

    this.key_w.on("down", () => {
      this.key_w_pressed = true;
    });
    this.key_w.on("up", () => {
      this.key_w_pressed = false;
    });
    this.key_a.on("down", () => {
      this.key_a_pressed = true;
    });
    this.key_a.on("up", () => {
      this.key_a_pressed = false;
    });
    this.key_s.on("down", () => {
      this.key_s_pressed = true;
    });
    this.key_s.on("up", () => {
      this.key_s_pressed = false;
    });
    this.key_d.on("down", () => {
      this.key_d_pressed = true;
    });
    this.key_d.on("up", () => {
      this.key_d_pressed = false;
    });

    this.key_p.on("down", () => {
      this.scene.pause(SCENES.THREE_COMET);
      this.scene.pause(SCENES.GAME);
      this.scene.launch(SCENES.UI_PAUSE);

      console.log("Pausing");
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
    this.materialsSystem = new MaterialsSystem(this.gameState).create();
  }

  tickLength = 1000;
  tickTimer = 0;

  update(time: number, delta: number) {
    const cameraDeltaX: number =
      (this.key_a_pressed ? 1 : 0) - (this.key_d_pressed ? 1 : 0);
    const cameraDeltaY: number =
      (this.key_w_pressed ? 1 : 0) - (this.key_s_pressed ? 1 : 0);

    if (cameraDeltaX !== 0 || cameraDeltaY !== 0) {
      this.threeCometScene.camera.addOrigin(
        cameraDeltaX / 1000,
        0,
        cameraDeltaY / 1000
      );
    }

    this.materialsSystem.update(time, delta);
  }

  shutdown() {}
}
