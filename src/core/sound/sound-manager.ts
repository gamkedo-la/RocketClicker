import { GameStateManager } from "@game/state/game-state";

export const SFX = [
  "build-chemicalplant",
  "build-condenser",
  "build-duster",
  "build-electrolysis",
  "build-fuelcell",
  "build-generator",
  "build-H2compressor",
  "build-miner",
  "build-O2compressor",
  "build-solarpanel",
  "sfx-alert",
  "sfx-click",
  "sfx-electricity",
  "sfx-gas-burst",
  "sfx-gui-clip",
  "sfx-gui-confirm",
  "sfx-gui-deny",
  "sfx-gui-window-opens",
  "sfx-mine-stardust",
  "sfx-pick-up",
  "sfx-put-down",
  "sfx-rocket-launch",
];

export const MUSIC = ["music_loop_TheViewFromHere", "placeholder-music-loop"];

export class SoundManager extends Phaser.Plugins.BasePlugin {
  gameState: GameStateManager;

  DEBUG_SOUNDS = true;

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);
  }

  init() {
    if (this.DEBUG_SOUNDS) {
      console.log("SoundManager init");
    }
  }

  boot(gameState: GameStateManager) {
    this.gameState = gameState;
  }

  setupVolumeListeners() {
    // modify
    this.getSound("sfx-gui-window-opens").setDetune(1200);
    this.getSound("sfx-gui-window-opens").setRate(1.2);

    this.gameState.state.get().sound_volume.subscribe((vol) => {
      this.setSfxVolume(vol);
    });

    this.gameState.state.get().music_volume.subscribe((vol) => {
      this.setMusicVolume(vol);
    });

    const music = this.getSound("music_loop_TheViewFromHere");

    this.gameState.state.get().comet_spin_velocity_abs.subscribe((rate) => {
      music.rate = 1 + (rate / 100) * 0.4;
    });
  }

  addSound(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (this.DEBUG_SOUNDS) {
      console.log("addSound", key, config);
    }
    this.game.sound.add(key, config);
  }

  getSound(key: string): Phaser.Sound.WebAudioSound {
    return this.game.sound.get(key) as Phaser.Sound.WebAudioSound;
  }

  // takes a string key as seens in RESOURCES[]
  // fixme: volume etc
  play(soundName = "", config?: Phaser.Types.Sound.SoundConfig) {
    if (this.DEBUG_SOUNDS) console.log("playing sound: " + soundName);

    let snd = this.game.sound.get(soundName);

    if (snd) {
      snd.play(config);
    } else {
      console.error("missing sound: " + soundName);
    }
  }

  stop(soundName = "") {
    if (this.DEBUG_SOUNDS) console.log("stopping sound: " + soundName);

    let snd = this.game.sound.get(soundName);
    if (snd) {
      snd.stop();
    } else {
      console.error("missing sound: " + soundName);
    }
  }

  setSfxVolume(vol = 1) {
    SFX.forEach((sfx) => {
      this.getSound(sfx).setVolume(vol);
    });
  }

  setMusicVolume(vol = 1) {
    MUSIC.forEach((music) => {
      this.getSound(music).setVolume(vol);
    });
  }
}
