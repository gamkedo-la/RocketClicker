import { Boot } from "./boot/boot-scene";
import { Preloader } from "./boot/preloader-scene";
import { GameScene } from "./game/game-scene";
import { ThreeCometScene } from "./three/three-comet-scene";

export const SCENES = {
  BOOT: "Boot",
  PRELOADER: "Preloader",

  THREE_COMET: "ThreeComet",

  GAME: "Game",
};

export type SceneKeys = keyof typeof SCENES;
export type SceneValues = (typeof SCENES)[SceneKeys];

export const SCENE_CLASSES: Record<SceneKeys, typeof Phaser.Scene> = {
  BOOT: Boot,
  PRELOADER: Preloader,
  THREE_COMET: ThreeCometScene,
  GAME: GameScene,
};
