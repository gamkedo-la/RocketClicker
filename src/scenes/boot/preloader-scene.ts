import { RESOURCES } from "@game/assets";
import { GAME_WIDTH } from "@game/consts";

import { AbstractScene } from "..";
import { SCENES, TEST_SCENE } from "../scenes";

export const RESOURCES_INDEX = Object.keys(RESOURCES).reduce(
  (acc, key, index) => ({ ...acc, [key]: index }),
  {} as Record<keyof typeof RESOURCES, number>
);

export const RESOURCES_LIST = Object.values(RESOURCES);

declare var WebFont: any;

export class Preloader extends AbstractScene {
  constructor() {
    super(SCENES.PRELOADER);
  }

  init() {
    this.add
      .rectangle(GAME_WIDTH / 2, 484, 468, 32)
      .setStrokeStyle(1, 0xffffff);

    const bar = this.add.rectangle(GAME_WIDTH / 2 - 230, 484, 4, 28, 0xffffff);

    this.load.on("progress", (progress: number) => {
      bar.width = 4 + 460 * progress;
    });

    if (import.meta.env.VITE_DEBUG) {
      import("../debug/test-scene").then((m) => {
        this.scene.add(TEST_SCENE, m.TestScene);
      });
    }
  }

  preload() {
    this.load.pack("assetPack", "assetPack.json");
  }

  create() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x927e6a);
    graphics.fillStyle(0xefd8a1);
    graphics.fillCircle(1, 1, 2);
    graphics.generateTexture("wind_particle", 2, 2);
    graphics.destroy();

    // the preloader has already downloaded the .mp3
    // FIXME: iterate all non-graphic RESOURCES[]
    this.soundManager.addSound("build-chemicalplant");
    this.soundManager.addSound("build-condenser");
    this.soundManager.addSound("build-duster");
    this.soundManager.addSound("build-electrolysis");
    this.soundManager.addSound("build-fuelcell");
    this.soundManager.addSound("build-generator");
    this.soundManager.addSound("build-H2compressor");
    this.soundManager.addSound("build-miner");
    this.soundManager.addSound("build-O2compressor");
    this.soundManager.addSound("build-solarpanel");
    this.soundManager.addSound("sfx-alert");
    this.soundManager.addSound("sfx-click");
    this.soundManager.addSound("sfx-electricity");
    this.soundManager.addSound("sfx-gas-burst");
    this.soundManager.addSound("sfx-gui-clip");
    this.soundManager.addSound("sfx-gui-confirm");
    this.soundManager.addSound("sfx-gui-deny");
    this.soundManager.addSound("sfx-gui-window-opens");
    this.soundManager.addSound("sfx-mine-stardust");
    this.soundManager.addSound("sfx-pick-up");
    this.soundManager.addSound("sfx-put-down");
    this.soundManager.addSound("sfx-rocket-launch");
    this.soundManager.addSound("placeholder-music-loop", { loop: true });

    this.scenesManager.transitionTo("loaded");
    //this.scene.start(TEST_SCENE);
  }

  shutdown() {}
}
