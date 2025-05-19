import { COLORS_NAMES, GAME_HEIGHT, GAME_WIDTH } from "@game/consts";
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

    const p2 = signal(0);

    const final_r: Phaser.GameObjects.Rectangle = this.add.existing(
      <rectangle
        x={10}
        y={42}
        width={253}
        height={GAME_HEIGHT - 51}
        fillColor={COLORS_NAMES["dark-void"]}
        origin={[0, 0]}
        alpha={p2}
      />
    );

    final_r.setBlendMode(Phaser.BlendModes.MULTIPLY);

    const final_r2: Phaser.GameObjects.Rectangle = this.add.existing(
      <rectangle
        x={1019}
        y={42}
        width={253}
        height={GAME_HEIGHT - 51}
        fillColor={COLORS_NAMES["dark-void"]}
        origin={[0, 0]}
        alpha={p2}
      />
    );

    final_r2.setBlendMode(Phaser.BlendModes.DARKEN);

    const m2 = (
      <animation manual={this.scenesManager.getEndGameSignal()}>
        <tween signal={p2} from={0} to={0.8} duration={1000} />
      </animation>
    );
  }

  fadeOut() {}

  update(_time: number, _delta: number) {}

  shutdown() {}
}
