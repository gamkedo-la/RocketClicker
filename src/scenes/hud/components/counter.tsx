import { RESOURCES } from "@game/assets";
import { STRING_COLORS_NAMES } from "@game/consts";
import { effect } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { Flex } from "@game/core/ui/Flex";
import { FlexRow } from "@game/core/ui/FlexRow";
import { MATERIALS_ICONS } from "@game/entities/materials/index";

export const Counter = ({
  title,
  value,
}: {
  title: string;
  value: Signal<number>;
}) => {
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
        fontFamily: "handjet",
        fontSize: "18px",
        color: STRING_COLORS_NAMES["cuba-libre"],
        stroke: STRING_COLORS_NAMES["cuba-libre"],
        strokeThickness: 1,
      }}
    />
  );

  const counterIcon = <image texture={MATERIALS_ICONS[title]} />;

  const counterText: Phaser.GameObjects.Text = (
    <text
      text="000000000"
      resolution={2}
      style={{
        fontFamily: "handjet",
        fontSize: "18px",
        color: STRING_COLORS_NAMES["vaporwave-blue"],
      }}
    />
  );

  const counterFlex: FlexRow = (
    <Flex width={64} backgroundElement={nineSlice}>
      {counterText}
    </Flex>
  );

  const flex: FlexRow = (
    <Flex padding={0}>
      {counterIcon}
      {counterTitle}
      {counterFlex}
    </Flex>
  );

  effect(() => {
    counterText.setText(value.get().toString(10).padStart(9, "0"));
    flex.layout();
  });

  return flex;
};
