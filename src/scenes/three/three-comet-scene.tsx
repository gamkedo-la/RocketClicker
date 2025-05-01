import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { RESOURCES } from "@game/assets";
import PhaserGamebus from "@game/lib/gamebus";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

import { STRING_COLORS_NAMES, TWELVE_HOURS_IN_SECONDS } from "@game/consts";
import { assert } from "@game/core/common/assert";
import { effect, signal } from "@game/core/signals/signals";
import type { Signal } from "@game/core/signals/types";
import { SoundManager } from "@game/core/sound/sound-manager";
import {
  BUILDINGS,
  getBuildingById,
  TILES_FORCES,
} from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { hasResources, MATERIALS } from "@game/entities/materials/index";
import { COMET_DUST_MOUSE_MINING, MAX_COMET_SPIN } from "@game/state/consts";
import { MotionMachine } from "../../core/motion-machine/motion-machine";
import { FlexRow } from "../../core/ui/FlexRow";
import type { BuildingAlert } from "../../systems/EffectsSystem";
import { GameScene } from "../game/game-scene";
import { BuildingPill } from "./components/building-pill";
import { Camera } from "./components/camera";
import { loader, ThreeScene } from "./components/scene";
import { addFlyingBuilding } from "./elements/flying-building";
import { createLights } from "./elements/lights";
import { buildingMaterial, starMaterial } from "./elements/materials";
import { createSky } from "./elements/sky";

export interface BuildingScreenPosition {
  baseX: number; // Unscaled base position
  baseY: number; // Unscaled base position
  x: number; // Current scaled position
  y: number; // Current scaled position
  visible: boolean;
}

export class ThreeCometScene extends AbstractScene {
  declare bus: Phaser.Events.EventEmitter;
  declare gamebus: PhaserGamebus;
  declare soundManager: SoundManager;

  gameScene: GameScene;

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

  groundMeshes: THREE.Mesh[];

  // Building meshes that are on the comet
  buildingMeshes: Map<number, THREE.Object3D> = new Map();

  // Cache of building models
  buildingsModelsCache: Map<string, THREE.Object3D> = new Map();

  // Camera and light signals
  cameraZoom = signal(11);
  cameraPositionY = signal(50);
  ambientLightIntensity = signal(1.5);
  spotLightIntensity = signal(0.25);
  directionalLightIntensity = signal(0.5);
  // Track both the ghost and the current selected building type
  ghostBuilding: THREE.Object3D | null = null;
  currentGhostBuildingId: string | null = null;

  buildingScreenPositions = new Map<number, Signal<BuildingScreenPosition>>();
  buildingAlerts = new Map<number, Signal<BuildingAlert | null>>();

  // Track active building alerts and their pills
  private activePills: Map<number, FlexRow> = new Map();

