import { Game, Types } from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "./consts";

import PhaserGamebus from "./lib/gamebus";
import { GameStateManager } from "./state/game-state";

import { SCENE_CLASSES } from "./scenes/scenes";

const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#3c9f9c",
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 2,
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
    ],
  },
  scene: Object.values(SCENE_CLASSES),
};

export default new Game(config);
