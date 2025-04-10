import { RESOURCES } from "@game/assets";
import { COLORS_NAMES } from "@game/consts";
import { computed, effect, signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { ALIGN_ITEMS } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem } from "@game/core/ui/FlexItem";
import { Building } from "@game/entities/buildings/types";
import { GameStateManager } from "@game/state/game-state";

import { MAX_ALLOWANCE, MIN_ALLOWANCE } from "@game/state/consts";

import { NineSlice } from "../NineSlice";
import { BuildingDialsInformation } from "./BuildingDialsInformation";

const boundTargetValue = (target: Signal<number>, cur: number) =>
  target.set(Math.max(MIN_ALLOWANCE, Math.min(MAX_ALLOWANCE, cur)));

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

  const visuals_visibleDial = signal(false);
  const visuals_scaleDial = signal(1);
  const visuals_alphaDial = signal(1);
  const visuals_backgroundTint = signal(0x999999);

  const visuals_dialValue = signal(0);
  const allowanceValue = signal(1);
  const buildingSuccessRate = signal(1);

  const visuals_buttonParticle = window.currentScene.make.particles(
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

  visuals_buttonParticle.setDepth(1);
  visuals_buttonParticle.stop();

  let buttonParticleEmitted = false;

  const dialMachine = (
    <motionMachine initialState="starting">
      <state id="starting">
        <animation on="enter">
          <tween signal={visuals_dialValue} from={2} to={0} duration={1000} />
          <tween signal={buildingSuccessRate} from={1} to={0} duration={500} />
        </animation>
        <transition on="active" target="idle-enter" />
      </state>
      <state id="idle-enter">
        <animation on="enter">
          <step run={() => visuals_visibleDial.set(true)} />
          <parallel>
            <tween signal={visuals_dialValue} from={0} to={10} duration={700} />
            <tween signal={visuals_scaleDial} from={2} to={1} duration={500} />
            <tween signal={visuals_alphaDial} from={0} to={1} duration={500} />
          </parallel>
          <tween signal={visuals_backgroundTint} to={0xcccccc} duration={5} />
          <step run={() => dialMachine.transition("active")} />
        </animation>
        <transition on="active" target="active" />
      </state>
      <state id="active">
        <animation on="active">
          <repeat times={200 * 5 * 60 * 120}>
            <tween
              signal={visuals_dialValue}
              to={allowanceValue}
              duration={200}
            />
          </repeat>
        </animation>
        <transition on="remove" target="remove" />
        <transition on="broken" target="broken" />
      </state>
      <state id="remove">
        <animation on="enter">
          <step run={() => visuals_visibleDial.set(false)} />
          <tween signal={visuals_backgroundTint} to={0x999999} duration={5} />
        </animation>
        <transition on="active" target="idle-enter" />
      </state>
      <state id="broken">
        <animation on="active">
          <step
            run={() => {
              if (!buttonParticleEmitted) {
                visuals_buttonParticle.explode(
                  1,
                  container.x + dialBackground.x,
                  container.y + dialBackground.y
                );

                buttonParticleEmitted = true;
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
      tint={visuals_backgroundTint}
    />
  );

  dialBackground = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-bg-button-breakable#0"
      visible={visuals_visibleDial}
      scale={visuals_scaleDial}
      alpha={visuals_alphaDial}
    />
  );

  dial = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-button-breakable#0"
      visible={visuals_visibleDial}
      scale={visuals_scaleDial}
      alpha={visuals_alphaDial}
      angle={computed(() => {
        if (dialMachine.state?.get() === "active") {
          return 0;
        }

        let val = visuals_dialValue.get();

        // Map the 0-2 range to the -145 to 145 angle range
        return -45 + 90 * (val / 2);
      })}
    />
  );

  let referenceX = 0;
  let pointerIsDown = false;

  container = (
    <container
      width={1}
      onPointerover={() => {
        if (building[1].get()) {
          background.tint = 0xffffff;
          gameState.setHoveredBuilding(building[1].get());
        }
      }}
      onPointerout={() => {
        if (building[1].get()) {
          background.tint = 0xcccccc;
          gameState.setHoveredBuilding(null);
        }
      }}
      onPointerdown={(_t, p) => {
        pointerIsDown = true;
        referenceX = p.x;
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
      const dragDistance = pointer.x - referenceX;
      // each 100 pixels is 1 zone
      const zone = Math.round(dragDistance / 100);
      // but we need to start from the current value
      const currentValue = allowanceValue.get();
      const newValue = currentValue + zone;

      if (newValue !== currentValue) {
        referenceX = pointer.x;
        boundTargetValue(allowanceValue, newValue);
      }
    }
  });

  let accumulatedDelta = 0;

  container.on(
    "wheel",
    (_pointer: Phaser.Input.Pointer, _deltaX: number, deltaY: number) => {
      accumulatedDelta += deltaY;

      if (Math.abs(accumulatedDelta) > 100) {
        const newValue = allowanceValue.get() + accumulatedDelta / 100;
        boundTargetValue(allowanceValue, newValue);
        accumulatedDelta = 0;
      }
    }
  );

  let successRateSubscriptionDispose: (() => void) | null;

  let wasBuilding: Building | null = null;

  effect(() => {
    const buildingSignal = building[1];
    if (buildingSignal) {
      const building = buildingSignal.get();

      if (successRateSubscriptionDispose) {
        successRateSubscriptionDispose();
        successRateSubscriptionDispose = null;
      }

      if (building) {
        wasBuilding = building;
        dialMachine.transition("active");
        successRateSubscriptionDispose =
          building.current_success_rate.subscribe((rate) => {
            buildingSuccessRate.set(rate);
          });
      } else {
        if (wasBuilding) {
          dialMachine.transition("remove");
        }
      }
    }
  });

  allowanceValue.subscribe((value) => {
    const buildingSignal = building[1];
    if (buildingSignal) {
      const building = buildingSignal.get();
      if (building) {
        building.maximum_success_rate.set(value / 2);
      }
    }
  });

  return (
    <Flex containerElement={container}>
      {background}
      <FlexItem attachTo={0} offsetY={8} origin={{ x: 0, y: 0.5 }}>
        <rectangle
          x={computed(() => Math.floor(4 + 17 * buildingSuccessRate.get()))}
          width={computed(() =>
            Math.floor(18 - 17 * buildingSuccessRate.get())
          )}
          height={2}
          fillColor={COLORS_NAMES["dark-knight"]}
        />
      </FlexItem>
      <FlexItem
        attachTo={0}
        offsetX={12}
        offsetY={27}
        origin={{ x: 0.5, y: 0.5 }}
      >
        {dialBackground}
      </FlexItem>
      <FlexItem
        attachTo={0}
        offsetX={12}
        offsetY={27}
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

  const buildingsEntries = Array.from(buildings.entries());

  // Go from 5-0, then 10-5, etc
  // To keep the order more intuitive with what we see on the grid
  for (let j = 0; j < buildingsEntries.length; j += 5) {
    for (let k = j + 4; k >= j; k--) {
      const building = buildingsEntries[k];
      dials.push(<Dial building={building} id={i} gameState={gameState} />);
      i++;
    }
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
            padding={[0, 5, 5, 20]}
          >
            <BuildingDialsInformation gameState={gameState} />
          </Flex>
        </FlexItem>
        <Flex wrapped width={125}>
          {dials}
        </Flex>
      </Flex>
    </FlexItem>
  );
};
