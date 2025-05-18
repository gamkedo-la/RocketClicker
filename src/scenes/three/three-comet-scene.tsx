import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";

import { RESOURCES } from "@game/assets";
import { DebugPanel } from "@game/scenes/debug/debug-panel";

import { AbstractScene } from "..";
import { SCENES } from "../scenes";

import { COLORS_NAMES, STRING_COLORS_NAMES } from "@game/consts";
import { assert } from "@game/core/common/assert";
import { MotionMachine } from "@game/core/motion-machine/motion-machine";
import { signal } from "@game/core/signals/signals";
import type { Signal } from "@game/core/signals/types";
import { FlexRow } from "@game/core/ui/FlexRow";
import {
  BUILDINGS,
  getBuildingById,
  TILES_FORCES,
} from "@game/entities/buildings/index";
import { Building } from "@game/entities/buildings/types";
import { hasResources, MATERIALS } from "@game/entities/materials/index";
import { COMET_DUST_MOUSE_MINING, MAX_COMET_SPIN } from "@game/state/consts";

import { GameScene } from "../game/game-scene";

import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { BuildingPill } from "./components/building-pill";
import { Camera } from "./components/camera";
import { loader, ThreeScene } from "./components/scene";
import { addFlyingBuilding } from "./elements/flying-building";
import { createLights } from "./elements/lights";
import { buildingMaterial, starMaterial } from "./elements/materials";
import { Particles } from "./elements/particles";
import { createSky } from "./elements/sky";
import { SmokeParticles } from "./elements/smoke-particles";

export interface BuildingScreenPosition {
  baseX: number; // Unscaled base position
  baseY: number; // Unscaled base position
  x: number; // Current scaled position
  y: number; // Current scaled position
  visible: boolean;
}

export class ThreeCometScene extends AbstractScene {
  gameScene: GameScene;

  camera: Camera;
  orbitControls: OrbitControls;

  constructor() {
    super(SCENES.THREE_COMET);
  }

  threeScene: THREE.Scene;
  threeCamera: THREE.OrthographicCamera;

  threeCameraX = 0;
  threeCameraY = 0;

  comet: THREE.Mesh;
  rocket: THREE.Mesh;

  board: THREE.Mesh;
  board_pointer: THREE.Mesh;

  board_bounds: THREE.Box3;
  board_size: THREE.Vector3;

  groundMeshes: THREE.Mesh[];

  particles: Particles;
  smokeEffect: SmokeParticles;

  cometDustEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

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
  buildingPills: Map<number, ReturnType<typeof BuildingPill>> = new Map();

