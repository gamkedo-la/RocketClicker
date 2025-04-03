import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS, DIRECTION } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";
import { FlexRow } from "@game/core/ui/FlexRow";
import PhaserGamebus from "@game/lib/gamebus";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { computed } from "@game/core/signals/signals";
import { GameStateManager } from "@game/state/game-state";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { NineSlice } from "./components/NineSlice";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";

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
        padding={[0, 20]}
      >
        <rectangle fillColor={COLORS_NAMES["white"]} width={10} height={10} />
        <Spacer width={5} grow={0} />
        <text
          text={computed(
            () =>
              `Selected Building: ${
                this.gameState.state.get().mouse_selected_building.get()
                  ?.building?.name || "None"
              }`
          )}
          style={{
            color: STRING_COLORS_NAMES["vaporwave-blue"],
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
        alignContent={ALIGN_ITEMS.STRETCH}
        direction={DIRECTION.COLUMN}
      >
        {topBar}
        <FlexItem grow={1}>
          <NineSlice
            texture={RESOURCES["ui-left-panel"]}
            frame="screen-frame"
          />
        </FlexItem>
      </Flex>
    );

    screenBorder.addToScene();

    const sidebarWidth = 250;

    const layout: FlexRow = (
      <Flex
        padding={[45, 12, 13]}
        margin={0}
        width={width}
        height={height}
        alignContent={ALIGN_ITEMS.STRETCH}
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
