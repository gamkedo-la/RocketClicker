import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";
import { FlexRow } from "@game/core/ui/FlexRow";
import PhaserGamebus from "@game/lib/gamebus";

import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";
import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed } from "@game/core/signals/signals";
import { GameStateManager } from "@game/state/game-state";

export class HudScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;
  declare gameState: GameStateManager;

  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(SCENES.HUD);
  }

  create() {
    this.bus = this.gamebus.getBus();

    const { width, height } = this.scale.gameSize;

    const topBar = (
      <Flex
        width={width}
        height={32}
        backgroundElement={<rectangle fillColor={COLORS_NAMES["black"]} />}
      >
        <text
          text={
            computed(
              () => "Selected Building"
            ) /* TODO: /mouse_selected_building.get()?.name ?? "")*/
          }
          style={{
            fontFamily: "jersey15",
            color: STRING_COLORS_NAMES["white"],
            fontSize: 16,
          }}
        />
        <text
          text={
            "Selected Building            Star Dust = SD | Metals = M | Pure Metals = PM"
          }
          style={{
            fontFamily: "jersey15",
            color: STRING_COLORS_NAMES["white"],
            fontSize: 16,
          }}
        />
      </Flex>
    );

    const screenBorder = (
      <Flex
        padding={0}
        margin={0}
        width={width}
        height={height}
        align={ALIGN_ITEMS.STRETCH}
        direction={DIRECTION.COLUMN}
      >
        {topBar}
        <FlexItem grow={1}>
          <nineslice
            texture={RESOURCES["screen-border"]}
            leftWidth={16}
            rightWidth={16}
            topHeight={16}
            bottomHeight={16}
          />
        </FlexItem>
      </Flex>
    );

    screenBorder.addToScene();

    const sidebarWidth = 250;

    const layout: FlexRow = (
      <Flex
        // TODO: temporary making space for top bar, flex needs array here
        padding={32}
        margin={0}
        width={width}
        height={height}
        align={ALIGN_ITEMS.STRETCH}
      >
        <LeftPanel width={sidebarWidth} gameState={this.gameState} />
        <Spacer />
        <RightPanel width={sidebarWidth} gameState={this.gameState} />
      </Flex>
    );

    layout.addToScene();
  }

  shutdown() {}
}
