import { Boot } from "./boot/boot-scene";
import { Preloader } from "./boot/preloader-scene";
import { DebugScene } from "./game/debug-scene";
import { GameScene } from "./game/game-scene";

export const SCENES = {
  BOOT: "Boot",
  PRELOADER: "Preloader",

  DEBUG: "Debug",
  GAME: "Game",
};

export type SceneKeys = keyof typeof SCENES;
export type SceneValues = (typeof SCENES)[SceneKeys];

export const SCENE_CLASSES: Record<SceneKeys, typeof Phaser.Scene> = {
  BOOT: Boot,
  PRELOADER: Preloader,
  DEBUG: DebugScene,
  GAME: GameScene,
};
