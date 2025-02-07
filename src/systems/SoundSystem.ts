// we don't need update() or draw() and we do need custom funcs
// import { System } from "@game/systems/index";
// export default class SoundSystem implements System {
// import { RESOURCES } from "@game/assets";

export default class SoundSystem {

  DEBUG_SOUNDS = true;
  scene!:Phaser.Scene; 

  constructor (thisScene:Phaser.Scene) {
    if (this.DEBUG_SOUNDS) console.log("creating SoundSystem");
    this.scene = thisScene;

    // the preloader has already downloaded the .mp3
    // so we just add them to the scene ready to play
    // FIXME: iterate all non-graphic RESOURCES[] 
    this.scene.sound.add("build-chemicalplant");
    this.scene.sound.add("build-condenser");
    this.scene.sound.add("build-duster");
    this.scene.sound.add("build-electrolysis");
    this.scene.sound.add("build-fuelcell");
    this.scene.sound.add("build-generator");
    this.scene.sound.add("build-H2compressor");
    this.scene.sound.add("build-miner");
    this.scene.sound.add("build-O2compressor");
    this.scene.sound.add("build-solarpanel");
    this.scene.sound.add("sfx-alert");
    this.scene.sound.add("sfx-click");
    this.scene.sound.add("sfx-electricity");
    this.scene.sound.add("sfx-gas-burst");
    this.scene.sound.add("sfx-gui-clip");
    this.scene.sound.add("sfx-gui-confirm");
    this.scene.sound.add("sfx-gui-deny");
    this.scene.sound.add("sfx-gui-window-opens");
    this.scene.sound.add("sfx-mine-stardust");
    this.scene.sound.add("sfx-pick-up");
    this.scene.sound.add("sfx-put-down");

    return this;
  }
  
  destroy() {
    if (this.DEBUG_SOUNDS) console.log("destroying a SoundSystem");
    // fixme: unload sounds from ram/scene, stop any currently playing
  }

  // takes a string key as seens in RESOURCES[]
  // fixme: volume etc
  play(soundName="") {
    if (this.DEBUG_SOUNDS) console.log("playing sound: "+soundName);
    let snd = this.scene.sound.get(soundName);
    if (snd) {
        snd.play(); 
    } else {
        console.error("missing sound: "+soundName);
    }
  }

  // mute or unmute all sounds
  setSoundMute(muted=false) {
    if (this.DEBUG_SOUNDS) console.log("sound is muted: "+muted);
    this.scene.sound.mute = muted;
  }

  // global volume for all sounds
  setSoundVolume(vol=1) { 
    this.scene.sound.volume = vol;
  }

}