import { RESOURCES } from "@game/assets";

import { FiniteStateMachine } from "@game/core/state-machine/state-machine";

import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexColumn } from "@game/core/ui/FlexColumn";

import { STRING_COLORS_NAMES } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { Building } from "@game/entities/buildings/types";

import { NineSlice } from "./nineslice";
import { GameStateManager } from "@game/state/game-state";

export const Button = ({
  building,
  gameState,
}: {
  building: Building;
  gameState: GameStateManager;
}) => {
  const active = signal<boolean>(false);

  const state: FiniteStateMachine<
    "hovered" | "pressed" | "available" | "unavailable",
    "mouseenter" | "mouseleave" | "mousedown" | "mouseup" | "resourceAvailable"
  > = (
    <stateMachine initialState="available">
      <state id="unavailable">
        <transition event="resourceAvailable" target="available" />
      </state>
      <state id="available">
        <transition event="mouseenter" target="hovered" />
      </state>
      <state id="hovered">
        <transition event="mouseleave" target="available" />
        {/* Guard for mousedown if resource is available */}
        <transition event="mousedown" target="pressed" />
      </state>
      <state id="pressed">
        <transition event="mouseleave" target="available" />
        <transition event="mouseup" target="hovered" />
      </state>
    </stateMachine>
  );

  const image = (
    <image
      interactive
      texture={RESOURCES["ui-left-panel"]}
      frame={"button-building#0"}
      onPointerover={() => state.transition("mouseenter")}
      onPointerout={() => state.transition("mouseleave")}
      onPointerdown={() => state.transition("mousedown")}
      onPointerup={() => state.transition("mouseup")}
    />
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

  return image;
};

export function BuildingSelector({
  building,
  gameState,
}: {
  building: Building;
  gameState: GameStateManager;
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
            color: STRING_COLORS_NAMES["dark-knight"],
            shadow: {
              color: STRING_COLORS_NAMES["white"],
              offsetX: 0,
              offsetY: 1,
              blur: 0,
              fill: true,
            },
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
        <Button building={building} gameState={gameState} />
      </Flex>
    </Flex>
  );
}
