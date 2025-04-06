import { RESOURCES } from "@game/assets";
import { computed, signal } from "@game/core/signals/signals";
import { GameStateManager } from "@game/state/game-state";
import { FlexItem } from "../../../../core/ui/FlexItem";
import { MotionMachine } from "../../../../core/motion-machine/motion-machine";

export const CometSpinMeter = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const cometSpin = gameState.getCometSpin();

  const rotate = signal(-75);
  const rotateGoal = computed(() => (cometSpin.get() / 10) * 75);
  const failing = signal(0);

  const spinPin = (
    <image
      texture={RESOURCES["ui-left-panel"]}
      frame="spin-spin-pin#0"
      angle={rotate}
    />
  );

  const spinCover = (
    <image texture={RESOURCES["ui-left-panel"]} frame="spin-cover#0" />
  );

  const p = window.currentScene.make.particles(
    {
      config: {
        gravityY: 800,
        lifespan: 3000,
        speed: { min: 100, max: 200 },
        texture: RESOURCES["ui-left-panel"],
        frame: "spin-cover#0",
      },
    },
    true
  );

  p.setDepth(1);
  p.stop();

  const p2 = window.currentScene.make.particles(
    {
      config: {
        gravityY: 800,
        lifespan: 3000,
        rotate: { min: 0, max: 360 },
        speed: { min: 100, max: 200 },
        texture: RESOURCES["ui-left-panel"],
        frame: "spin-spin-pin#0",
      },
    },
    true
  );

  p2.setDepth(1);
  p2.stop();

  let stopDoubling = false;

  const motionMachine: MotionMachine<
    "spin" | "failing" | "broken",
    "spin" | "failing" | "broken"
  > = (
    <motionMachine initialState="failing">
      <state id="spin">
        <animation on="active">
          <repeat times={60 * 60 * 8}>
            <tween
              signal={rotate}
              from={rotate}
              to={rotateGoal}
              duration={1000}
            />
          </repeat>
        </animation>
        <transition target="failing" on="failing" />
      </state>
      <state id="failing">
        <animation on="active">
          <repeat times={100}>
            <step
              run={() => {
                failing.update((value) => value + 1);
              }}
            />
            <tween
              signal={rotate}
              from={rotate}
              to={() => rotateGoal.get() + Math.random() * 10 - 5}
              duration={200}
            />
          </repeat>
        </animation>
        <transition target="spin" on="spin" />
        <transition target="broken" on="broken" />
      </state>
      <state id="broken">
        <animation on="active">
          <step
            run={() => {
              if (!stopDoubling) {
                p.explode(1, spinCover.x, spinCover.y);
                p2.explode(1, spinPin.x, spinPin.y);
                stopDoubling = true;

                spinCover.setVisible(false);
                spinPin.setVisible(false);
              }
            }}
          />
        </animation>
      </state>
    </motionMachine>
  );

  cometSpin.subscribe((value) => {
    if (
      (value < -8 || value > 8) &&
      motionMachine.current.get() !== "failing"
    ) {
      motionMachine.transition("failing");
    } else if (motionMachine.current.get() === "failing") {
      motionMachine.transition("spin");
    }
  });

  failing.subscribe((value) => {
    if (value > 20) {
      motionMachine.transition("broken");
    }
  });

  const temperaturePinMax = 50;
  const cometAngle = gameState.getCometAngle();
  const pinX = computed(
    () => ((Math.PI - Math.abs(cometAngle.get())) / Math.PI) * temperaturePinMax
  );

  const flex = (
    <>
      <image texture={RESOURCES["ui-left-panel"]} frame="spin-background#0" />
      <FlexItem
        attachTo={0}
        offsetX={"50%"}
        offsetY={70}
        origin={{ x: 0.5, y: 1 }}
      >
        {spinPin}
      </FlexItem>
      <FlexItem attachTo={0} offsetX={60} offsetY={74}>
        <container>
          <image
            x={pinX}
            origin={[0, 0]}
            texture={RESOURCES["ui-left-panel"]}
            frame="spin-temp-pin#0"
          />
        </container>
      </FlexItem>
      <FlexItem attachTo={0}>{spinCover}</FlexItem>
    </>
  );

  return flex;
};
