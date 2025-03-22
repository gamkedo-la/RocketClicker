import { RESOURCES } from "@game/assets";

import { FiniteStateMachine } from "@game/core/state-machine/state-machine";
import { Signal } from "@game/core/signals/types";

import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexColumn } from "@game/core/ui/FlexColumn";

import { NineSlice } from "./nineslice";

export const Button = ({ active }: { active?: Signal<boolean> }) => {
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

  active?.subscribe((active) => {
    if (active) {
      state.setState("available");
    } else {
      state.setState("hovered");
    }
  });

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
  </stateObserver>;

  return image;
};

export function BuildingSelector(): FlexColumn {
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
      padding={[5, 5]}
    >
      <Flex
        backgroundElement={
          <NineSlice
            texture={RESOURCES["ui-left-panel"]}
            frame={"title-bg-buildings"}
          />
        }
        padding={5}
      >
        <text text={"Generator"} />
      </Flex>
      <Flex justify={JUSTIFY.SPACE_EVENLY}>
        <Flex direction={DIRECTION.COLUMN}>
          <text text={["kWh", "\\/", "kWh"].join("\n")} />
        </Flex>
        <Button />
      </Flex>
    </Flex>
  );
}
