import { RESOURCES } from "@game/assets";

import { FiniteStateMachine } from "@game/core/state-machine/state-machine";

import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexColumn } from "@game/core/ui/FlexColumn";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed } from "@game/core/signals/signals";
import { Building } from "@game/entities/buildings/types";

import { MotionMachine } from "@game/core/motion-machine/motion-machine";
import { FlexItem } from "@game/core/ui/FlexItem";
import { hasResources } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { NineSlice } from "../nineslice";
import { Signal } from "@game/core/signals/types";

export const Button = ({
  building,
  gameState,
  motionMachine,
  hoveredBuilding,
}: {
  building: Building;
  gameState: GameStateManager;
  motionMachine: MotionMachine<
    "hidden" | "visible",
    "mouseenter" | "mouseleave"
  >;
  hoveredBuilding: Signal<Building | null>;
}) => {
  let active = computed(() =>
    hasResources(building, gameState.state.get().material_storage)
  );

  const state: FiniteStateMachine<
    "hovered" | "pressed" | "available" | "unavailable",
    "mouseenter" | "mouseleave" | "mousedown" | "mouseup" | "resourceAvailable"
  > = (
    <stateMachine initialState="available">
      <state id="unavailable">
        <transition on="resourceAvailable" target="available" />
      </state>
      <state id="available">
        <transition on="mouseenter" target="hovered" />
      </state>
      <state id="hovered">
        <transition on="mouseleave" target="available" />
        {/* Guard for mousedown if resource is available */}
        <transition on="mousedown" target="pressed" />
      </state>
      <state id="pressed">
        <transition on="mouseleave" target="available" />
        <transition on="mouseup" target="hovered" />
      </state>
    </stateMachine>
  );

  const image = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame={"button-building#0"}
      origin={[0, 0]}
      tint={computed(() =>
        active.get() ? 0xffffff : COLORS_NAMES["peaches-of-immortality"]
      )}
    />
  );

  const status: Phaser.GameObjects.Image = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame={"button-ring#0"}
      tint={computed(() =>
        active.get() ? COLORS_NAMES["white"] : COLORS_NAMES["elite-teal"]
      )}
      width={image.width}
      height={image.height}
    />
  );

  const button = (
    <Flex
      containerElement={
        <container
          interactive
          onPointerover={() => {
            if (active.get()) {
              state.transition("mouseenter");
              motionMachine.transition("mouseenter");
              hoveredBuilding.set(building);
            }
          }}
          onPointerout={() => {
            state.transition("mouseleave");
            motionMachine.transition("mouseleave");
            hoveredBuilding.set(null);
          }}
          onPointerdown={() => state.transition("mousedown")}
          onPointerup={() => state.transition("mouseup")}
        />
      }
    >
      {image}
      <FlexItem attachTo={0} offsetX={8} offsetY={16}>
        {status}
      </FlexItem>
    </Flex>
  );

  <stateObserver fsm={state}>
    <onEnter
      state="available"
      run={() => {
        image.setFrame("button-building#0");
      }}
    />
    <onEnter
      state="hovered"
      run={() => {
        image.setFrame("button-building#1");
      }}
    />
    <onEnter
      state="pressed"
      run={() => {
        image.setFrame("button-building#2");
      }}
    />
    <onExit
      state="pressed"
      run={() => {
        gameState.setMouseSelectedBuilding(building);
      }}
    />
  </stateObserver>;

  return button;
};

export function BuildingSelector({
  building,
  gameState,
  buildingPanelMotionMachine,
  hoveredBuilding,
}: {
  building: Building;
  gameState: GameStateManager;
  hoveredBuilding: Signal<Building | null>;
  buildingPanelMotionMachine: MotionMachine<
    "hidden" | "visible",
    "mouseenter" | "mouseleave"
  >;
}): FlexColumn {
  return (
    <Flex
      direction={DIRECTION.COLUMN}
      alignContent={ALIGN_ITEMS.STRETCH}
      backgroundElement={
        <NineSlice
          texture={RESOURCES["ui-left-panel"]}
          frame={"bg-buildings"}
        />
      }
      padding={6}
      width={76}
      margin={2}
    >
      <Flex
        backgroundElement={
          <NineSlice
            texture={RESOURCES["ui-left-panel"]}
            frame={"title-bg-buildings"}
          />
        }
        padding={[4, 3]}
        justify={JUSTIFY.CENTER}
      >
        <text
          text={building.name}
          style={{
            color: STRING_COLORS_NAMES["elite-teal"],
          }}
        />
      </Flex>
      <Flex justify={JUSTIFY.SPACE_EVENLY}>
        <Flex
          direction={DIRECTION.COLUMN}
          alignContent={ALIGN_ITEMS.CENTER}
          margin={2}
        >
          <text
            text={[Object.keys(building.input)].join("\n")}
            style={{
              fontSize: 12,
              color: STRING_COLORS_NAMES["castro"],
            }}
          />
          <image
            texture={RESOURCES["ui-left-panel"]}
            frame={"building-arrow#0"}
          />
          <text
            text={[Object.keys(building.output)].join("\n")}
            style={{
              fontSize: 12,
              color: STRING_COLORS_NAMES["castro"],
            }}
          />
        </Flex>
        <Button
          motionMachine={buildingPanelMotionMachine}
          building={building}
          gameState={gameState}
          hoveredBuilding={hoveredBuilding}
        />
      </Flex>
    </Flex>
  );
}
