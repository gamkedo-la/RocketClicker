import { COLORS_NAMES, GAME_HEIGHT, GAME_WIDTH } from "@game/consts";
import { signal } from "@game/core/signals/signals";
import { AbstractScene } from "../index";
import { SCENES } from "../scenes";
import { NineSlice } from "../debug/test-scene";
import { RESOURCES } from "@game/assets";

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

  putEndSceneCover() {
    const p2 = signal(0);

    (
      <NineSlice
        texture={RESOURCES["ui-left-panel"]}
        frame="bg-buildings"
        x={8}
        y={42}
        width={261}
        height={GAME_HEIGHT - 51}
        tint={COLORS_NAMES["dark-void"]}
        alpha={p2}
      />
    ).addToScene(this);

    (
      <NineSlice
        texture={RESOURCES["ui-left-panel"]}
        frame="bg-buildings"
        x={1007}
        y={42}
        width={264}
        height={GAME_HEIGHT - 51}
        tint={COLORS_NAMES["dark-void"]}
        alpha={p2}
      />
    ).addToScene(this);

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
