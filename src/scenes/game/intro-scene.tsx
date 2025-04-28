import PhaserGamebus from "@game/lib/gamebus";
import { GameStatus } from "@game/state/game-state";

import {
  COLORS_NAMES,
  GAME_HEIGHT,
  GAME_WIDTH,
  STRING_COLORS_NAMES,
} from "@game/consts";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { AbstractScene } from "..";
import { Flex } from "../../core/ui/Flex";
import { SCENES } from "../scenes";
import { Spacer } from "../../core/ui/FlexItem";

export class IntroScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  constructor() {
    super(SCENES.INTRO);
  }

  create() {
    this.gameState.setGameStatus(GameStatus.LOADING);

    const clickText = (
      <text text="Press to start" style={{ fontSize: 48, color: "white" }} />
    );

    const flex = (
      <Flex
        justify={JUSTIFY.CENTER}
        alignContent={ALIGN_ITEMS.CENTER}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        direction={DIRECTION.COLUMN}
        margin={10}
        backgroundElement={
          <rectangle fillColor={COLORS_NAMES["dark-knight"]} />
        }
      >
        <text
          text="THE SPINNING COMET ESCAPE"
          style={{ fontSize: 64, color: STRING_COLORS_NAMES["vaporwave-blue"] }}
        />
        <Spacer grow={0} height={10} />

        <text
          text="Your rocket landed on a comet and you need to refuel it."
          style={{ fontSize: 28, color: "white" }}
        />
        <text
          text="Generate energy and materials to generate"
          style={{ fontSize: 28, color: "white" }}
        />
        <text
          text="the liquid oxygen and hydrogen to return to space."
          style={{ fontSize: 28, color: "white" }}
        />
        <text
          text="Or try your luck spinning the comet."
          style={{ fontSize: 28, color: "white" }}
        />
        <Spacer grow={0} height={20} />
        {clickText}
      </Flex>
    );

    flex.addToScene();

    this.input.once("pointerdown", () => {
      clickText.setText("Landing rocket...");
      clickText.setColor(STRING_COLORS_NAMES["strawberry-field"]);
      flex.trashLayout();

      setTimeout(() => {
        this.scene.start(SCENES.GAME);
      }, 1000);
    });
  }

  shutdown() {}
}
