import * as THREE from "three";
import { WebGLRenderer, WebGLRenderTarget } from "three";
import {
  Pass,
  FullScreenQuad,
} from "three/examples/jsm/postprocessing/Pass.js";

export default class PixelatePass extends Pass {
  fsQuad: FullScreenQuad;
  resolution: THREE.Vector2;

  constructor(resolution: THREE.Vector2) {
    super();
    this.resolution = resolution;
    this.fsQuad = new FullScreenQuad(this.material());
  }

  render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget,
    readBuffer: WebGLRenderTarget
  ) {
    // @ts-ignore
    const uniforms = this.fsQuad.material.uniforms;
    uniforms.tDiffuse.value = readBuffer.texture;
    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
    }
    this.fsQuad.render(renderer);
  }

  material() {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: {
          value: new THREE.Vector4(
            this.resolution.x,
            this.resolution.y,
            1 / this.resolution.x,
            1 / this.resolution.y
          ),
        },
      },
      vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
                `,
      fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec4 resolution;
                varying vec2 vUv;
                float pattern() {
                float angle = 1.57;
                float scale = 3.0;
                vec2 center = vec2( 0.5, 0.5 );
                vec2 tSize = vec2( 256.0,256.0 );
                  float s = sin( angle ), c = cos( angle );
                  vec2 tex = vUv * tSize - center;
                  vec2 point = vec2( c * tex.x - s * tex.y, s * tex.x + c * tex.y ) * scale;
                  return ( sin( point.x ) * sin( point.y ) ) * 0.2;
                }
                void main() {
                    vec2 iuv = (floor(resolution.xy * vUv) + .5) * resolution.zw;
                    vec4 texel = texture2D( tDiffuse, iuv );
                    gl_FragColor = vec4(texel.rgb +pattern(), 1.0);
                }
                `,
    });
  }
}
