import { Boot } from "./boot/boot-scene";
import { Preloader } from "./boot/preloader-scene";
import { GameScene } from "./game/game-scene";
import { HudScene } from "./hud/hud-scene.tsx";
import { ThreeCometScene } from "./three/three-comet-scene";
import { PauseScene } from "./transition/pause-scene";

export const SCENES = {
  BOOT: "Boot",
  PRELOADER: "Preloader",

  THREE_COMET: "ThreeComet",

  GAME: "Game",
  HUD: "Hud",
  UI_PAUSE: "UI-Pause",
};

export type SceneKeys = keyof typeof SCENES;
export type SceneValues = (typeof SCENES)[SceneKeys];

export const SCENE_CLASSES: Record<SceneKeys, typeof Phaser.Scene> = {
  BOOT: Boot,
  PRELOADER: Preloader,
  THREE_COMET: ThreeCometScene,
  GAME: GameScene,
  HUD: HudScene,
  UI_PAUSE: PauseScene,
};
