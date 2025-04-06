import { RESOURCES } from "@game/assets";

import { FiniteStateMachine } from "@game/core/state-machine/state-machine";

import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexColumn } from "@game/core/ui/FlexColumn";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed } from "@game/core/signals/signals";
import { Building } from "@game/entities/buildings/types";

import { Signal } from "@game/core/signals/types";
import { hasResources } from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { NineSlice } from "../NineSlice";

export const Button = ({
  building,
  gameState,
}: {
  building: Building;
  gameState: GameStateManager;
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
      frame={"button-building-smaller#0"}
      origin={[0, 0]}
      tint={computed(() =>
        active.get() ? 0xffffff : COLORS_NAMES["peaches-of-immortality"]
      )}
    />
  );

  const container: Phaser.GameObjects.Container = (
    <container
      interactive
      onPointerover={() => {
        if (active.get()) {
          state.transition("mouseenter");
        }
      }}
      onPointerout={() => {
        state.transition("mouseleave");
      }}
      onPointerdown={() => state.transition("mousedown")}
      onPointerup={() => state.transition("mouseup")}
    />
  );

  active.subscribe((active) => {
    if (active) {
      container.input!.cursor = "pointer";
    } else {
      container.input!.cursor = "default";
    }
  });

  const button = <Flex containerElement={container}>{image}</Flex>;

  <stateObserver fsm={state}>
    <onEnter
      state="available"
      run={() => {
        image.setFrame("button-building-smaller#0");
      }}
    />
    <onEnter
      state="hovered"
      run={() => {
        image.setFrame("button-building-smaller#1");
      }}
    />
    <onEnter
      state="pressed"
      run={() => {
        image.setFrame("button-building-smaller#2");
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
  hoveredBuilding,
}: {
  building: Partial<Building>;
  gameState: GameStateManager;
  hoveredBuilding: Signal<Building | null>;
}): FlexColumn {
  window.currentScene.input.setTopOnly(false);

  const container: Phaser.GameObjects.Container = (
    <container
      width={1}
      interactive
      onPointerover={() => {
        hoveredBuilding.set(building as Building);
      }}
      onPointerout={() => {
        // FIXME: when this is set to null, the hover panel immediately removes the text
        hoveredBuilding.set(null);
      }}
    />
  );

  const flex = (
    <Flex
      alignContent={ALIGN_ITEMS.STRETCH}
      justify={JUSTIFY.SPACE_BETWEEN}
      backgroundElement={
        <NineSlice
          texture={RESOURCES["ui-left-panel"]}
          frame={"bg-buildings"}
          container={container}
        />
      }
      padding={6}
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
        width={110}
      >
        <text
          text={building.name}
          style={{
            color: STRING_COLORS_NAMES["elite-teal"],
          }}
          resolution={2}
        />
      </Flex>
      <Flex
        direction={DIRECTION.COLUMN}
        alignContent={ALIGN_ITEMS.CENTER}
        justify={JUSTIFY.CENTER}
        margin={2}
      >
        <text
          text={[Object.keys(building.input!)].join("\n")}
          style={{
            fontSize: 12,
            color: STRING_COLORS_NAMES["castro"],
          }}
          resolution={2}
        />
        <image
          texture={RESOURCES["ui-left-panel"]}
          frame={"building-arrow#0"}
        />
        <text
          text={[Object.keys(building.output!)].join("\n")}
          style={{
            fontSize: 12,
            color: STRING_COLORS_NAMES["castro"],
          }}
          resolution={2}
        />
      </Flex>
      <Button building={building as Building} gameState={gameState} />
    </Flex>
  );

  return flex;
}
