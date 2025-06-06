import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { effect, signal } from "@game/core/signals/signals";
import { Signal } from "@game/core/signals/types";
import { Flex } from "@game/core/ui/Flex";
import { BuildingAlert } from "@game/systems/EffectsSystem";
import { MotionMachine } from "../../../core/motion-machine/motion-machine";
import { FlexRow } from "../../../core/ui/FlexRow";

export function BuildingPill({
  type,
  text,
  blinking,
  bus,
}: {
  type: Signal<BuildingAlert["type"]>;
  text: Signal<BuildingAlert["message"]>;
  blinking?: Signal<BuildingAlert["blinking"]>;
  bus: Phaser.Events.EventEmitter;
}): FlexRow {
  const opacity = signal(0);

  const rect: Phaser.GameObjects.Rectangle = <rectangle alpha={opacity} />;

  const textElement: Phaser.GameObjects.Text = (
    <text text={"a"} alpha={opacity} style={{ fontSize: 10 }} />
  );

  const flex: FlexRow = (
    <Flex backgroundElement={rect} padding={[2, 4]}>
      {textElement}
    </Flex>
  );

  flex.setOrigin(0.5, 0.5);

  type.subscribe((t) => {
    switch (t) {
      case "warning":
        rect.setFillStyle(COLORS_NAMES["vicious-violet"]);
        rect.setStrokeStyle(2, COLORS_NAMES["vicious-violet"]);
        textElement.setColor(STRING_COLORS_NAMES["white"]);
        break;
      case "positive":
        rect.setFillStyle(COLORS_NAMES["vaporwave-blue"]);
        rect.setStrokeStyle(2, COLORS_NAMES["vaporwave-blue"]);
        textElement.setColor(STRING_COLORS_NAMES["black"]);
        break;
      case "error":
        rect.setFillStyle(COLORS_NAMES["strawberry-field"]);
        rect.setStrokeStyle(2, COLORS_NAMES["strawberry-field"]);
        textElement.setColor(STRING_COLORS_NAMES["black"]);
        break;
    }
  });

  const mm: MotionMachine<
    "active" | "inactive" | "still" | "dead",
    "active" | "inactive" | "still" | "dead"
  > = (
    <motionMachine initial="inactive">
      <state id="active">
        <animation on="active" loop>
          <tween signal={opacity} from={1} to={0} duration={500} />
          <tween signal={opacity} from={0} to={1} duration={500} />
        </animation>
        <transition on="still" target="still" />
        <transition on="inactive" target="inactive" />
        <transition on="dead" target="dead" />
      </state>
      <state id="still">
        <animation on="enter">
          <tween signal={opacity} to={1} duration={500} />
        </animation>
        <transition on="active" target="active" />
        <transition on="inactive" target="inactive" />
        <transition on="dead" target="dead" />
      </state>
      <state id="inactive">
        <animation on="enter">
          <tween signal={opacity} to={0} duration={500} />
        </animation>
        <transition on="active" target="active" />
        <transition on="still" target="still" />
        <transition on="dead" target="dead" />
      </state>
      <state id="dead">
        <animation on="enter">
          <tween signal={opacity} to={0} duration={500} />
        </animation>
      </state>
    </motionMachine>
  );

  bus.on("send_rocket", () => {
    mm.transition("dead");
  });

  effect(() => {
    const b = blinking?.get();
    const t = type.get();

    if (t === "inactive") {
      mm.transition("inactive");
    } else if (b) {
      mm.transition("active");
    } else {
      mm.transition("still");
    }
  });

  text.subscribe((t) => {
    textElement.setText(t);
    flex.trashLayout(0, 0);
    textElement.setDepth(100);
  });

  return flex;
}
