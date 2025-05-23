import { Game, Types } from "phaser";

import { COLORS_NAMES, GAME_HEIGHT, GAME_WIDTH } from "@game/consts";

import PhaserGamebus from "@game/lib/gamebus";
import { GameStateManager } from "@game/state/game-state";

import { SCENE_CLASSES } from "@game/scenes/scenes";
import { SoundManager } from "./core/sound/sound-manager";
import { ScenesManager } from "./state/scenes-manager";

if (import.meta.env.VITE_DEBUG) {
}

const contextCreationConfig = {
  alpha: true,
  depth: true,
  antialias: true,
  premultipliedAlpha: true,
  stencil: true,
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: "default",
};

const myCustomCanvas = document.createElement("canvas");
const myCustomContext = myCustomCanvas.getContext(
  "webgl2",
  contextCreationConfig
);

const config: Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  canvas: myCustomCanvas,
  context: myCustomContext as any,
  backgroundColor: COLORS_NAMES["black"],
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  plugins: {
    global: [
      {
        key: "PhaserGamebus",
        plugin: PhaserGamebus,
        start: true,
        mapping: "gamebus",
      },
      {
        key: "GameStateManager",
        plugin: GameStateManager,
        mapping: "gameState",
      },
      // Order matters, these should be initialized after gameState
      {
        key: "SoundManager",
        plugin: SoundManager,
        mapping: "soundManager",
      },
      {
        key: "ScenesManager",
        plugin: ScenesManager,
        mapping: "scenesManager",
      },
    ],
  },
  scene: Object.values(SCENE_CLASSES),
};

export default new Game(config);
