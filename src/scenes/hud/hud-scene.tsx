import PhaserGamebus from "../../lib/gamebus";
import { Flex } from "../../ui/components/Flex";
import { FlexRow } from "../../ui/components/FlexRow";
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

    const layout: FlexRow = (
      <Flex margin={0} padding={0} width={width} height={height} />
    );

    layout.add(<LeftPanel width={200} height={height} />);
    // TODO: figure out how to make "null" elements in Flex?
    layout.add(<rectangle fillColor={0x000000} visible={false} />, 1);
    layout.add(<RightPanel width={200} height={height} />);

    layout.addToScene();
  }

  shutdown() {}
}
