import { Boot } from "./boot/boot-scene";
import { Preloader } from "./boot/preloader-scene";
import { GameCreditsScene } from "./game/game-credits";
import { GameScene } from "./game/game-scene";
import { IntroScene } from "./game/intro-scene";
import { HudScene } from "./hud/hud-scene";
import { ThreeCometScene } from "./three/three-comet-scene";
import { PauseScene } from "./transition/pause-scene";
import { TransitionsScene } from "./transition/transitions-scene";

export const SCENES = {
  BOOT: "Boot",
  PRELOADER: "Preloader",
  TRANSITIONS: "Transitions",

  INTRO: "Intro",
  GAME: "Game",
  GAME_CREDITS: "GameCredits",

  THREE_COMET: "ThreeComet",
  HUD: "Hud",
  UI_PAUSE: "UI-Pause",
};

export type SceneKeys = keyof typeof SCENES;
export type SceneValues = (typeof SCENES)[SceneKeys];

export const SCENE_CLASSES: Record<SceneKeys, typeof Phaser.Scene> = {
  BOOT: Boot,
  PRELOADER: Preloader,
  TRANSITIONS: TransitionsScene,

  INTRO: IntroScene,
  GAME: GameScene,
  GAME_CREDITS: GameCreditsScene,

  THREE_COMET: ThreeCometScene,
  HUD: HudScene,
  UI_PAUSE: PauseScene,
};

export const TEST_SCENE = "TEST";
