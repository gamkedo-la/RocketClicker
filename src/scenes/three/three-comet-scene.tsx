import { AbstractScene } from "..";
import PhaserGamebus from "../../lib/gamebus";
import { SCENES } from "../scenes";

import { RESOURCES } from "@game/assets";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

export class ThreeCometScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Phaser.Cameras.Scene2D.Camera;
  orbitControls: OrbitControls;

  constructor() {
    super(SCENES.THREE_COMET);
  }

  spotLight: THREE.SpotLight;
  threeCamera: THREE.OrthographicCamera;
  comet: THREE.Mesh;
  board: THREE.Mesh;
  board_pointer: THREE.Mesh;

  async create() {
    this.bus = this.gamebus.getBus();

    this.camera = this.cameras.main;

    const [scene, camera, renderer] = this.createThreeScene();

    this.threeCamera = camera;
    this.orbitControls = new OrbitControls(camera, renderer.domElement);

    const controls = this.orbitControls;

    controls.listenToKeyEvents(window);

    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    controls.screenSpacePanning = false;

    controls.minDistance = 100;
    controls.maxDistance = 500;

    controls.maxPolarAngle = Math.PI / 2;

    this.loader.parse(
      this.cache.binary.get(RESOURCES["comet-3"]),
      "",
      (gltf) => {
        gltf.scene.scale.set(0.5, 0.5, 0.5);
        gltf.scene.position.set(0, 0, 0);
        gltf.scene.rotation.set(0, 0, 0);
        scene.add(gltf.scene);

        gltf.scene.traverse((node) => {
          if (node.name === "camera") {
            camera.position.set(
              node.position.x,
              node.position.y,
              node.position.z
            );
            camera.lookAt(0, 0.3, 0);
            camera.zoom = 6;
            camera.updateProjectionMatrix();
          }

          if (node.name === "star") {
            const sphereMaterial2 = new THREE.MeshStandardMaterial({
              color: 0x444444,
              dithering: true,
              metalness: 0.3,
              roughness: 1,
              flatShading: true,
              emissive: 0xffffff,
              emissiveIntensity: 1,
            });
            (node as THREE.Mesh).material = sphereMaterial2;

            this.spotLight.position.set(
              node.position.x,
              node.position.y + 2,
              node.position.z
            );
          }

          if (node.name === "comet") {
            this.comet = node as THREE.Mesh;
            // Add the camera as a child of the comet
            //this.comet.position.set(0, 0.5, 0);
            this.comet.add(this.threeCamera);
            // Position the camera relative to the comet
            //this.threeCamera.position.set(0, 0, 0);
            //this.threeCamera.lookAt(this.comet.position);
          }

          if (node.name === "board") {
            this.board = node as THREE.Mesh;
            this.board.position.setX(0.04);
            this.board.position.setY(0.04);
            this.board.position.setZ(-0.05);
            this.comet.add(this.board);

            this.board_pointer = new THREE.Mesh(
              new THREE.SphereGeometry(0.01, 32, 32),
              new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            this.comet.add(this.board_pointer);
          }

          if (node instanceof THREE.Mesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });
      }
    );

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
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
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

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    scene.add(sky);

    scene.add(new THREE.AmbientLight(0x2d3645, 1.5));

    {
      let directionalLight = new THREE.DirectionalLight(0xfffc9c, 0.5);
      directionalLight.position.set(0, -10, 0);
      directionalLight.castShadow = true;
      scene.add(directionalLight);
    }

    // neon blue backlight spotlight
    {
      let spotLight = new THREE.SpotLight(
        0xffffff,
        5,
        10,
        Math.PI / 8,
        0.02,
        0
      );
      spotLight.position.set(-2, 1, 0);
      let target = spotLight.target;
      scene.add(target);
      target.position.set(0, 0, 0);
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.set(4, 4);
      scene.add(spotLight);
      this.spotLight = spotLight;
    }
  }

  pointer = DebugPanel.debug(this, "pointer", new THREE.Vector2(), {
    view: { type: "point2d", min: -1, max: 1, step: 0.01 },
  });

  update(time: number, delta: number) {
    if (this.board) {
      // Get normalized device coordinates (-1 to +1) for mouse position
      const pointer = this.input.activePointer;
      // TODO: Magic number
      const x = ((pointer.x - 250) * 2) / (this.game.scale.width * 0.6) - 1;
      const y = -((pointer.y * 2) / this.game.scale.height) + 1;

      // Setup raycaster
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.threeCamera);

      // Check for intersection with board
      const intersects = raycaster.intersectObject(this.board);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        // Convert world coordinates to local coordinates relative to comet
        const worldPoint = intersection.point;
        const localPoint = this.comet.worldToLocal(worldPoint.clone());

        this.board_pointer.position.copy(localPoint);

        this.pointer.x = localPoint.x;
        this.pointer.y = localPoint.z;
      }
    }

    if (this.comet) {
      // Create a pivot point at origin (0,0,0)
      const pivot = new THREE.Vector3(0, 0, 0);

      // Calculate current position relative to pivot
      const position = this.comet.position.clone().sub(pivot);

      // Rotate position around Z axis
      const rotationSpeed = 0.001;
      position.applyAxisAngle(new THREE.Vector3(0, 0, 1), rotationSpeed);

      // Add pivot back to get new world position
      this.comet.position.copy(position.add(pivot));

      // Keep comet oriented correctly during orbit
      this.comet.rotateZ(rotationSpeed);
    }
  }

  shutdown() {}
}
