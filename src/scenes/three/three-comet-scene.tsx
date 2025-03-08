import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { RESOURCES } from "@game/assets";
import PhaserGamebus from "@game/lib/gamebus";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

import { effect } from "@game/core/signals/signals";
import { BUILDINGS } from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { Camera } from "./components/camera";
import { loader, ThreeScene } from "./components/scene";
import { createLights } from "./elements/lights";
import { buildingMaterial, starMaterial } from "./elements/materials";
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

  terrain: THREE.Mesh[][];
  buildingMeshes: Map<number, THREE.Object3D> = new Map();
  buildingModels: Map<string, THREE.Object3D> = new Map();

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

    const board = this.gameState.state.get()?.board;

    this.terrain = Array.from({ length: board.boardWidth }, () =>
      Array(board.boardHeight).fill(0)
    );

    this.loadCometSystemModel();
    this.setupBoardListeners();

    const sky = createSky();
    this.threeScene.add(sky);

    const lights = createLights();
    this.threeScene.add(...lights);
  }

  private loadCometSystemModel() {
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
          // TODO: remove board from model?
          this.board = node as THREE.Mesh;
          this.board.visible = false;

          this.createBoardGrid();
        }

        if (node instanceof THREE.Mesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      this.threeScene.add(gltf.scene);

      // Load building models
      this.loadBuildingModels();

      /*
      const buildingTypes = BUILDINGS.map((b) => b.id);

      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          this.gameState.addBuilding(
            x,
            y,
            getBuildingById(
              buildingTypes[Math.floor(Math.random() * buildingTypes.length)]
            )
          );
        }
      }
      */
    });
  }

  private createBoardGrid() {
    const board = this.gameState.state.get()?.board;

    for (let x = 0; x < board.boardWidth; x++) {
      for (let y = 0; y < board.boardHeight; y++) {
        const ground = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.0005, 0.035),
          buildingMaterial
        );

        ground.castShadow = true;
        ground.receiveShadow = true;

        ground.position.set(
          -0.055 + (x + y) * 0.025,
          0.039,
          -0.05 + (x - y) * 0.025
        );

        ground.rotateY(Math.PI / 4);

        //this.comet.add(ground);
        this.terrain[x][y] = ground;
      }
    }
  }

  private setupBoardListeners() {
    const board = this.gameState.state.get()?.board;

    if (!board || !board.grid_buildings) return;

    // Set up listeners for building changes
    board.grid_buildings.forEach((buildingSignal, cellId) => {
      effect(() => {
        const building = buildingSignal.get();
        console.log("Building changed", building);
        if (building) {
          this.addBuildingToCell(cellId, building);
        } else {
          this.removeBuildingFromCell(cellId);
        }
      });
    });
  }

  private loadBuildingModels() {
    // This will load all building models and store them for later use
    // For now, we'll create simple placeholder geometries

    const buildingTypes = BUILDINGS.map((b) => b.id);
    const colors = [
      0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
      0x800080, 0x008000, 0x800000,
    ];

    buildingTypes.forEach((type, index) => {
      const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
      const material = new THREE.MeshPhongMaterial({ color: colors[index] });
      const mesh = new THREE.Mesh(geometry, material);

      mesh.rotateY(Math.PI / 4);

      this.buildingModels.set(type, mesh);
    });
  }

  /**
   * Converts a cell ID to a position on the comet
   */
  private getCellPosition(cellId: number): THREE.Vector3 {
    const board = this.gameState.state.get()?.board;
    if (!board) return new THREE.Vector3();

    const x = cellId % board.boardWidth;
    const y = Math.floor(cellId / board.boardWidth);

    return new THREE.Vector3(
      -0.055 + (x + y) * 0.025,
      0.0475, // Slightly above the board
      -0.05 + (x - y) * 0.025
    );
  }

  /**
   * Adds a building mesh to a specific cell
   */
  public addBuildingToCell(cellId: number, building: Building) {
    console.log("Adding building to cell", building);
    // Remove any existing building at this cell
    this.removeBuildingFromCell(cellId);

    // Get the building model
    let buildingMesh = this.buildingModels.get(building.id)!.clone();

    // TODO: Shadows or something
    buildingMesh.castShadow = true;
    buildingMesh.receiveShadow = true;

    // Position the building
    const position = this.getCellPosition(cellId);
    buildingMesh.position.copy(position);

    // Add to the scene and track it
    this.comet.add(buildingMesh);
    this.buildingMeshes.set(cellId, buildingMesh);

    console.log(`Added building ${building.name} to cell ${cellId}`);
    return buildingMesh;
  }

  /**
   * Removes a building mesh from a specific cell
   */
  public removeBuildingFromCell(cellId: number) {
    if (this.buildingMeshes.has(cellId)) {
      const mesh = this.buildingMeshes.get(cellId)!;
      this.comet.remove(mesh);
      this.buildingMeshes.delete(cellId);
      console.log(`Removed building from cell ${cellId}`);
    }
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

  zAxis = new THREE.Vector3(0, 0, 1);

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

      // TODO: interactions!
      const intersects = raycaster.intersectObjects(this.terrain[0]);

      if (intersects.length > 0) {
        const intersection = intersects[0];
      }
    }

    if (this.comet) {
      // Calculate current position relative to pivot
      const position = this.comet.position.clone();

      // Rotate position around Z axis
      const rotationSpeed = 0.001;
      position.applyAxisAngle(this.zAxis, rotationSpeed);

      // Add pivot back to get new world position
      this.comet.position.copy(position);

      // Keep comet oriented correctly during orbit
      this.comet.rotateZ(rotationSpeed);
    }
  }

  shutdown() {}
}
