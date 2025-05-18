import { RESOURCES } from "@game/assets";
import { COLORS_NAMES, GAME_WIDTH } from "@game/consts";

import { AbstractScene } from "..";
import { SCENES, TEST_SCENE } from "../scenes";
import { MUSIC, SFX } from "@game/core/sound/sound-manager";

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
    graphics.fillStyle(COLORS_NAMES["dark-knight"]);
    graphics.fillPoint(1, 0);
    graphics.fillPoint(0, 1);
    graphics.fillPoint(2, 1);
    graphics.fillPoint(1, 2);
    graphics.fillStyle(COLORS_NAMES["vaporwave-blue"]);
    graphics.fillPoint(1, 1);
    graphics.generateTexture("comet_dust_particle", 3, 3);
    graphics.destroy();

    // TODO: We still need to declare sounds on SFX
    SFX.forEach((sfx) => {
      this.soundManager.addSound(sfx);
    });

    MUSIC.forEach((music) => {
      this.soundManager.addSound(music);
    });

    // Apparently I need to add a random sound to fail to load and then
    // I know all the sounds above were correctly added
    this.soundManager.addSound("sfx-alert");
    // I also can't set volumes without the above added sounds
    this.soundManager.setupVolumeListeners();

    this.scenesManager.transitionTo("loaded");
    //this.scene.start(SCENES.GAME);
    //this.scene.start(TEST_SCENE);
  }

  shutdown() {}
}
