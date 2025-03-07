import * as THREE from "three";

export function createSky() {
  // Create a large sphere for the sky dome
  const skyGeometry = new THREE.SphereGeometry(1, 32, 32);

  // Invert the geometry so we can see it from the inside
  skyGeometry.scale(-1, 1, 1);
  skyGeometry.rotateY(-Math.PI / 2);

  // Create a gradient material for the sky
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      resolution: {
        value: new THREE.Vector2(window.innerWidth * 0.6, window.innerHeight),
      },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      
      // Hash function for stable random values
      float hash(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }
      
      void main() {
        vec3 dir = normalize(vWorldPosition);
        
        // Base sky color (very dark blue)
        vec3 skyColor = vec3(0.005, 0.005, 0.01);
        
        // Create a stable star field
        float stars = 0.0;
        
        // Use spherical coordinates for better star distribution
        vec2 sphCoord = dir.xy * 100.0; // Reduced scale for more stars
        
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
        finalColor += vec3(0.005, 0.005, 0.01) * dir.y;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });

  return new THREE.Mesh(skyGeometry, skyMaterial);
}
