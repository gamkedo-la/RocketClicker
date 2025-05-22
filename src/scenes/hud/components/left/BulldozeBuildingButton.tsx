import { RESOURCES } from "@game/assets";
import { STRING_COLORS_NAMES } from "@game/consts";
import { ALIGN_ITEMS, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { GameStateManager } from "@game/state/game-state";
import { FiniteStateMachine } from "../../../../core/state-machine/state-machine";
import { Flex } from "../../../../core/ui/Flex";
import { NineSlice } from "../NineSlice";

export const Button = ({ gameState }: { gameState: GameStateManager }) => {
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
    />
  );

  const container: Phaser.GameObjects.Container = (
    <container
      interactive
      onPointerover={() => {
        state.transition("mouseenter");
      }}
      onPointerout={() => {
        state.transition("mouseleave");
      }}
      onPointerdown={() => state.transition("mousedown")}
      onPointerup={() => state.transition("mouseup")}
    />
  );

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
        gameState.toggleMouseSelectedBulldoze();
      }}
    />
  </stateObserver>;

  return button;
};

export const BulldozeBuildingButton = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const bulldoze_text = (
    <text
      text={"(x) Eject building"}
      style={{
        color: STRING_COLORS_NAMES["elite-teal"],
      }}
      resolution={2}
    />
  );

  gameState.state
    .get()
    .mouse_selected_bulldoze.subscribe((mouse_selected_bulldoze) => {
      if (mouse_selected_bulldoze) {
        bulldoze_text.setColor(STRING_COLORS_NAMES["strawberry-field"]);
      } else {
        bulldoze_text.setColor(STRING_COLORS_NAMES["elite-teal"]);
      }
    });

  const flex = (
    <Flex
      alignContent={ALIGN_ITEMS.STRETCH}
      justify={JUSTIFY.CENTER}
      padding={4}
      margin={2}
    >
      <Flex padding={[4, 3]} justify={JUSTIFY.CENTER} width={110}>
        {bulldoze_text}
      </Flex>

      <Button gameState={gameState} />
    </Flex>
  );

  return flex;
};
