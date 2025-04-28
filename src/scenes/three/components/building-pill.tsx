import {
  COLORS_NAMES,
  STRING_COLORS_NAMES,
  TWELVE_HOURS_IN_SECONDS,
} from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { Flex } from "@game/core/ui/Flex";
import { FlexRow } from "../../../core/ui/FlexRow";
import type { BuildingAlert } from "../../../systems/EffectsSystem";

export function Pill({
  type,
  text,
  blinking = false,
}: {
  type: "warning" | "error" | "positive";
  text: string;
  blinking?: boolean;
}): FlexRow {
  const opacity = signal(1);

  const rect: Phaser.GameObjects.Rectangle = (
    <rectangle
      alpha={opacity}
      fillColor={
        type === "warning"
          ? COLORS_NAMES["vicious-violet"]
          : type === "positive"
          ? COLORS_NAMES["vaporwave-blue"]
          : COLORS_NAMES["strawberry-field"]
      }
    />
  );

  if (blinking) {
    const mm = (
      <motionMachine initial="blinking">
        <state id="blinking">
          <animation on="active">
            <repeat times={TWELVE_HOURS_IN_SECONDS}>
              <tween signal={opacity} from={1} to={0} duration={500} />
              <tween signal={opacity} from={0} to={1} duration={500} />
            </repeat>
          </animation>
        </state>
      </motionMachine>
    );
  }

  rect.setStrokeStyle(
    2,
    type === "warning"
      ? COLORS_NAMES["vicious-violet"]
      : type === "positive"
      ? COLORS_NAMES["vaporwave-blue"]
      : COLORS_NAMES["strawberry-field"]
  );

  return (
    <Flex backgroundElement={rect} padding={[2, 4]}>
      <text
        text={text}
        alpha={opacity}
        style={{
          fontSize: 10,
          color:
            type === "warning"
              ? STRING_COLORS_NAMES["white"]
              : STRING_COLORS_NAMES["black"],
        }}
      />
    </Flex>
  );
}

export function BuildingPill({ alert }: { alert: BuildingAlert }): FlexRow {
  return (
    <Pill type={alert.type} text={alert.message} blinking={alert.blinking} />
  );
}
