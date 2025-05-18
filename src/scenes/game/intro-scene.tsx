import { GameStatus } from "@game/state/game-state";

import { GAME_HEIGHT, GAME_WIDTH, STRING_COLORS_NAMES } from "@game/consts";
import { ALIGN_ITEMS, DIRECTION, JUSTIFY } from "@game/core/ui/AbstractFlex";
import { AbstractScene } from "..";
import { Flex } from "../../core/ui/Flex";
import { Spacer } from "../../core/ui/FlexItem";
import { SCENES } from "../scenes";
import { RESOURCES } from "@game/assets";

// Same as the three scene sky fragment shader
const skyFragmentShader = `
precision mediump float;

uniform vec2 resolution;
varying vec2 fragCoord;
uniform float time;

// Hash function for stable random values
float hash(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = fragCoord / resolution.xy * 2.0;
  
  // Base sky color (very dark blue)
  vec3 skyColor = vec3(0.005, 0.02, 0.05);
  
  // Create a stable star field
  float stars = 0.05;
  
  // Use spherical coordinates for better star distribution
  vec2 sphCoord = uv * 25.0 + vec2(time, time * 0.5); // Reduced scale for more stars
  
  // Multiple layers of stars
  for(float i = 1.0; i <= 3.0; i++) {
    vec2 grid = floor(sphCoord * i);
    float h = hash(grid);
    
    // Increased star density by lowering threshold
    if(h > 0.95) {
      vec2 center = grid + 0.5;
      float dist = length(fract(sphCoord * i) - 0.5);
      
      // More pronounced twinkling
      float twinkle = sin(h * 2.0) * 0.5 + 0.5;
      // Larger, brighter stars
      float brightness = (1.0 - smoothstep(0.0, 0.1, dist)) * twinkle;
      
      // Increased star brightness
      stars += brightness * (0.5 / i);
      
      // Add a bright core to some stars
    }
  }
  
  // Combine sky color with brighter stars
  vec3 finalColor = skyColor + vec3(stars);
  
  // Add very subtle atmospheric gradient
  finalColor += skyColor * uv.y;

  gl_FragColor = vec4(finalColor, 1.0);
}`;

export class IntroScene extends AbstractScene {
  constructor() {
    super(SCENES.INTRO);
  }

  create() {
    const base = new Phaser.Display.BaseShader(
      "simpleTexture",
      skyFragmentShader
    );

    const shader = this.add.shader(base, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    shader.setRenderToTexture("scene-background");

    const background = <image texture="scene-background" />;

    this.gameState.setGameStatus(GameStatus.LOADING);

    const clickText = (
      <text text="Press to start" style={{ fontSize: 48, color: "white" }} />
    );

    const flex = (
      <Flex
        justify={JUSTIFY.CENTER}
        alignContent={ALIGN_ITEMS.CENTER}
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        direction={DIRECTION.COLUMN}
        margin={10}
        backgroundElement={background}
      >
        <image texture={RESOURCES["logo"]} width={430} height={430} />
        <Spacer grow={0} height={10} />

        <text
          text={[
            "Your rocket landed on a small comet and it needs to be refueled",
            "with liquid oxygen and hydrogen.",
            "",
            "Mine the comet to generate energy and materials.",
          ]}
          style={{ fontSize: 28, color: "white", align: "center" }}
        />

        <Spacer grow={0} height={20} />
        {clickText}
      </Flex>
    );

    flex.addToScene();

    this.input.once("pointerdown", () => {
      clickText.setText("Landing rocket...");
      clickText.setColor(STRING_COLORS_NAMES["strawberry-field"]);
      flex.trashLayout();
      this.scenesManager.transitionTo("start");
    });
  }

  shutdown() {}
}
