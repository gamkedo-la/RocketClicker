import { COLORS_NAMES, GAME_HEIGHT, GAME_WIDTH } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { Flex } from "../../core/ui/Flex";
import { ALIGN_ITEMS, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { DIRECTION } from "@game/core/ui/AbstractFlex";
import { FlexColumn } from "../../core/ui/FlexColumn";
import { Spacer } from "../../core/ui/FlexItem";

const credits = {
  someone: ["Credits", "Credits", "Credits", "Credits", "Credits"],
  someoneElse: ["Credits"],
  "Look we know even how to space things": [
    "Sound design, a lot of it",
    "Sound design, a lot of it",
    "Sound design, a lot of it",
    "Sound design, a lot of it",
    "Sound design, a lot of it",
  ],
};

export class GameCreditsScene extends AbstractScene {
  constructor() {
    super(SCENES.GAME_CREDITS);
  }

  create() {
    const p2 = signal(GAME_HEIGHT);

    const credits_title = (
      <text text="Credits" style={{ fontSize: 36, color: "white" }} />
    );

    const credits_texts = [
      credits_title,
      <Spacer height={20} />,
      ...Object.entries(credits).map(([key, value]) => {
        return (
          <>
            <text text={key} style={{ fontSize: 32, color: "white" }} />
            <text text={value} style={{ fontSize: 24, color: "white" }} />
            <Spacer height={10} />
          </>
        );
      }),
    ].flat();

    const text_flex: FlexColumn = (
      <Flex
        x={GAME_WIDTH / 2}
        y={GAME_HEIGHT}
        direction={DIRECTION.COLUMN}
        alignContent={ALIGN_ITEMS.CENTER}
        justify={JUSTIFY.CENTER}
      >
        {credits_texts}
      </Flex>
    );

    text_flex.setX(GAME_WIDTH / 2 - text_flex.width / 2);

    p2.subscribe((p) => {
      text_flex.setY(p);
    });

    text_flex.addToScene(this);

    const maskRect = this.add
      .rectangle(GAME_WIDTH / 2, 42, GAME_WIDTH, 669, 0x000000)
      .setOrigin(0.5, 0)
      .setVisible(false);

    const mask = maskRect.createGeometryMask();

    this.cameras.main.setMask(mask);

    const mm = (
      <motionMachine initialState="intro">
        <state id="intro">
          <animation on="active" loop>
            <tween
              signal={p2}
              to={-text_flex.height * 1.5}
              duration={Object.keys(credits).length * 15000}
            />
            <step
              run={() => {
                p2.set(GAME_HEIGHT);
              }}
            />
          </animation>
        </state>
      </motionMachine>
    );
  }

  fadeOut() {}

  update(_time: number, _delta: number) {}

  shutdown() {}
}
