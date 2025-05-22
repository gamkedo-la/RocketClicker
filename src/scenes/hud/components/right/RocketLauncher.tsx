import { RESOURCES } from "@game/assets";
import { Flex } from "../../../../core/ui/Flex";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { FiniteStateMachine } from "../../../../core/state-machine/state-machine";
import { computed } from "@game/core/signals/signals";
import { GameStateManager, GameStatus } from "@game/state/game-state";
import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { NineSlice } from "../NineSlice";

export const RocketLauncher = ({
  gameState,
  bus,
}: {
  gameState: GameStateManager;
  bus: Phaser.Events.EventEmitter;
}) => {
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
      <state id="pressed"></state>
    </stateMachine>
  );

  const active = computed(
    () =>
      state.current.get() === "pressed" ||
      (gameState.state.get()?.material_storage.LH2.get() > 140_000 &&
        gameState.state.get()?.material_storage.LOX.get() > 30_000)
  );

  const image = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame={"button-building#0"}
      origin={[0, 0]}
      tint={computed(() =>
        active.get() ? 0xffffff : COLORS_NAMES["montreux-blue"]
      )}
      interactive
      onPointerdown={() => {
        if (active.get()) {
          gameState.setGameStatus(GameStatus.ROCKET_LAUNCHED);
          state.transition("mousedown");
          console.log("send rocket");
          bus.emit("send_rocket", null);
        }
      }}
      onPointerover={() => {
        if (active.get()) {
          state.transition("mouseenter");
        }
      }}
      onPointerout={() => {
        state.transition("mouseleave");
      }}
    />
  );

  active.subscribe((active) => {
    if (active) {
      image.input!.cursor = "pointer";
    } else {
      image.input!.cursor = "default";
    }
  });

  const button = (
    <Flex
      direction={DIRECTION.COLUMN}
      margin={4}
      backgroundElement={
        <NineSlice
          texture={RESOURCES["ui-left-panel"]}
          tint={computed(() =>
            active.get() ? 0xffffff : COLORS_NAMES["montreux-blue"]
          )}
          frame="bg-buildings"
        />
      }
      padding={[10, 9]}
    >
      <text
        text={"Launch"}
        style={computed(() =>
          active.get()
            ? {
                color: STRING_COLORS_NAMES["white"],
                shadow: {
                  fill: true,
                  color: STRING_COLORS_NAMES["white"],
                  offsetX: 0,
                  offsetY: 0,
                  blur: 4,
                },
              }
            : { color: STRING_COLORS_NAMES["montreux-blue"] }
        )}
      />
      {image}
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
  </stateObserver>;

  return button;
};
