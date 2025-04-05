import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { RESOURCES } from "@game/assets";
import PhaserGamebus from "@game/lib/gamebus";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

import { effect, signal } from "@game/core/signals/signals";
import { BUILDINGS, getBuildingById } from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { MATERIALS } from "@game/entities/materials/index";
import { Camera } from "./components/camera";
import { loader, ThreeScene } from "./components/scene";
import { createLights } from "./elements/lights";
import { buildingMaterial, starMaterial } from "./elements/materials";
import { createSky } from "./elements/sky";
import { MotionMachine } from "../../core/motion-machine/motion-machine";

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
  rocket: THREE.Mesh;

  board: THREE.Mesh;
  board_pointer: THREE.Mesh;

  board_bounds: THREE.Box3;
  board_size: THREE.Vector3;

  interactiveMeshes: THREE.Mesh[];

  // Building meshes that are on the comet
  buildingMeshes: Map<number, THREE.Object3D> = new Map();

  // Cache of building models
  buildingsModelsCache: Map<string, THREE.Object3D> = new Map();

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

    this.interactiveMeshes = [];

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

          this.comet.userData = {
            id: "comet",
          };

          // Add the camera pivot as a child of the comet
          this.comet.add(this.camera.getPivot());
          this.interactiveMeshes.push(this.comet);
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
      this.loadRocketLauncherModel();
    });
  }

  private createBoardGrid() {
    const board = this.gameState.state.get()?.board;

    for (let x = 0; x < board.boardWidth; x++) {
      for (let y = 0; y < board.boardHeight; y++) {
        if (x === 2 && y === 2) {
          // Rocket launcher
          continue;
        }
        const terrainMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.0005, 0.035),
          buildingMaterial.clone()
        );

        terrainMesh.castShadow = true;
        terrainMesh.receiveShadow = true;

        terrainMesh.position.set(
          -0.055 + (x + y) * 0.025,
          0.039,
          -0.05 + (x - y) * 0.025
        );

        terrainMesh.rotateY(Math.PI / 4);

        terrainMesh.userData = {
          cellId: this.gameState.gridToCell(x, y),
          grid: { x, y },
          id: "terrain",
        };

        this.comet.add(terrainMesh);
        this.interactiveMeshes.push(terrainMesh);
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

  private loadRocketLauncherModel() {
    loader.parse(
      this.cache.binary.get(RESOURCES["rocket-temporary"]),
      "",
      (gltf) => {
        const mesh = gltf.scene as THREE.Mesh;

        gltf.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          }

          // Scale and rotate the model as needed
          gltf.scene.scale.set(0.0033, 0.0033, 0.0033);
          //gltf.scene.position.set(0, -0.1, 0);
          gltf.scene.rotateY(Math.PI / 4);
        });

        // TODO: Shadows or something
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = {
          id: "rocket-launcher",
          grid: { x: 2, y: 2 },
          cellId: this.gameState.gridToCell(2, 2),
        };

        // Position the building
        const position = this.getCellPosition(this.gameState.gridToCell(2, 2));
        mesh.position.copy(position);
        mesh.position.y -= 0.008;

        // Add to the scene and track it
        this.comet.add(mesh);
        this.rocket = mesh.children[0].children[1] as THREE.Mesh;

        const tower = mesh.children[0].children[0] as THREE.Mesh;

        const rocketRotY = signal(0);
        const rocketPosY = signal(0);

        const towerRotX = signal(0);

        const y = new THREE.Vector3(0, 1, 0);
        const x = new THREE.Vector3(1, 0, 0);

        rocketRotY.subscribe((value) => {
          this.rocket.setRotationFromAxisAngle(y, value);
        });

        rocketPosY.subscribe((value) => {
          this.rocket.position.y += value;
        });

        towerRotX.subscribe((value) => {
          tower.setRotationFromAxisAngle(x, value);
        });

        const machine: MotionMachine<"idle" | "launching", "send_rocket"> = (
          <motionMachine initialState="idle">
            <state id="idle">
              <transition on="send_rocket" target="launching" />
            </state>
            <state id="launching">
              <animation>
                <parallel>
                  <tween
                    from={0}
                    to={0.14}
                    duration={10000}
                    signal={rocketPosY}
                  />
                  <tween
                    from={0}
                    to={Math.PI / 2}
                    duration={4000}
                    signal={towerRotX}
                  />
                </parallel>
              </animation>
            </state>
          </motionMachine>
        );

        this.bus.on("send_rocket", () => {
          machine.transition("send_rocket");
        });
      }
    );
  }

  private loadBuildingModels() {
    // This will load all building models and store them for later use
    // For now, if there's no model, we are create simple placeholder geometries

    const buildingTypes = BUILDINGS.map((b) => b.id);
    const colors = [
      0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffa500,
      0x800080, 0x008000, 0x800000,
    ];

    // Load 3D models for buildings that have them
    const modelLoaders = new Map([
      ["generator", RESOURCES.generator],
      ["miner", RESOURCES.Miner],
      ["chemical-plant", RESOURCES.ChemicalPlant],
      ["duster", RESOURCES.Duster],
      ["condenser", RESOURCES.condenser],
      ["solar-panel", RESOURCES.SolarPanels],
      ["fuel-cell", RESOURCES.FuelCell],
      ["electrolysis", RESOURCES.Electrolysis],
      ["h2-compressor", RESOURCES.compressor],
      ["o2-compressor", RESOURCES.compressor],
    ]);

    buildingTypes.forEach((type, index) => {
      // Check if we have a 3D model for this building type
      if (modelLoaders.has(type!)) {
        const modelResource = modelLoaders.get(type!)!;
        loader.parse(this.cache.binary.get(modelResource), "", (gltf) => {
          gltf.scene.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          // Scale and rotate the model as needed
          gltf.scene.scale.set(0.0033, 0.0033, 0.0033);
          //gltf.scene.position.set(0, -0.1, 0);
          gltf.scene.rotateY(Math.PI / 4);

          this.buildingsModelsCache.set(type!, gltf.scene);
        });
      } else {
        // Use placeholder geometry for buildings without models
        const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
        const material = new THREE.MeshPhongMaterial({ color: colors[index] });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotateY(Math.PI / 4);
        this.buildingsModelsCache.set(type!, mesh);
      }
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
    let buildingMesh = this.buildingsModelsCache.get(building.id)!.clone();

    const mesh = buildingMesh as THREE.Mesh;
    if (mesh.material) {
      mesh.material = (mesh.material as THREE.Material).clone();
    }

    // TODO: Shadows or something
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const grid = this.gameState.cellToGrid(cellId)!;

    mesh.userData = {
      id: building.id,
      grid: { x: grid.x, y: grid.y },
      cellId,
    };

    // Position the building
    const position = this.getCellPosition(cellId);
    mesh.position.copy(position);
    mesh.position.y -= 0.008;

    // Add to the scene and track it
    this.comet.add(mesh);
    this.buildingMeshes.set(cellId, mesh);

    console.log(`Added building ${building.name} to cell ${cellId}`);
    return mesh;
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

  private showFloatingChange(
    x: number,
    y: number,
    value: number,
    color: string = "#00ff00"
  ) {
    const distFromCenter = Math.min(375, Math.max(-385, Math.floor(x - 645)));
    if (distFromCenter !== 375 && distFromCenter !== -385) {
      this.gameState.getCometSpin().update((spin) => {
        return Math.min(10, Math.max(-10, spin + distFromCenter / 370));
      });
      this.gameState.changeMaterial(MATERIALS.StarDust, 100);

      const formattedValue = value >= 0 ? `+${value}` : value.toString();
      const text = this.add.text(x, y, formattedValue, {
        fontSize: "32px",
        color: distFromCenter > 0 ? color : "#ff0000",
        fontStyle: "bold",
      });
      text.setOrigin(0.5);

      this.tweens.add({
        targets: text,
        y: y - 120,
        alpha: { from: 1, to: 0 },
        duration: 3000,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });
    }
  }

  pointer = DebugPanel.debug(this, "pointer", new THREE.Vector2(), {
    view: { type: "point2d", min: 0, max: 5, step: 0.001 },
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

  hoveredObject: THREE.Mesh | null = null;

  pointerDownFrames = 0;
  pointerJustDown = false;

  update(time: number, delta: number) {
    const pointer = this.input.activePointer;
    if (pointer.isDown) {
      this.pointerDownFrames++;
    } else {
      this.pointerDownFrames = 0;
    }

    if (this.pointerDownFrames === 1) {
      this.pointerJustDown = true;
    } else {
      this.pointerJustDown = false;
    }

    if (this.board && this.pointerJustDown) {
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
      const intersects = raycaster.intersectObjects(this.interactiveMeshes);

      if (intersects.length > 0) {
        const intersection = intersects[0];

        this.hoveredObject = intersection.object as THREE.Mesh;
        /*
        // Debugging
        if (this.hoveredObject) {
          const material = this.hoveredObject
            .material as THREE.MeshStandardMaterial;
          material.emissive.setHex(0);
        }
        const material = this.hoveredObject
          .material as THREE.MeshStandardMaterial;
        material.emissive.setHex(0x555555);*/

        if (this.hoveredObject.userData.id === "terrain") {
          const { grid, cellId } = this.hoveredObject.userData;
          this.pointer.set(grid.x, grid.y);

          const selectedBuilding = this.gameState.state
            .get()
            ?.mouse_selected_building.get()?.building;

          if (!this.gameState.getBuildingAtCell(cellId) && selectedBuilding) {
            this.gameState.addBuildingToCell(
              cellId,
              getBuildingById(selectedBuilding.id)
            );
          }
        } else if (this.hoveredObject.userData.id === "comet") {
          this.showFloatingChange(pointer.x, pointer.y, 100);
        }
      }
    }

    if (this.comet) {
      // Calculate current position relative to pivot
      const position = this.comet.position.clone();

      // Rotate position around Z axis
      const rotationSpeed = this.gameState.getCometSpin().get() * 0.001;
      position.applyAxisAngle(this.zAxis, rotationSpeed);

      // Add pivot back to get new world position
      this.comet.position.copy(position);

      // Keep comet oriented correctly during orbit
      this.comet.rotateZ(rotationSpeed);

      this.gameState.getCometAngle().set(this.comet.rotation.z);
    }
  }

  shutdown() {}
}
