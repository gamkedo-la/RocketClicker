import { RESOURCES } from "@game/assets";
import { COLORS_NAMES } from "@game/consts";
import { Signal } from "@game/core/signals/types";
import { computed, effect, signal } from "@game/core/signals/signals";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem } from "@game/core/ui/FlexItem";
import { Building } from "@game/entities/buildings/types";
import { GameStateManager } from "@game/state/game-state";
import { ALIGN_ITEMS } from "@game/core/ui/AbstractFlex";

import { NineSlice } from "../nineslice";

const Dial = ({
  id,
  building,
  gameState,
}: {
  id: number;
  building: [number, Signal<Building | null>];
  gameState: GameStateManager;
}) => {
  let container: Phaser.GameObjects.Container;
  let dialBackground: Phaser.GameObjects.Image;
  let dial: Phaser.GameObjects.Image;

  if (id === 12) {
    return (
      <Flex>
        <image
          texture={RESOURCES["ui-left-panel"]}
          frame="bg-dial-button-breakable#0"
          tint={0x999999}
        />
        <FlexItem
          attachTo={0}
          offsetY={8}
          offsetX={4}
          origin={{ x: 0, y: 0.5 }}
        >
          <rectangle
            width={18}
            height={2}
            fillColor={COLORS_NAMES["dark-knight"]}
          />
        </FlexItem>
      </Flex>
    );
  }

  const visibleDial = signal(false);
  const scaleDial = signal(1);
  const alphaDial = signal(1);
  const backgroundTint = signal(0x999999);

  const value = signal(0);
  const targetValue = signal(0);

  const p = window.currentScene.make.particles(
    {
      config: {
        rotate: { min: 0, max: 360 },
        gravityY: 800,
        lifespan: 3000,
        speed: { min: 100, max: 200 },
        texture: RESOURCES["ui-left-panel"],
        frame: "dial-bg-button-breakable#0",
      },
    },
    true
  );

  p.setDepth(1);
  p.stop();

  let particle = false;

  const dialMachine = (
    <motionMachine initialState="starting">
      <state id="starting">
        <animation on="enter">
          <tween signal={value} from={100} to={0} duration={1000} />
        </animation>
        <transition on="idle" target="idle-enter" />
      </state>
      <state id="idle-enter">
        <animation on="enter">
          <step run={() => visibleDial.set(true)} />
          <parallel>
            <tween signal={value} from={100} to={0} duration={700} />
            <tween signal={scaleDial} from={2} to={1} duration={500} />
            <tween signal={alphaDial} from={0} to={1} duration={500} />
          </parallel>
          <tween signal={backgroundTint} to={0xcccccc} duration={5} />
          <step run={() => dialMachine.transition("idle")} />
        </animation>
        <transition on="idle" target="idle" />
      </state>
      <state id="idle">
        <animation on="active">
          <repeat times={0}>
            <tween signal={value} from={0} to={100} duration={2000} />
            <tween signal={value} from={100} to={0} duration={2000} />
          </repeat>
        </animation>
        <transition on="active" target="active" />
      </state>
      <state id="active-idle">
        <transition on="active" target="active" />
      </state>
      <state id="active">
        <animation on="active">
          <repeat times={10000}>
            <tween signal={value} to={targetValue} duration={200} />
          </repeat>
        </animation>
        <transition on="idle" target="active-idle" />
        <transition on="broken" target="broken" />
      </state>
      <state id="broken">
        <animation on="active">
          <step
            run={() => {
              if (!particle) {
                p.explode(
                  1,
                  container.x + dialBackground.x,
                  container.y + dialBackground.y
                );

                particle = true;
              }

              dialBackground.setVisible(false);
              dial.setVisible(false);
            }}
          />
        </animation>
      </state>
    </motionMachine>
  );

  const background = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="bg-dial-button-breakable#0"
      tint={backgroundTint}
    />
  );

  dialBackground = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-bg-button-breakable#0"
      visible={visibleDial}
      scale={scaleDial}
      alpha={alphaDial}
    />
  );

  dial = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-button-breakable#0"
      visible={visibleDial}
      scale={scaleDial}
      alpha={alphaDial}
      angle={computed(() => {
        if (dialMachine.state?.get() === "active") {
          return 0;
        }

        let val = value.get();

        return -145 + 290 * (val / 100);
      })}
    />
  );

  let referenceX = 0;
  let referenceY = 0;
  let pointerIsDown = false;

  container = (
    <container
      width={1}
      onPointerover={() => {
        if (building[1].get()) {
          background.tint = 0xffffff;
          gameState.setHoveredBuilding(building[1].get());
          dialMachine.transition("active");
        }
      }}
      onPointerout={() => {
        if (building[1].get()) {
          background.tint = 0xcccccc;
          gameState.setHoveredBuilding(null);
          dialMachine.transition("idle");
        }
      }}
      onPointerdown={(t, p, x, y) => {
        pointerIsDown = true;
        referenceX = p.x;
        referenceY = p.y;
      }}
      onPointerup={() => {
        if (building[1].get()) {
          background.tint = 0xffffff;
          pointerIsDown = false;
        }
      }}
    />
  );

  container.setInteractive({ draggable: true, useHandCursor: true });

  container.on("drag", (pointer: Phaser.Input.Pointer) => {
    if (pointerIsDown) {
      if (pointer.distance > 100) {
        dialMachine.transition("broken");
      }

      const m = pointer.x - referenceX;
      targetValue.update((cur) => Math.max(0, Math.min(100, cur + m / 10)));
    }
  });

  container.on(
    "wheel",
    (pointer: Phaser.Input.Pointer, deltaX: number, deltaY: number) => {
      console.log("wheeel", pointer, deltaX, deltaY);
      if (Math.abs(deltaY) > 60) {
        dialMachine.transition("broken");
      }

      targetValue.update((cur) => Math.max(0, Math.min(100, cur + deltaY)));
    }
  );

  effect(() => {
    const buildingSignal = building[1];
    if (buildingSignal) {
      const building = buildingSignal.get();
      if (building) {
        dialMachine.transition("idle");
      }
    }
  });

  return (
    <Flex containerElement={container}>
      {background}
      <FlexItem attachTo={0} offsetY={8} origin={{ x: 0, y: 0.5 }}>
        <rectangle
          x={computed(() => Math.floor(4 + 17 * (value.get() / 100)))}
          width={computed(() => Math.floor(18 - 17 * (value.get() / 100)))}
          height={2}
          fillColor={COLORS_NAMES["dark-knight"]}
        />
      </FlexItem>
      <FlexItem
        attachTo={0}
        offsetX={12}
        offsetY={22}
        origin={{ x: 0.5, y: 0.5 }}
      >
        {dialBackground}
      </FlexItem>
      <FlexItem
        attachTo={0}
        offsetX={12}
        offsetY={22}
        origin={{ x: 0.5, y: 0.5 }}
      >
        {dial}
      </FlexItem>
    </Flex>
  );
};

export const BuildingsPanel = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const buildings = gameState.state.get().board.grid_buildings;

  const dials = [];
  let i = 0;

  for (const building of buildings.entries()) {
    dials.push(<Dial building={building} id={i} gameState={gameState} />);
    i++;
  }

  return (
    <FlexItem align={ALIGN_ITEMS.STRETCH} grow={1}>
      <Flex>
        <FlexItem align={ALIGN_ITEMS.STRETCH} grow={1}>
          <Flex
            backgroundElement={
              <NineSlice
                texture={RESOURCES["ui-left-panel"]}
                frame="bg-rocket-goal"
              />
            }
            padding={[10, 5, 5, 20]}
          >
            <text
              text={computed(
                () => gameState.state.get().hovered_building.get()?.name || ""
              )}
            />
          </Flex>
        </FlexItem>
        <Flex wrapped width={125}>
          {dials}
        </Flex>
      </Flex>
    </FlexItem>
  );
};
