import * as THREE from "three";
import { EffectComposer, UnrealBloomPass } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RenderPixelatedPass } from "three/examples/jsm/postprocessing/RenderPixelatedPass.js";

import { assert } from "@game/core/common/assert";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

export const loader = new GLTFLoader();

export class ThreeScene {
  threeScene: THREE.Scene;
  renderer: THREE.WebGLRenderer;

  renderWithComposer = DebugPanel.debug(this, "renderWithComposer", false, {
    view: { type: "boolean" },
  });

  constructor(private scene: Phaser.Scene, private camera: THREE.Camera) {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const screenResolution = new THREE.Vector2(width, height);
    const renderResolution = screenResolution.clone().divideScalar(2);

    renderResolution.x |= 0;
    renderResolution.y |= 0;

    assert(
      this.scene.sys.game.context instanceof WebGL2RenderingContext,
      "You need to use a WebGL2 context"
    );

    this.threeScene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.scene.sys.game.canvas,
      context: this.scene.sys.game.context,
      antialias: false,
    });

    this.renderer.autoClear = true;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height);

    this.renderer.setViewport(250, 0, width * 0.6, height);

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const composer = new EffectComposer(this.renderer);

    //const effect1 = new ShaderPass(DotScreenShader);
    //effect1.uniforms["scale"].value = 1;
    //composer.addPass(effect1);

    ///composer.addPass(new PixelatePass(renderResolution));

    /*composer.addPass(
    new RenderPixelatedPass(renderResolution, threeScene, camera)
  );*/

    // composer.addPass( new RenderPass( scene, camera ) )

    const r = new RenderPixelatedPass(1.5, this.threeScene, this.camera);
    r.depthEdgeStrength = 100;
    r.normalEdgeStrength = 3;
    composer.addPass(r);

    let bloomPass = new UnrealBloomPass(screenResolution, 0.4, 0.1, 0.9);
    composer.addPass(bloomPass);

    const view: Phaser.GameObjects.Extern & { render: () => void } =
      this.scene.add.extern() as any;

    view.render = () => {
      this.renderer.resetState();

      if (this.renderWithComposer) {
        composer.render();
      } else {
        this.renderer.render(this.threeScene, this.camera);
      }

      // Phaser 3.85 needs to reset
      this.renderer.resetState();
    };
  }
}
