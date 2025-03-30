import { RESOURCES } from "@game/assets";
import { FlexItem } from "../../../core/ui/FlexItem";
import { GameStateManager } from "@game/state/game-state";
import { signal } from "@game/core/signals/signals";

export const CometSpinMeter = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const cometSpin = gameState.getCometSpin();

  const rotate = signal(-75);
  const rotateGoal = signal(-75);

  <motionMachine initialState="spin">
    <state id="spin">
      <animation on="active">
        <repeat times={100}>
          <step run={() => rotateGoal.set(Math.random() * 150 - 75)} />
          <tween
            signal={rotate}
            from={rotate}
            to={rotateGoal}
            duration={1000}
          />
        </repeat>
      </animation>
    </state>
  </motionMachine>;

  return (
    <>
      <image texture={RESOURCES["ui-left-panel"]} frame="spin-background#0" />
      <FlexItem
        attachTo={0}
        offsetX={"50%"}
        offsetY={70}
        origin={{ x: 0.5, y: 1 }}
      >
        <image
          texture={RESOURCES["ui-left-panel"]}
          frame="spin-spin-pin#0"
          angle={rotate}
        />
      </FlexItem>
      <FlexItem attachTo={-1}>
        <image texture={RESOURCES["ui-left-panel"]} frame="spin-temp-pin#0" />
      </FlexItem>
      <FlexItem attachTo={0}>
        <image texture={RESOURCES["ui-left-panel"]} frame="spin-cover#0" />
      </FlexItem>
    </>
  );
};
