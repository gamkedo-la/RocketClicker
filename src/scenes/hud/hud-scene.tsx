import { RESOURCES } from "@game/assets";
import { ALIGN_ITEMS } from "@game/core/ui/AbstractFlex";
import { Flex } from "@game/core/ui/Flex";
import { FlexItem, Spacer } from "@game/core/ui/FlexItem";
import { FlexRow } from "@game/core/ui/FlexRow";
import PhaserGamebus from "@game/lib/gamebus";

import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { LeftPanel } from "./left-panel";
import { RightPanel } from "./right-panel";

export class HudScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;

  constructor() {
    super(SCENES.HUD);
  }

  create() {
    this.bus = this.gamebus.getBus();

    const { width, height } = this.scale.gameSize;

    const screenBorder = (
      <Flex
        padding={0}
        width={width}
        height={height}
        align={ALIGN_ITEMS.STRETCH}
      >
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
        padding={0}
        margin={0}
        width={width}
        height={height}
        align={ALIGN_ITEMS.STRETCH}
      >
        <LeftPanel width={sidebarWidth} />
        <Spacer />
        <RightPanel width={sidebarWidth} />
      </Flex>
    );

    layout.addToScene();
  }

  shutdown() {}
}
