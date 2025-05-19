import { RESOURCES } from "@game/assets";
import { STRING_COLORS_NAMES } from "@game/consts";
import { effect, signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexRow } from "@game/core/ui/FlexRow";
import {
  MATERIALS,
  MATERIALS_ICONS,
  MATERIALS_KEYS,
} from "@game/entities/materials/index";
import { GameStateManager } from "@game/state/game-state";
import { MotionMachine } from "../../../../core/motion-machine/motion-machine";

export const Counter = ({
  title,
  material,
  value,
}: {
  title: string;
  material: string;
  value: Signal<number>;
}) => {
  const color = signal(0);

  const mm: MotionMachine<"cold" | "neutral" | "hot"> = (
    <motionMachine initialState="neutral">
      <state id="cold">
        <animation on="enter">
          <tween signal={color} to={0} duration={50} />
          <tween signal={color} to={0.5} duration={1000} />
          <step run={() => mm.setState("neutral")} />
        </animation>
      </state>
      <state id="neutral">
        <animation on="enter">
          <tween signal={color} to={0.5} duration={100} />
        </animation>
      </state>
      <state id="hot">
        <animation on="enter">
          <tween signal={color} to={1} duration={50} />
          <tween signal={color} to={0.5} duration={1000} />
          <step run={() => mm.setState("neutral")} />
        </animation>
      </state>
    </motionMachine>
  );

  const nineSlice = (
    <nineslice
      texture={RESOURCES["emboss-button"]}
      leftWidth={8}
      rightWidth={8}
      topHeight={6}
      bottomHeight={6}
    />
  );

  const counterTitle = (
    <text
      text={title}
      resolution={2}
      style={{
        fontSize: "18px",
        color: STRING_COLORS_NAMES["cuba-libre"],
      }}
    />
  );

  const counterIcon = (
    <image
      texture={MATERIALS_ICONS[material as keyof typeof MATERIALS_ICONS]}
    />
  );

  const counterText: Phaser.GameObjects.Text = (
    <text
      text="0"
      resolution={2}
      style={{
        fontSize: 20,
        color: STRING_COLORS_NAMES["vaporwave-blue"],
        align: "center",
      }}
    />
  );

  const counterFlex: FlexRow = (
    <Flex
      width={90}
      padding={[6, 8]}
      backgroundElement={nineSlice}
      justify={JUSTIFY.FLEX_END}
    >
      {counterText}
    </Flex>
  );

  const flex: FlexRow = (
    <Flex padding={0} margin={5}>
      {counterIcon}
      {counterFlex}
      {counterTitle}
    </Flex>
  );

  let prevValue = 0;

  effect(() => {
    const currentValue = value.get();

    if (currentValue !== prevValue) {
      counterText.setText(
        Number(currentValue).toLocaleString([], {
          maximumFractionDigits: 0,
          minimumIntegerDigits: 1,
        })
      );

      prevValue = currentValue;

      counterFlex.trashLayout();
    }
  });

  value.subscribe((value) => {
    if (value > prevValue) {
      mm.setState("hot");
    } else if (value < prevValue) {
      mm.setState("cold");
    } else {
      mm.setState("neutral");
    }
  });

  let r, g, b;

  color.subscribe((color) => {
    if (color >= 0.5) {
      r = Phaser.Math.Linear(22, 255, color * 2 - 1);
      b = Phaser.Math.Linear(225, 255, color * 2 - 1);
      g = Phaser.Math.Linear(255, 255, color * 2 - 1);
    } else {
      r = Phaser.Math.Linear(214, 22, color * 2);
      b = Phaser.Math.Linear(84, 225, color * 2);
      g = Phaser.Math.Linear(128, 255, color * 2);
    }

    counterText.setStyle({ color: `rgb(${r},${g},${b})` });

    // STRING_COLORS_NAMES["vaporwave-blue"] == 22, 225, 255
    // STRING_COLORS_NAMES["fever-dream"] == 214, 84, 128
  });

  return flex;
};

export const ResourcesCounter = ({
  gameState,
}: {
  gameState: GameStateManager;
}) => {
  const flex = (
    <Flex
      direction={DIRECTION.COLUMN}
      alignContent={ALIGN_ITEMS.FLEX_START}
      margin={5}
    >
      {...Object.keys(MATERIALS)
        .filter((material) => material !== "LOX" && material !== "LH2")
        .map((material) => (
          <Counter
            title={MATERIALS_KEYS[material as keyof typeof MATERIALS_KEYS]}
            material={material}
            value={
              gameState.state.get().material_storage[
                material as keyof typeof MATERIALS
              ]
            }
          />
        ))}
    </Flex>
  );

  return flex;
};
