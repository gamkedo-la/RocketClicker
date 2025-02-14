import { Flex } from "@game/core/ui/Flex";
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

    const sidebarWidth = 250;

    const layout: FlexRow = (
      <Flex margin={0} padding={0} width={width} height={height} />
    );

    layout.add(<LeftPanel width={sidebarWidth} height={height} />);
    // TODO: figure out how to make "null" elements in Flex?
    layout.add(<rectangle fillColor={0x000000} visible={false} />, 1);
    layout.add(<RightPanel width={sidebarWidth} height={height} />);

    layout.addToScene();
  }

  shutdown() {}
}
