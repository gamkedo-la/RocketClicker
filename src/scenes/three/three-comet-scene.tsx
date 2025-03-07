import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { RESOURCES } from "@game/assets";
import PhaserGamebus from "@game/lib/gamebus";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

import { Camera } from "./components/camera";
import { loader, ThreeScene } from "./components/scene";
import { createLights } from "./elements/lights";
import { starMaterial } from "./elements/materials";
import { createSky } from "./elements/sky";

export class ThreeCometScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;

  camera: Camera;
  orbitControls: OrbitControls;

  constructor() {
    super(SCENES.THREE_COMET);
  }

  threeScene: THREE.Scene;
  threeCamera: THREE.OrthographicCamera;

  comet: THREE.Mesh;
  board: THREE.Mesh;
  board_pointer: THREE.Mesh;

  board_bounds: THREE.Box3;
  board_size: THREE.Vector3;

  async create() {
    this.bus = this.gamebus.getBus();

    const camera = new Camera(
      this.game.scale.width * 0.6,
      this.game.scale.height
    );
    const scene = new ThreeScene(this, camera.camera);
    const renderer = scene.renderer;

    this.camera = camera;

    this.threeScene = scene.threeScene;
    this.threeCamera = camera.camera;

    loader.parse(this.cache.binary.get(RESOURCES["comet-3"]), "", (gltf) => {
      gltf.scene.traverse((node) => {
        if (node.name === "star") {
          (node as THREE.Mesh).material = starMaterial;
        }

        if (node.name === "comet") {
          this.comet = node as THREE.Mesh;

          // Add the camera pivot as a child of the comet
          this.comet.add(this.camera.getPivot());
        }

        if (node.name === "board") {
          this.board = node as THREE.Mesh;
          this.board.visible = false;

          const board = this.gameState.state.get()?.board;

          for (let x = 0; x < board.boardWidth; x++) {
            for (let y = 0; y < board.boardHeight; y++) {
              const star = new THREE.Mesh(
                new THREE.SphereGeometry(0.01, 32, 32),
                starMaterial
              );

              star.position.set(
                -0.055 + (x + y) * 0.025,
                0.04,
                -0.05 + (x - y) * 0.025
              );

              this.comet.add(star);
            }
          }

          this.board_bounds = new THREE.Box3().setFromObject(this.board);
          this.board_size = this.board_bounds.getSize(new THREE.Vector3());

          console.log("Board bounds:", {
            min: this.board_bounds.min,
            max: this.board_bounds.max,
            size: this.board_size,
          });

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

      this.threeScene.add(gltf.scene);
    });

    const sky = createSky();
    this.threeScene.add(sky);

    const lights = createLights();
    this.threeScene.add(...lights);
  }

  pointer = DebugPanel.debug(this, "pointer", new THREE.Vector2(), {
    view: { type: "point2d", min: -1, max: 1, step: 0.001 },
  });

  board_pointer_coor = DebugPanel.debug(
    this,
    "board_pointer_coor",
    new THREE.Vector2(),
    {
      view: { type: "point2d", min: -1, max: 1, step: 0.001 },
    }
  );

  update(time: number, delta: number) {
    if (this.board) {
      const pointer = this.input.activePointer;

      // First normalize within the viewport
      const viewportWidth = this.game.scale.width * 0.6;
      const viewportX = pointer.x - 250; // Adjust for viewport offset

      // Convert to NDC (-1 to 1) within the viewport
      const x = (viewportX * 2) / viewportWidth - 1;
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

        this.board_pointer_coor.x = localPoint.x;
        this.board_pointer_coor.y = localPoint.z;

        // Normalize to -1 to 1 first, then convert to 0 to 1
        // Calculate actual board dimensions in local space
        const boardWidth = this.board_bounds.max.x - this.board_bounds.min.x;
        const boardDepth = this.board_bounds.max.z - this.board_bounds.min.z;

        // Map local coordinates to 0-1 range based on actual board dimensions
        this.pointer.x = (localPoint.x - this.board_bounds.min.x) / boardWidth;
        this.pointer.y = (localPoint.z - this.board_bounds.min.z) / boardDepth;
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
