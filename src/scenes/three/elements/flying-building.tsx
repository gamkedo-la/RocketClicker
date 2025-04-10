import * as THREE from "three";
import { ThreeCometScene } from "../three-comet-scene";
import { Building } from "@game/entities/buildings/types";
import { signal } from "@game/core/signals/signals";
import { MAX_COMET_SPIN } from "@game/state/consts";
import { MotionMachine } from "../../../core/motion-machine/motion-machine";

export const addFlyingBuilding = (
  scene: ThreeCometScene,
  building: Building,
  cellId: number
) => {
  const buildingMesh = scene.buildingsModelsCache.get(building.id)?.clone();

  if (buildingMesh) {
    // Start position
    const position = scene.getCellPosition(cellId);
    buildingMesh.position.copy(position);

    // Get the direction vector from center to building position
    const direction = new THREE.Vector3()
      .copy(buildingMesh.position)
      .normalize();

    // Create signals for position and rotation
    const posX = signal(buildingMesh.position.x);
    const posY = signal(buildingMesh.position.y);
    const posZ = signal(buildingMesh.position.z);
    const rotX = signal(0);
    const rotY = signal(0);
    const rotZ = signal(0);
    const scale = signal(buildingMesh.scale.x);

    // Subscribe to position changes
    posX.subscribe((x) => (buildingMesh.position.x = x));
    posY.subscribe((y) => (buildingMesh.position.y = y));
    posZ.subscribe((z) => (buildingMesh.position.z = z));
    rotX.subscribe((x) => (buildingMesh.rotation.x = x));
    rotY.subscribe((y) => (buildingMesh.rotation.y = y));
    rotZ.subscribe((z) => (buildingMesh.rotation.z = z));
    scale.subscribe((s) => buildingMesh.scale.setScalar(s));

    // Calculate initial velocity based on comet spin
    const spinVelocity = Math.abs(scene.gameState.getCometSpin().get());
    const initialVelocity = (spinVelocity / MAX_COMET_SPIN) * 3;

    // Add to scene
    scene.comet.add(buildingMesh);

    // Create motion machine for the flying animation
    const mm: MotionMachine<"flying", "done"> = (
      <motionMachine initialState="flying">
        <state id="flying">
          <animation>
            <parallel>
              <tween
                signal={posX}
                to={position.x + direction.x * initialVelocity}
                duration={10000}
              />
              <tween
                signal={posY}
                to={position.y + 2 * initialVelocity}
                duration={10000}
              />
              <tween
                signal={posZ}
                to={position.z + direction.z * 0.5}
                duration={10000}
              />

              {/* Add some rotation for effect */}
              <tween
                signal={rotX}
                to={Math.PI * 4 * (Math.random() - 0.5)}
                duration={10000}
              />
              <tween
                signal={rotY}
                to={Math.PI * 10 * (Math.random() - 0.5)}
                duration={10000}
              />
              <tween
                signal={rotZ}
                to={Math.PI * 40 * (Math.random() - 0.5)}
                duration={10000}
              />
            </parallel>
            {/* Fade out by scaling down */}
            <tween signal={scale} to={0} duration={1000} />
            <step
              run={() => {
                scene.comet.remove(buildingMesh);
                buildingMesh.traverse((node) => {
                  if (node instanceof THREE.Mesh) {
                    if (Array.isArray(node.material)) {
                      node.material.forEach((m) => m.dispose());
                    } else if (node.material) {
                      node.material.dispose();
                    }
                    node.geometry.dispose();
                  }
                });
              }}
            />
          </animation>
        </state>
      </motionMachine>
    );

    // Play a sound effect if available
    if (building.sounds?.destroy) {
      scene.gameScene.soundSystem?.play(building.sounds.destroy);
    }
  }
};
