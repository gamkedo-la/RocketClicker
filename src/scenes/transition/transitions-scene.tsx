import { GAME_HEIGHT, GAME_WIDTH } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";

export class TransitionsScene extends AbstractScene {
  constructor() {
    super(SCENES.TRANSITIONS);
  }

  create() {
    const p = signal(0);

    const r: Phaser.GameObjects.Rectangle = this.add.existing(
      <rectangle
        x={0}
        y={0}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        fillColor={0x000000}
        origin={[0, 0]}
        alpha={p}
      />
    );

    const m = (
      <animation manual={this.scenesManager.getTransitionSignal()}>
        <tween signal={p} from={1} to={0} duration={1000} />
      </animation>
    );
  }

  fadeOut() {}

  update(_time: number, _delta: number) {}

  shutdown() {}
}
