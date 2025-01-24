import PhaserGamebus from "@game/lib/gamebus";
import { GameStateManager } from "@game/state/game-state";
import { SequenceEngine } from "../ui/animation/animation";

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

import { assert } from "@game/common/assert";

import {
  EffectComposer,
  RenderPixelatedPass,
  UnrealBloomPass,
} from "three/examples/jsm/Addons.js";

export abstract class AbstractScene extends Phaser.Scene {
  // Game plugins
  declare gameState: GameStateManager;
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  declare animationEngine: SequenceEngine;

  init() {
    // Required to make JSX magic happen
    (window as any).currentScene = this;

    this.animationEngine = new SequenceEngine(this);

    this.events.on("preupdate", () => {
      window.currentScene = this;
    });

    this.events.once("shutdown", () => {
      console.log("shutdown", this.scene.key, this, window.currentScene);

      this.shutdown();
    });
  }

  loader = new GLTFLoader();
  three: THREE.Scene;

  createThreeScene() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const aspect = width / height;

    const screenResolution = new THREE.Vector2(width, height);
    const renderResolution = screenResolution.clone().divideScalar(4);
    renderResolution.x |= 0;
    renderResolution.y |= 0;

    const threeScene = new THREE.Scene();

    assert(
      this.sys.game.context instanceof WebGL2RenderingContext,
      "You need to use a WebGL2 context"
    );

    const renderer = new THREE.WebGLRenderer({
      canvas: this.sys.game.canvas,
      context: this.sys.game.context,
      antialias: false,
    });

    renderer.autoClear = true;
    renderer.setPixelRatio(1);
    renderer.setSize(width, height);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const camera = new THREE.OrthographicCamera(
      -aspect,
      aspect,
      1,
      -1,
      0.1,
      2000
    );

    camera.position.set(-1, 5, 4);
    camera.zoom = 4;
    camera.rotateOnAxis(new THREE.Vector3(0, 1, 1), Math.PI);
    camera.updateProjectionMatrix();

    const composer = new EffectComposer(renderer);

    //const effect1 = new ShaderPass(DotScreenShader);
    //effect1.uniforms["scale"].value = 1;
    //composer.addPass(effect1);

    ///composer.addPass(new PixelatePass(renderResolution));

    /*composer.addPass(
      new RenderPixelatedPass(renderResolution, threeScene, camera)
    );*/

    // composer.addPass( new RenderPass( scene, camera ) )

    const r = new RenderPixelatedPass(3, threeScene, camera);
    r.depthEdgeStrength = 100;
    r.normalEdgeStrength = 3;
    composer.addPass(r);

    let bloomPass = new UnrealBloomPass(screenResolution, 0.4, 0.1, 0.9);
    composer.addPass(bloomPass);

    const view: Phaser.GameObjects.Extern & { render: () => void } =
      this.add.extern() as any;

    view.render = () => {
      renderer.resetState();

      //renderer.render(threeScene, camera);
      composer.render();

      // Phaser 3.85 needs to reset
      renderer.resetState();
    };

    return [threeScene, camera, renderer] as const;
  }

  /**
   * Override to clean up things when the scene is shutdown
   */
  abstract shutdown(): void;
}