  async create() {
    this.bus = this.gamebus.getBus();

    this.gameScene = this.scene.get(SCENES.GAME) as GameScene;

    const camera = new Camera(
      this.game.scale.width * 0.6,
      this.game.scale.height
    );
    const scene = new ThreeScene(this, camera.camera);

    this.camera = camera;

    this.threeScene = scene.threeScene;
    this.threeCamera = camera.camera;

    this.groundMeshes = [];

    this.loadCometSystemModel();
    this.setupBoardListeners();

    const sky = createSky();
    this.threeScene.add(sky);

    const [ambientLight, directionalLight, spotLight] = createLights();
    this.threeScene.add(ambientLight, directionalLight, spotLight);

    const currentCometSpin = signal(0);

    // Subscribe to camera zoom changes
    this.cameraZoom.subscribe((value) => {
      this.camera.camera.zoom = value;
      this.camera.camera.updateProjectionMatrix();
    });

    // Subscribe to camera position changes
    this.cameraPositionY.subscribe((value) => {
      this.camera.camera.position.y = value;
      this.camera.camera.updateProjectionMatrix();
    });

    // Subscribe to light intensity changes
    this.ambientLightIntensity.subscribe((value) => {
      ambientLight.intensity = value;
    });

    this.spotLightIntensity.subscribe((value) => {
      spotLight.intensity = value;
    });

    this.directionalLightIntensity.subscribe((value) => {
      directionalLight.intensity = value;
    });

    // Create a motion machine to handle smooth transitions
    const mm: MotionMachine<"idle", "idle"> = (
      <motionMachine initialState="idle">
        <state id="idle">
          <animation on="active">
            <repeat times={TWELVE_HOURS_IN_SECONDS}>
              <parallel>
                <tween
                  signal={this.cameraZoom}
                  to={() =>
                    11 + 4 * Math.abs(currentCometSpin.get() / MAX_COMET_SPIN)
                  }
                  duration={1000}
                />
                <tween
                  signal={this.cameraPositionY}
                  to={() =>
                    50 - Math.abs(currentCometSpin.get() / MAX_COMET_SPIN) / 25
                  }
                  duration={1000}
                />
                <tween
                  signal={this.ambientLightIntensity}
                  to={() =>
                    1.5 + Math.abs(currentCometSpin.get() / MAX_COMET_SPIN) * 30
                  }
                  duration={1000}
                />
                <tween
                  signal={this.spotLightIntensity}
                  to={() =>
                    0.1 +
                    (1 - Math.abs(currentCometSpin.get() / MAX_COMET_SPIN)) *
                      3.75
                  }
                  duration={1000}
                />
                <tween
                  signal={this.directionalLightIntensity}
                  to={() =>
                    0.5 -
                    Math.abs(currentCometSpin.get() / MAX_COMET_SPIN) * 0.45
                  }
                  duration={1000}
                />
              </parallel>
            </repeat>
          </animation>
        </state>
      </motionMachine>
    );

    this.gameState.getCometSpin().subscribe((value) => {
      currentCometSpin.set(value);
    });

    // Subscribe to zoom changes
    this.cameraZoom.subscribe((zoom) => {
      this.buildingScreenPositions.forEach((screenPosSignal, cellId) => {
        const mesh = this.buildingMeshes.get(cellId);
        const existingPill = this.activePills.get(cellId);

        if (!mesh || !existingPill) return;

        this.updateBuildingProjection(mesh, screenPosSignal);
        existingPill.setPosition(
          screenPosSignal.get().baseX,
          screenPosSignal.get().baseY
        );
      });
    });
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
          this.groundMeshes.push(this.comet);
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
          // Rocket launcher is inactive
          active: !(x === 2 && y === 2),
          grid: { x, y },
          id: "terrain",
        };

