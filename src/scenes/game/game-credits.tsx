import { RESOURCES } from "@game/assets";
import { GAME_HEIGHT, GAME_WIDTH, STRING_COLORS_NAMES } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { CREDITS } from "@game/credits";
import { GameStatus } from "@game/state/game-state";
import { Flex } from "../../core/ui/Flex";
import { FlexColumn } from "../../core/ui/FlexColumn";
import { Spacer } from "../../core/ui/FlexItem";
import { NineSlice } from "../hud/components/NineSlice";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";

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
      ...Object.entries(CREDITS).map(([key, value]) => {
        return (
          <>
            <text text={key} style={{ fontSize: 32, color: "white" }} />
            <text
              text={value}
              style={{ fontSize: 24, color: "white", align: "center" }}
            />
            <Spacer height={10} />
          </>
        );
      }),
    ].flat();

    if (this.gameState.state.get().status === GameStatus.ROCKET_LAUNCHED) {
      credits_texts.push(
        <Spacer height={40} />,
        <text
          text="Thanks for playing!"
          style={{ fontSize: 32, color: "white" }}
        />
      );
    }

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

    const d = Object.keys(CREDITS).length * 7500;

    console.log(d);

    const mm = (
      <motionMachine initialState="intro">
        <state id="intro">
          <animation on="active" loop>
            <tween signal={p2} to={-text_flex.height * 1.5} duration={d} />
            <step
              run={() => {
                p2.set(GAME_HEIGHT);
              }}
            />
          </animation>
        </state>
      </motionMachine>
    );

    if (this.gameState.state.get().status !== GameStatus.ROCKET_LAUNCHED) {
      this.input.setDefaultCursor("default");

      this.add.existing(
        <rectangle
          x={0}
          y={0}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          fillColor={0x000000}
          alpha={0.75}
          origin={[0, 0]}
        />
      );

      const closeButton = (
        <text
          text="X"
          style={{ fontSize: 36, color: STRING_COLORS_NAMES["dark-void"] }}
        />
      );

      (
        <Flex
          x={50}
          y={50}
          width={30}
          height={50}
          padding={[10, 20]}
          containerElement={
            <container
              interactive
              onPointerdown={() => {
                this.scene.resume(SCENES.INTRO);
                this.scene.stop(SCENES.GAME_CREDITS);
              }}
              onPointerover={() => {
                closeButton.setColor(STRING_COLORS_NAMES["white"]);
                this.input.setDefaultCursor("pointer");
              }}
              onPointerout={() => {
                closeButton.setColor(STRING_COLORS_NAMES["dark-void"]);
                this.input.setDefaultCursor("default");
              }}
            ></container>
          }
          backgroundElement={
            <NineSlice
              texture={RESOURCES["ui-left-panel"]}
              frame="bg-buildings"
            />
          }
        >
          {closeButton}
        </Flex>
      ).addToScene(this);

      this.input.once("pointerdown", () => {
        this.scene.resume(SCENES.INTRO);
        this.scene.stop(SCENES.GAME_CREDITS);
      });

      this.input.keyboard?.on("keydown-ESC", () => {
        this.scene.resume(SCENES.INTRO);
        this.scene.stop(SCENES.GAME_CREDITS);
      });
    } else {
      const maskRect = this.add
        .rectangle(GAME_WIDTH / 2, 42, GAME_WIDTH, 669, 0x000000)
        .setOrigin(0.5, 0)
        .setVisible(false);

      const mask = maskRect.createGeometryMask();

      this.cameras.main.setMask(mask);
    }

    text_flex.addToScene(this);
  }

  fadeOut() {}

  update(_time: number, _delta: number) {}

  shutdown() {}
}
