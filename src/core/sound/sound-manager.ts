export class SoundManager extends Phaser.Plugins.BasePlugin {
  DEBUG_SOUNDS = false;
  muted = false;

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);
  }

  init() {
    if (this.DEBUG_SOUNDS) {
      console.log("SoundManager init");
    }
  }

  addSound(key: string, config?: Phaser.Types.Sound.SoundConfig) {
    if (this.DEBUG_SOUNDS) {
      console.log("addSound", key, config);
    }
    this.game.sound.add(key, config);
  }

  // takes a string key as seens in RESOURCES[]
  // fixme: volume etc
  play(soundName = "") {
    if (this.DEBUG_SOUNDS) console.log("playing sound: " + soundName);

    if (this.muted) return;

    let snd = this.game.sound.get(soundName);

    if (snd) {
      snd.play();
    } else {
      console.error("missing sound: " + soundName);
    }
  }

  // mute or unmute all sounds
  setSoundMute(muted = false) {
    if (this.DEBUG_SOUNDS) console.log("sound is muted: " + muted);
    this.muted = muted;
  }

  // global volume for all sounds
  setSoundVolume(vol = 1) {
    this.game.sound.volume = vol;
  }
}
