import { System } from "@game/systems/index";

export default class SoundSystem implements System {

  DEBUG_SOUNDS = true;
  allSamples = [];

  create(/*myScene:Phaser.Scene*/):this {
    if (this.DEBUG_SOUNDS) console.log("creating SoundSystem");
    // WIP - these need to grab the current scene
    // let key = "sfx-mine-stardust";
    // myScene.load.audio(key, RESOURCES[key]); // tell phaser to download the .mp3 url
    // this.allSamples.push(myScene.sound.add(key)); // create playable phaser sound in the scene
    return this;
  }
  
  update(time: number, delta: number) {
    if (this.DEBUG_SOUNDS) console.log("updating SoundSystem at time "+time.toFixed(2)+" delta "+delta.toFixed(2));
  }
  
  destroy() {
    if (this.DEBUG_SOUNDS) console.log("destroying a SoundSystem");
  }

  //play(key="") {
  //  if (this.allSamples[key]) this.allSamples[key].play(); // etc
  //}

}