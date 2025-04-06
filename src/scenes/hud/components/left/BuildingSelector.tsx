import { RESOURCES } from "@game/assets";

import { FiniteStateMachine } from "@game/core/state-machine/state-machine";

import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexColumn } from "@game/core/ui/FlexColumn";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed } from "@game/core/signals/signals";
import { Building } from "@game/entities/buildings/types";

import { Signal } from "@game/core/signals/types";
import {
  hasResources,
  MATERIALS,
  MATERIALS_KEYS,
} from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { NineSlice } from "../NineSlice";
import { FlexItem } from "../../../../core/ui/FlexItem";

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
  id,
  building,
  gameState,
  hoveredBuilding,
}: {
  id: number;
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

  const building_title_text = (
    <text
      text={`(${id > 8 ? "0" : 1 + id}) ${building.name}`}
      style={{
        color: STRING_COLORS_NAMES["elite-teal"],
      }}
      resolution={2}
    />
  );

  gameState.state
    .get()
    .mouse_selected_building.subscribe((mouse_selected_building) => {
      if (mouse_selected_building?.building?.name === building.name) {
        building_title_text.setColor(STRING_COLORS_NAMES["strawberry-field"]);
      } else {
        building_title_text.setColor(STRING_COLORS_NAMES["elite-teal"]);
      }
    });

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
      <FlexItem grow={1}>
        <Flex
          backgroundElement={
            <NineSlice
              texture={RESOURCES["ui-left-panel"]}
              frame={"title-bg-buildings"}
            />
          }
          direction={DIRECTION.COLUMN}
          padding={4}
          justify={JUSTIFY.CENTER}
          width={120}
        >
          <Flex margin={10}>
            {building_title_text}

            {building.input?.kWh && (
              <text
                text={`${building.input?.kWh.toLocaleString()} kWh`}
                style={{
                  color: STRING_COLORS_NAMES["cuba-libre"],
                }}
                resolution={2}
              />
            )}

            {building.output?.kWh && (
              <text
                text={`${building.output?.kWh.toLocaleString()} kWh`}
                style={{ color: STRING_COLORS_NAMES["vaporwave-blue"] }}
              />
            )}
          </Flex>

          <text
            text={`${Object.keys(building.input!)
              .filter((key) => key !== "kWh")
              .map(
                (key) =>
                  `${building.input![key].toLocaleString()} ${
                    MATERIALS_KEYS[key as keyof typeof MATERIALS]
                  }`
              )
              .join(", ")} → ${Object.keys(building.output!)
              .filter((key) => key !== "kWh")
              .map(
                (key) =>
                  `${building.output![key].toLocaleString()} ${
                    MATERIALS_KEYS[key as keyof typeof MATERIALS]
                  }`
              )
              .join(", ")}`}
            style={{ color: STRING_COLORS_NAMES["meteorite"] }}
          />
        </Flex>
      </FlexItem>
      <Button building={building as Building} gameState={gameState} />
    </Flex>
  );

  return flex;
}
