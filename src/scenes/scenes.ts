import { Boot } from "./boot/boot-scene";
import { Preloader } from "./boot/preloader-scene";
import { GameScene } from "./game/game-scene";
import { TestScene } from "./game/test-scene";

export const SCENES = {
  BOOT: "Boot",
  PRELOADER: "Preloader",

  TEST: "Test",

  GAME: "Game",
};

export type SceneKeys = keyof typeof SCENES;
export type SceneValues = (typeof SCENES)[SceneKeys];

export const SCENE_CLASSES: Record<SceneKeys, typeof Phaser.Scene> = {
  BOOT: Boot,
  PRELOADER: Preloader,
  TEST: TestScene,
  GAME: GameScene,
};