  create() {
    this.gameScene = this.scene.get(SCENES.GAME) as GameScene;

    const camera = new Camera(
      this.game.scale.width * 0.6,
      this.game.scale.height
    );
    const scene = new ThreeScene(this, camera.camera);

    this.camera = camera;

    this.threeScene = scene.threeScene;
    this.threeCamera = camera.camera;

    this.threeCameraX = this.threeCamera.position.x;
    this.threeCameraY = this.threeCamera.position.y;

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
      this.threeCameraY = this.threeCamera.position.y;
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
          <animation on="active" loop>
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
                  (1 - Math.abs(currentCometSpin.get() / MAX_COMET_SPIN)) * 3.75
                }
                duration={1000}
              />
              <tween
                signal={this.directionalLightIntensity}
                to={() =>
                  0.5 - Math.abs(currentCometSpin.get() / MAX_COMET_SPIN) * 0.45
                }
                duration={1000}
              />
            </parallel>
          </animation>
        </state>
      </motionMachine>
    );

    this.gameState.getCometSpin().subscribe((value) => {
      currentCometSpin.set(value);
    });

    // Subscribe to zoom changes
    this.cameraZoom.subscribe((_zoom) => {
      this.buildingScreenPositions.forEach((screenPosSignal, cellId) => {
        const mesh = this.buildingMeshes.get(cellId);
        const alertSignal = this.gameScene.effectsSystem.getAlert(cellId);
        const pill = this.buildingPills.get(cellId);

        if (!mesh || !pill || alertSignal.type.get() === "inactive") return;

        this.updateBuildingProjection(mesh, screenPosSignal);
        pill.setPosition(
          Math.round(screenPosSignal.get().baseX),
          Math.round(screenPosSignal.get().baseY)
        );
      });
    });

    this.cometDustEmitter = this.add.particles(0, 0, "comet_dust_particle", {
      lifespan: 400,
      speed: { min: 50, max: 100 },
      gravityY: 300,
      emitting: false,
    });

    this.particles = new Particles(this);
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

          if (this.comet.material instanceof THREE.MeshStandardMaterial) {
            this.comet.material.color.set(COLORS_NAMES["vaporwave-blue"]);
            this.comet.material.emissive.set(COLORS_NAMES["elite-teal"]);
            this.comet.material.emissiveIntensity = 0.2;
          }

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

      this.particles.addToScene(this.comet);

      this.gameState.setLoadingState({
        three_comet: true,
      });
    });
  }

  private createBoardGrid() {
    const board = this.gameState.state.get()?.board;

    for (let x = 0; x < board.boardWidth; x++) {
      for (let y = 0; y < board.boardHeight; y++) {
        const cellId = y * board.boardWidth + x;

        const { type, message, blinking } =
          this.gameScene.effectsSystem.getAlert(cellId);
        const pill: FlexRow = (
          <BuildingPill type={type} text={message} blinking={blinking} />
        );
        pill.addToScene(this);
        this.buildingPills.set(cellId, pill);

        const terrainMesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.0005, 0.035),
          buildingMaterial.clone()
        );

        terrainMesh.material.color.set(COLORS_NAMES["meteorite"]);

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
      buildingSignal.subscribe((building) => {
        if (building) {
          this.addBuildingModelToCell(cellId, building);
        } else {
          this.removeBuildingModelFromCell(cellId);
        }
      });
    });
  }

  dashedLineMaterial: LineMaterial[];

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
            }
          }

          // Scale and rotate the model as needed
          gltf.scene.scale.set(0.0033, 0.0028, 0.0033);
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

        // make empty object for the lines
        const lines = new THREE.Object3D();
        mesh.add(lines);

        this.dashedLineMaterial = [];

        const colors = [
          COLORS_NAMES["vaporwave-blue"],
          COLORS_NAMES["vicious-violet"],
          COLORS_NAMES["white"],
          COLORS_NAMES["fever-dream"],
          COLORS_NAMES["chutney"],
        ];

        for (let i = 0; i < 10; i++) {
          const lineMaterial = new LineMaterial({
            //color: 0xffaa00,
            color: colors[Math.floor(Math.random() * colors.length)],
            dashed: true,
            dashSize: Math.random() * 10,
            gapSize: Math.random() * 1 + 7.5,
            linewidth: 20,
          });
          this.dashedLineMaterial.push(lineMaterial);
        }
        for (let i = 0; i < 100; i++) {
          const lineGeometry = new LineGeometry();
          const points = [];
          const point = new THREE.Vector3(
            mesh.position.x + Math.random() * 4 - 2,
            mesh.position.y,
            mesh.position.z - 1
          );
          const direction = new THREE.Vector3();

          for (let i = 0; i < 30; i++) {
            direction.x = 0.1 * i * (Math.random() - 0.5);
            direction.y = -1;
            direction.z = 0.1 * i * (Math.random() - 0.5);
            //direction.normalize().multiplyScalar(10);

            point.add(direction);
            points.push(point.x, point.y, point.z);
          }

          lineGeometry.setPositions(points);

          // add a line to the rocket
          const line = new Line2(
            lineGeometry,
            this.dashedLineMaterial[
              Math.floor(Math.random() * this.dashedLineMaterial.length)
            ]
          );
          line.computeLineDistances();

          lines.add(line);
        }

        const smokeEmitterObject = new THREE.Object3D();
        this.comet.add(smokeEmitterObject);
        smokeEmitterObject.position.set(0.045, 0.04, -0.05); // Example position relative to comet
        this.smokeEffect = new SmokeParticles(this, smokeEmitterObject);

        // Add to the scene and track it
        this.comet.add(mesh);
        this.rocket = mesh.children[0].children[1] as THREE.Mesh;

        const tower = mesh.children[0].children[0] as THREE.Mesh;

        const rocketRotY = signal(0);
        const rocketRotY2 = signal(100);
        const rocketPosY = signal(0);

        const towerRotX = signal(0);

        const y = new THREE.Vector3(0, 1, 0);
        const x = new THREE.Vector3(1, 0, 0);

        rocketRotY.subscribe((value) => {
          this.rocket.setRotationFromAxisAngle(y, value);
        });

        rocketPosY.subscribe((value) => {
          this.rocket.position.y += value;
          lines.position.y += value;
        });

        rocketRotY2.subscribe((value) => {
          this.rocket.position.y = value;
          lines.position.y = value;
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
                <tween
                  to={3}
                  duration={7000}
                  signal={rocketRotY2}
                  ease="Circ.easeOut"
                />
                <parallel>
                  <tween
                    to={1}
                    duration={1000}
                    signal={rocketRotY2}
                    ease="Bounce.easeOut"
                  />
                  <step
                    run={() => {
                      this.smokeEffect.emitBurst(
                        new THREE.Vector3(0, 0, 0),
                        1000,
                        0.09,
                        1.0
                      );
                      machine.transition("intro_done");
                    }}
                  />
                </parallel>
              </animation>
              <transition on="intro_done" target="idle" />
            </state>
            <state id="idle">
              <transition on="send_rocket" target="launching" />
            </state>
            <state id="launching">
              <animation>
                <step
                  run={() => {
                    this.smokeEffect.emitBurst(
                      new THREE.Vector3(0, 0, 0),
                      1000,
                      0.09,
                      1.0
                    );
                  }}
                />
                <parallel>
                  <tween
                    from={0}
                    to={0.4}
                    duration={10000}
                    signal={rocketPosY}
                    ease="Quad.easeIn"
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

              /*
              // FIXME: clone mats so we don't lose them? result - no effect
              // but this shows that all materials are missing color data
              // although they look fine when viewed in other 3d apps
              // bug in threejs loader? possible solution: use textures only
              // alternately, load the .obj and .mat files, not .glb files?
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
            */
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

          // TEST: let's make a new random material in three
          // this will confirm whether or not the importer/mesh is broken
          // RESULT: meshes are colored! therefore my .glb files are wonky
          node.material = new THREE.MeshStandardMaterial();
          node.material.color.setHex(
            COLORS_NAMES[
              Object.keys(COLORS_NAMES)[
                Math.floor(Math.random() * Object.keys(COLORS_NAMES).length)
              ] as keyof typeof COLORS_NAMES
            ]
          );
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

    this.smokeEffect.emitBurst(
      new THREE.Vector3(
        position.x - 0.048,
        position.y - 0.05,
        position.z + 0.05
      ),
      50,
      0.02,
      1.0,
      0.3
    );

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

    this.buildingPills
      .get(cellId)
      ?.setPosition(screenPosSignal.get().baseX, screenPosSignal.get().baseY);

    /*let alert = this.gameScene.effectsSystem.getAlert(cellId);
    alert.type.set("error");
    alert.message.set("HeEeello");
    alert.blinking.set(true);*/

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
    this.gameScene.effectsSystem.getAlert(cellId).type.set("inactive");
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

      const text = this.add.existing(
        <text
          x={x + Math.random() * 5 - 5}
          y={y - 30}
          text={`+${value.toFixed(0)}`}
          style={{
            fontSize: "32px",
            color,
            //fontStyle: "bold",
          }}
          origin={[0.5, 0.5]}
        />
      );

      this.tweens.add({
        targets: text,
        y: y - 135,
        alpha: { from: 1, to: 0 },
        duration: 3000,
        ease: "Cubic.easeOut",
        onComplete: () => text.destroy(),
      });

      this.cometDustEmitter.emitParticle(Math.min(20, value / 2), x, y);
      this.soundManager.play(RESOURCES["sfx-pick-up"], {
        detune: Math.random() * 200 - 100,
        volume: 0.5 + (0.5 * value) / 100,
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
    if (
      cellId === null ||
      !selectedBuilding ||
      this.buildingMeshes.has(cellId)
    ) {
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

  update(time: number, delta: number) {
    if (this.dashedLineMaterial) {
      //this.dashedLineMaterial.dashSize = 0.1 + Math.sin(time * 0.001) * 0.1;
      //this.dashedLineMaterial.gapSize = 1 + Math.sin(time * 0.001) * 0.5;
      //this.dashedLineMaterial.linewidth = 0.01 + Math.sin(time * 0.001) * 0.01;
      this.dashedLineMaterial.forEach((mat, index) => {
        mat.dashOffset = -time * 0.09 - index * 0.3;
      });
    }

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

      this.input.setDefaultCursor("pointer");

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

        const distFromCenter = Math.min(
          375,
          Math.max(-385, Math.floor(pointer.x - 645))
        );

        if (
          hoverObject?.userData.id === "comet" &&
          distFromCenter < 375 &&
          distFromCenter > -385
        ) {
          this.input.setDefaultCursor(
            `url(assets/${RESOURCES["mining-cursor"]}.png) 16 16, move`
          );
        }

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
      const cometSpin = this.gameState.getCometSpin().get();
      const cometAbsSpin =
        Math.max(0, Math.abs(cometSpin) - 50) / MAX_COMET_SPIN;

      // camera shake
      const shake =
        (Math.cos(time * 0.033) + Math.sin(time * 0.017)) *
        0.0005 *
        cometAbsSpin;
      this.threeCamera.position.x = this.threeCameraX + shake;
      this.threeCamera.position.y = this.threeCameraY + shake;
      // Rotate position around Z axis
      const rotationSpeed = cometSpin * 0.0005;
      position.applyAxisAngle(this.zAxis, rotationSpeed);

      // Add pivot back to get new world position
      this.comet.position.copy(position);

      // Keep comet oriented correctly during orbit
      this.comet.rotateZ(rotationSpeed);

      this.gameState.setCometAngle(this.comet.rotation.z);

      this.particles.update(time, delta);
      this.smokeEffect.update(time, delta);
    }
  }

  shutdown() {}
}
