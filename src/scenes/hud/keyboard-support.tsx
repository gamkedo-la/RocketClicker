import { BUILDINGS } from "@game/entities/buildings/index";
import { hasResources } from "@game/entities/materials/index";
import { GameScene } from "../game/game-scene";
import { SCENES } from "../scenes";

export const addKeyboardSupport = (scene: GameScene) => {
  const buildings_keys = [
    Phaser.Input.Keyboard.KeyCodes.ONE,
    Phaser.Input.Keyboard.KeyCodes.TWO,
    Phaser.Input.Keyboard.KeyCodes.THREE,
    Phaser.Input.Keyboard.KeyCodes.FOUR,
    Phaser.Input.Keyboard.KeyCodes.FIVE,
    Phaser.Input.Keyboard.KeyCodes.SIX,
    Phaser.Input.Keyboard.KeyCodes.SEVEN,
    Phaser.Input.Keyboard.KeyCodes.EIGHT,
    Phaser.Input.Keyboard.KeyCodes.NINE,
    Phaser.Input.Keyboard.KeyCodes.ZERO,
  ];

  buildings_keys.forEach((k, i) => {
    const key = scene.input.keyboard!.addKey(k);
    key.on("down", () => {
      console.log("down", key);
      if (
        // @ts-ignore
        hasResources(BUILDINGS[i], scene.gameState.state.get().material_storage)
      ) {
        // @ts-ignore
        scene.gameState.setMouseSelectedBuilding(BUILDINGS[i]);
        // @ts-ignore
        scene.soundSystem.play(BUILDINGS[i].sounds.build);
      } else {
        scene.soundSystem.play("sfx-gui-deny");
      }
    });
  });

  const key_escape = scene.input.keyboard!.addKey(
    Phaser.Input.Keyboard.KeyCodes.ESC
  );
  const key_p = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
  const key_m = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
  const key_x = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);

  key_escape.on("down", () => {
    scene.gameState.setMouseSelectedBuilding(null);
    scene.soundSystem.play("sfx-gui-confirm");
  });

  key_p.on("down", () => {
    scene.scene.pause(SCENES.THREE_COMET);
    scene.scene.pause(SCENES.GAME);
    scene.scene.launch(SCENES.UI_PAUSE);

    console.log("Pausing");
  });

  key_m.on("down", () => {
    scene.soundSystem.setSoundMute(!scene.soundSystem.muted);
  });

  key_x.on("down", () => {
    scene.gameState.toggleMouseSelectedBulldoze();
    scene.soundSystem.play("sfx-gui-confirm");
  });
};
