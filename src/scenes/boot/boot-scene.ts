import { Scene } from "phaser";
import { SCENES } from "../consts";

export class Boot extends Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  preload() {
    //  Assets that will be used on the preloader (logo, etc) may be loaded here in the future
  }

  create() {
    this.scene.start(SCENES.PRELOADER);
  }
}
