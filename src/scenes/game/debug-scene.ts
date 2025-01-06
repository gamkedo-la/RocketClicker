import { Pane } from "tweakpane";
import { AbstractScene } from "..";
import { SCENES } from "../consts";

export const params = {
  fps: 0,
};

export class Debug extends AbstractScene {
  declare pane: Pane;

  constructor() {
    super(SCENES.DEBUG);
  }

  create() {
    this.pane = new Pane({ expanded: false, title: "Debug" });
    this.pane.addBinding(params, "fps", {
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });
  }

  i = 0;

  update() {
    params.fps = this.game.loop.actualFps;
    this.i++;
    if (this.i > 10) {
      this.i = 0;
      this.pane.refresh();
    }
  }

  shutdown() {
    this.pane.dispose();
  }
}
