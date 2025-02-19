import { RESOURCES } from "@game/assets";
import { GAME_WIDTH } from "@game/consts";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

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
  }

  preload() {
    // Load the assetPack.json
    this.load.pack("assetPack", "assetPack.json");

    // TODO:
    // Make the spritesheets to be handled by assetPack.json through
    // the asset-conversion vite plugin. I'm not sure yet how to set
    // the metadata for the spritesheets.


    this.load.spritesheet("eleven", "assets/nine/one.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.font("handjet", "assets/handjet-font.ttf");
  }

  create() {
    // TODO:
    // Auto animations

    const graphics = this.add.graphics();
    graphics.fillStyle(0x927e6a);
    graphics.fillStyle(0xefd8a1);
    graphics.fillCircle(1, 1, 2);
    graphics.generateTexture("wind_particle", 2, 2);
    graphics.destroy();

    this.scene.start(SCENES.GAME);
  }

  shutdown() {}
}