        this.comet.add(terrainMesh);
        this.groundMeshes.push(terrainMesh);
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
        if (building) {
          this.addBuildingModelToCell(cellId, building);
        } else {
          this.removeBuildingModelFromCell(cellId);
        }
      });
    });
  }

  private loadRocketLauncherModel() {
    loader.parse(
      this.cache.binary.get(RESOURCES["rocket-temporary"]),
      "",
      (gltf) => {
        const mesh = gltf.scene;

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
        const rocketRotY2 = signal(20);
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

        rocketRotY2.subscribe((value) => {
          this.rocket.position.y = value;
        });

        towerRotX.subscribe((value) => {
          tower.setRotationFromAxisAngle(x, value);
        });

        const machine: MotionMachine<
          "idle" | "entering" | "launching",
          "send_rocket" | "intro_done"
        > = (
          <motionMachine initialState="entering">
            <state id="entering">
              <animation>
                <tween to={1} duration={2000} signal={rocketRotY2} />
                <step run={() => machine.transition("intro_done")} />
              </animation>
              <transition on="intro_done" target="idle" />
            </state>
            <state id="idle">
              <transition on="send_rocket" target="launching" />
            </state>
            <state id="launching">
              <animation>
                <parallel>
                  <tween
                    from={0}
                    to={0.4}
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
    const buildingTypes = BUILDINGS.map((b) => b.id);

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

    buildingTypes.forEach((type) => {
      // Check if we have a 3D model for this building type
      if (modelLoaders.has(type!)) {
        const modelResource = modelLoaders.get(type!)!;
        loader.parse(this.cache.binary.get(modelResource), "", (gltf) => {
          gltf.scene.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              
              // FIXME: clone mats so we don't lose them
              if (Array.isArray(node.material)) {
                node.material = node.material.map((mat) => { 
                  mat.clone();
                  console.log("building part ["+node.name+"] has multi material: ["+mat.name+"] color="+mat.color.toJSON());
                });
              } else {
                node.material = node.material.clone();
                // FIXME: these are all the same color and not tinted as seen when viewing the mesh in another app.
                // threejs loader bug? no material rgb and must use a texture perhaps?
                console.log("building part ["+node.name+"] has one mat named ["+node.material.name+"] with color="+node.material.color.toJSON());
              }

            }
          });

          // Scale and rotate the model as needed
          gltf.scene.scale.set(0.0033, 0.0033, 0.0033);
          //gltf.scene.position.set(0, -0.1, 0);
          gltf.scene.rotateY(Math.PI / 4);

          this.buildingsModelsCache.set(type!, gltf.scene);
        });
      } else {
        assert(false, `No model found for building type: ${type}`);
      }
    });
  }

  /**
   * Converts a cell ID to a position on the comet
   */
  getCellPosition(cellId: number): THREE.Vector3 {
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
  public addBuildingModelToCell(cellId: number, building: Building) {
    console.log("Adding building to cell", building);

    // play the proper sound effect
    this.soundManager.play(building.sounds.build);

    // Remove any existing building at this cell
    this.removeBuildingModelFromCell(cellId);

    // Get the building model
    let buildingMesh = this.buildingsModelsCache.get(building.id)!.clone();

    // Clone materials recursively for the building mesh
    // console.log("building traverse:");
    buildingMesh.traverse((node) => {
      // console.log("building node: "+node.name);
      if (node instanceof THREE.Mesh && node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map((mat) => mat.clone());
        } else {
          node.material = node.material.clone();
          // FIXME: these are all the same color and not as intended
          // console.log("building part has one material: "+node.material.name+" color="+node.material.color.toJSON());
        }
      }
    });

    if (building.id === "miner") {
      const posY = signal(0);
      const range = signal(0);

      (
        <motionMachine initialState="idle">
          <state id="idle">
            <animation>
              <repeat times={200 * 5 * 60 * 60 * 4}>
                <tween from={0} to={range} duration={100} signal={posY} />
                <tween from={range} to={0} duration={100} signal={posY} />
              </repeat>
            </animation>
          </state>
        </motionMachine>
      ) as MotionMachine<"idle", "idle">;

      building.current_success_rate.subscribe((value) => {
        range.set(0.5 * value);
      });

      posY.subscribe((value) => {
        buildingMesh.traverse((node) => {
          if (node.name === "mesh_0") {
            node.position.y = value / 8;
          }
          if (node.name === "mesh_0_1" || node.name === "mesh_0_2") {
            node.position.y = value;
          }
        });
      });
    }

    const mesh = buildingMesh as THREE.Mesh;

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
    const screenPosSignal = signal<BuildingScreenPosition>({
      baseX: 0,
      baseY: 0,
      x: 0,
      y: 0,
      visible: true,
    });

    this.buildingScreenPositions.set(cellId, screenPosSignal);
    this.updateBuildingProjection(mesh, screenPosSignal);

    // Subscribe to alert changes
    const gameScene = this.scene.get(SCENES.GAME) as GameScene;
    gameScene.effectsSystem.getAlert(cellId).subscribe((alert) => {
      this.updateBuildingPill(cellId, alert);
    });

    return mesh;
  }

  /**
   * Removes a building mesh from a specific cell
   */
  public removeBuildingModelFromCell(cellId: number) {
    if (this.buildingMeshes.has(cellId)) {
      const mesh = this.buildingMeshes.get(cellId)!;
      this.comet.remove(mesh);
      this.buildingMeshes.delete(cellId);
      console.log(`Removed building from cell ${cellId}`);
    }

    // Clean up pill
    const existingPill = this.activePills.get(cellId);
    if (existingPill) {
      existingPill.removeFromScene();
      this.activePills.delete(cellId);
    }
    this.buildingScreenPositions.delete(cellId);
  }

  private mineCometDust(x: number, y: number) {
    const distFromCenter = Math.min(375, Math.max(-385, Math.floor(x - 645)));
    const cometSpin = this.gameState.getCometSpin().get();
    const spinSignal = Math.sign(cometSpin);
    const forceSignal = Math.sign(distFromCenter);

    if (distFromCenter !== 375 && distFromCenter !== -385) {
      // If we are increasing the comet spin, we can only do until spin velocity is 25, with diminshed returns
      let effectiveness =
        forceSignal === spinSignal
          ? Math.abs(cometSpin) < 15
            ? 1
            : Math.max(0, 1 - (Math.abs(cometSpin) - 15) / 15)
          : 3;

      effectiveness = (effectiveness * Math.abs(distFromCenter)) / 370;

      const value = COMET_DUST_MOUSE_MINING * effectiveness;

      // Positive force gives blue colors
      const color =
        forceSignal === spinSignal
          ? STRING_COLORS_NAMES["vaporwave-blue"]
          : STRING_COLORS_NAMES["strawberry-field"];

      this.gameState.addCometSpin((effectiveness * distFromCenter) / 370);
      this.gameState.changeMaterial(MATERIALS.CometDust, value);

      const text = this.add.text(
        x + Math.random() * 5 - 10,
        y,
        `+${value.toFixed(0)}`,
        {
          fontSize: "32px",
          color,
          fontStyle: "bold",
        }
      );
      text.setOrigin(0.5);

      this.tweens.add({
        targets: text,
        y: y - 120,
        alpha: { from: 1, to: 0 },
        duration: 3000,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });

      this.gameState.state.get()?.mouse_selected_building.set({
        building: null,
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

  hoveredObject: THREE.Object3D | undefined = undefined;

  pointerDownFrames = 0;
  pointerJustDown = false;

  private updateGhostBuilding(
    cellId: number | null,
    selectedBuilding: Building | null
  ) {
    // Early exit if nothing changed
    if (!selectedBuilding && !this.ghostBuilding) return;
    if (cellId === 12) return; // Rocket launcher cell

    // Remove ghost if no valid placement
    if (!cellId || !selectedBuilding || this.buildingMeshes.has(cellId)) {
      if (this.ghostBuilding) {
        this.comet.remove(this.ghostBuilding);
        this.ghostBuilding = null;
        this.currentGhostBuildingId = null;
      }
      return;
    }

    const canBuild = hasResources(
      selectedBuilding,
      this.gameState.state.get()?.material_storage ?? {}
    );

    const tooFastToBuild = !this.gameState.state.get().can_place_building.get();

    // Create new ghost if building type changed
    if (this.currentGhostBuildingId !== selectedBuilding.id) {
      // Remove old ghost
      if (this.ghostBuilding) {
        this.comet.remove(this.ghostBuilding);
        this.ghostBuilding = null;
      }

      // Create new ghost
      const buildingMesh = this.buildingsModelsCache
        .get(selectedBuilding.id)
        ?.clone();

      if (buildingMesh) {
        buildingMesh.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material = node.material.map((mat) => {
                const ghostMat = mat.clone();
                ghostMat.transparent = true;
                ghostMat.opacity = 0.3;
                ghostMat.depthWrite = true;
                return ghostMat;
              });
            } else if (node.material) {
              const ghostMat = node.material.clone();
              ghostMat.transparent = true;
              ghostMat.opacity = 0.3;
              ghostMat.depthWrite = true;
              node.material = ghostMat;
            }
          }
        });

        this.comet.add(buildingMesh);
        this.ghostBuilding = buildingMesh;
        this.currentGhostBuildingId = selectedBuilding.id;
      }
    }

    // Update ghost position and appearance
    if (this.ghostBuilding) {
      // Update position
      const position = this.getCellPosition(cellId);
      this.ghostBuilding.position.copy(position);
      this.ghostBuilding.position.y -= 0.008;

      // Update materials color based on state
      const color = !canBuild
        ? 0xff0000
        : tooFastToBuild
        ? 0xffff00
        : undefined;

      if (color !== undefined) {
        this.ghostBuilding.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (Array.isArray(node.material)) {
              node.material.forEach((mat) => {
                if (
                  mat instanceof THREE.MeshStandardMaterial ||
                  mat instanceof THREE.MeshPhongMaterial
                ) {
                  mat.color.setHex(color);
                }
              });
            } else if (
              node.material instanceof THREE.MeshStandardMaterial ||
              node.material instanceof THREE.MeshPhongMaterial
            ) {
              node.material.color.setHex(color);
            }
          }
        });
      }
    }
  }

  private updateBuildingProjection(
    mesh: THREE.Object3D,
    screenPosSignal: Signal<BuildingScreenPosition>
  ) {
    const pos = new THREE.Vector3();
    mesh.getWorldPosition(pos);

    pos.project(this.threeCamera);

    // Calculate viewport coordinates
    const viewportWidth = this.game.scale.width * 0.6;
    const viewportHeight = this.game.scale.height;

    // Store unscaled base position
    const baseX = (pos.x + 1) * viewportWidth * 0.5 + 250;
    const baseY = (-pos.y + 1) * viewportHeight * 0.5;

    // Calculate current scaled position
    const zoom = this.cameraZoom.get();

    screenPosSignal.set({
      baseX,
      baseY,
      x: baseX / zoom,
      y: baseY / zoom,
      visible: pos.z < 1,
    });
  }

  private updateBuildingPill(cellId: number, alert: BuildingAlert | null) {
    const existingPill = this.activePills.get(cellId);

    if (existingPill) {
      existingPill.removeFromScene();
      this.activePills.delete(cellId);
    }

    if (alert) {
      const pill: FlexRow = <BuildingPill alert={alert} />;
      pill.addToScene(this);
      pill.setDepth(200);
      pill.setOrigin(0.5, 0.5);
      this.activePills.set(cellId, pill);
    }
  }

  update(_time: number, _delta: number) {
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

    if (this.board) {
      // First normalize within the viewport
      const viewportWidth = this.game.scale.width * 0.6;
      const viewportX = pointer.x - 250; // Adjust for viewport offset

      // Convert to NDC (-1 to 1) within the viewport
      const x = (viewportX * 2) / viewportWidth - 1;
      const y = -((pointer.y * 2) / this.game.scale.height) + 1;

      // Setup raycaster
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), this.threeCamera);

      const groundIntersects = raycaster.intersectObjects(this.groundMeshes);

      if (groundIntersects.length > 0) {
        this.hoveredObject?.children[0].children.forEach((child) => {
          // @ts-ignore
          (child as THREE.Mesh).material?.emissive.setHex(0);
        });

        const hoverObject = groundIntersects.find((i) => {
          if (i.object.userData.id) {
            return true;
          }
          return false;
        })?.object as THREE.Mesh;

        if (hoverObject?.userData.id === "terrain") {
          const { grid, cellId } = hoverObject.userData;
          this.pointer.set(grid.x, grid.y);
          this.gameState.setHoveredBuilding(
            this.gameState.getBuildingAt(grid.x, grid.y)
          );

          // Update ghost building
          const selectedBuilding = this.gameState.state
            .get()
            ?.mouse_selected_building.get()?.building;
          this.updateGhostBuilding(cellId, selectedBuilding);

          const building = this.buildingMeshes.get(cellId);
          this.hoveredObject = building;
          if (building) {
            building.children[0].children.forEach((child) => {
              // @ts-ignore
              (child as THREE.Mesh).material.emissive.setHex(
                this.gameState.state.get()?.mouse_selected_bulldoze.get()
                  ? 0x990000
                  : 0x555555
              );
            });
          }
        } else {
          // Remove ghost building when not hovering over terrain
          this.updateGhostBuilding(null, null);
        }

        if (this.pointerJustDown) {
          if (hoverObject?.userData.id === "comet") {
            this.mineCometDust(pointer.x, pointer.y);
          }

          if (
            hoverObject?.userData.id === "terrain" &&
            hoverObject.userData.active
          ) {
            const { cellId } = hoverObject.userData;

            const selectedBulldoze = this.gameState.state
              .get()
              .mouse_selected_bulldoze.get();

            if (selectedBulldoze && this.gameState.getBuildingAtCell(cellId)) {
              this.gameState.addCometSpin((TILES_FORCES[cellId] ?? 0) * 3);

              addFlyingBuilding(
                this,
                this.gameState.getBuildingAtCell(cellId)!,
                cellId
              );
              this.gameState.removeBuildingFromCell(cellId);
              this.gameState.toggleMouseSelectedBulldoze();
            } else {
              const selectedBuilding = this.gameState.state
                .get()
                ?.mouse_selected_building.get()?.building;

              if (
                !this.gameState.getBuildingAtCell(cellId) &&
                selectedBuilding &&
                hasResources(
                  selectedBuilding,
                  this.gameState.state.get()?.material_storage ?? {}
                )
              ) {
                if (this.gameState.state.get().can_place_building.get()) {
                  this.gameState.addCometSpin((TILES_FORCES[cellId] ?? 0) * 3);

                  this.gameState.addBuildingToCell(
                    cellId,
                    getBuildingById(selectedBuilding.id)
                  );
                } else {
                  this.gameState.consumeBuildingConstruction(selectedBuilding);
                  addFlyingBuilding(this, selectedBuilding, cellId);
                }
              }
            }
          }
        }
      } else {
        // Remove ghost building when not hovering over anything
        this.updateGhostBuilding(null, null);
      }
    }

    if (this.comet) {
      // Calculate current position relative to pivot
      const position = this.comet.position.clone();

      // Rotate position around Z axis
      const rotationSpeed = this.gameState.getCometSpin().get() * 0.0005;
      position.applyAxisAngle(this.zAxis, rotationSpeed);

      // Add pivot back to get new world position
      this.comet.position.copy(position);

      // Keep comet oriented correctly during orbit
      this.comet.rotateZ(rotationSpeed);

      this.gameState.setCometAngle(this.comet.rotation.z);
    }
  }

  shutdown() {}
}
