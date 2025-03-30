import { RESOURCES } from "@game/assets";
import { COLORS_NAMES } from "@game/consts";
import { Signal } from "@game/core/signals/types";
import { computed, signal } from "@game/core/signals/signals";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem } from "@game/core/ui/FlexItem";
import { Building } from "@game/entities/buildings/types";
import { GameStateManager } from "@game/state/game-state";

const Dial = ({
  building,
}: {
  building: [number, Signal<Building | null>];
}) => {
  let container: Phaser.GameObjects.Container;
  let dialBackground: Phaser.GameObjects.Image;
  let dial: Phaser.GameObjects.Image;

  const value = signal(20);
  const targetValue = signal(20);

  const dialMachine = (
    <motionMachine initialState="idle">
      <state id="idle">
        <animation on="active">
          <repeat times={10}>
            <tween signal={value} from={0} to={100} duration={2000} />
            <tween signal={value} from={100} to={0} duration={2000} />
          </repeat>
        </animation>
      </state>
    </motionMachine>
  );

  const background = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="bg-dial-button-breakable#0"
      tint={0xcccccc}
    />
  );

  dialBackground = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-bg-button-breakable#0"
    />
  );

  dial = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="dial-button-breakable#0"
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
        background.tint = 0xffffff;
      }}
      onPointerout={() => {
        background.tint = 0xcccccc;
      }}
      onPointerdown={(t, p, x, y) => {
        dialMachine.transition("active");

        pointerIsDown = true;
        referenceX = p.x;
        referenceY = p.y;
      }}
      onPointerup={() => {
        background.tint = 0xffffff;
        pointerIsDown = false;
      }}
    />
  );

  container.setInteractive({ draggable: true });

  let use = 0;

  container.on("drag", (pointer: Phaser.Input.Pointer) => {
    if (pointerIsDown) {
      if (pointer.distance > 100) {
        use = 0;
        dialMachine.transition("broken");
      }

      const m = pointer.x - referenceX;
      targetValue.set(Math.max(0, Math.min(100, m)));
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

  for (const building of buildings.entries()) {
    dials.push(<Dial building={building} />);
  }

  return (
    <Flex wrapped width={125}>
      {dials}
    </Flex>
  );
};
