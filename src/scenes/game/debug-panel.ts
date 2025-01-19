import { Pane } from "tweakpane";

export const DebugParameters: any = {};

export class DebugPanel {
  static pane: Pane = new Pane({ expanded: true, title: "Debug" });

  static i = 0;

  static init() {
    DebugParameters.fps = 0;
    DebugPanel.pane.addBinding(DebugParameters, "fps", {
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });
  }

  static add(key: string, value: any) {
    DebugPanel.pane.addBinding(DebugParameters, key, {
      readonly: true,
      format: (v: number) => v.toFixed(0),
    });
  }

  static addSlider(
    key: string,
    value: any,
    step: number = 0.01,
    min: number = 0,
    max: number = 1
  ) {
    DebugPanel.pane.addBinding(DebugParameters, key, {
      min: min,
      max: max,
      step: step,
    });

    DebugParameters[key] = value;
  }

  static update() {
    DebugPanel.i++;
    if (DebugPanel.i > 10) {
      DebugPanel.i = 0;
      DebugPanel.pane.refresh();
    }
  }
}
