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
  color,
  text,
  blinking = false,
}: {
  color: number;
  text: string;
  blinking?: boolean;
}): FlexRow {
  const opacity = signal(1);

  const rect: Phaser.GameObjects.Rectangle = (
    <rectangle alpha={opacity} fillColor={COLORS_NAMES["fever-dream"]} />
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

  rect.setStrokeStyle(2, color);

  return (
    <Flex backgroundElement={rect} padding={[2, 4]}>
      <text
        text={text}
        alpha={opacity}
        style={{ fontSize: 10, color: STRING_COLORS_NAMES["black"] }}
      />
    </Flex>
  );
}

const pill = signal(0, { label: "added pills" });

export function BuildingPill({ alert }: { alert: BuildingAlert }): FlexRow {
  pill.update((value) => value + 1);
  return (
    <Pill
      color={
        alert.type === "warning"
          ? COLORS_NAMES["strawberry-field"]
          : COLORS_NAMES["vaporwave-blue"]
      }
      text={alert.message}
      blinking={alert.blinking}
    />
  );
}
