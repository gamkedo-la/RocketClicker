import { COLORS_NAMES } from "@game/consts";
import * as THREE from "three";
import { ThreeCometScene } from "../three-comet-scene";

const NUM_SMOKE_PARTICLES = 2000;
const SMOKE_PARTICLE_LIFETIME_MS = 500; // 3 seconds
const SMOKE_PARTICLE_BASE_SPEED = 0.01; // Units per second
const SMOKE_PARTICLE_BASE_SIZE = 0.01; // Base radius of spheres
const SMOKE_EMISSION_RADIUS = 0.09; // Radius around which particles are emitted locally

export class SmokeParticles {
  private scene: ThreeCometScene;
  private smokeContainer: THREE.Object3D;
  private instancedSmoke: THREE.InstancedMesh;
  private particleData: Array<{
    matrix: THREE.Matrix4;
    velocity: THREE.Vector3;
    life: number; // Remaining lifetime in ms
    initialScale: number; // Base scale factor for this particle
    maxLife: number; // Max lifetime for this particle
    active: boolean; // Whether the particle is currently active
  }> = [];

  constructor(scene: ThreeCometScene, emissionParentObject?: THREE.Object3D) {
    this.scene = scene;
    this.smokeContainer = new THREE.Object3D();

    const smokeGeometry = new THREE.SphereGeometry(
      0.03, // Base radius of 1, actual size controlled by matrix scale
      2, // Fewer segments for performance
      1
    );

    const smokeMaterial = new THREE.MeshStandardMaterial({
      color: COLORS_NAMES["vaporwave-blue"], // Dark gray
      transparent: true,
      opacity: 1, // Overall material opacity
      //depthWrite: false, // Important for transparency
      premultipliedAlpha: true, // Consider if blending issues occur
    });

    this.instancedSmoke = new THREE.InstancedMesh(
      smokeGeometry,
      smokeMaterial,
      NUM_SMOKE_PARTICLES
    );
    this.instancedSmoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const parentObject = emissionParentObject || this.scene.comet; // Default to comet if no parent specified
    const localEmissionOrigin = new THREE.Vector3(0, 0, 0); // Emission point is origin of parentObject

    for (let i = 0; i < NUM_SMOKE_PARTICLES; i++) {
      const matrix = new THREE.Matrix4();
      const velocity = new THREE.Vector3();
      const initialScaleMultiplier = Math.random() * 5 - 2; // Randomize base size a bit (0.5x to 1.5x of SMOKE_PARTICLE_BASE_SIZE)
      const maxLife = SMOKE_PARTICLE_LIFETIME_MS * (0.7 + Math.random() * 6); // Vary max life (70% to 130%)

      // Initialize all particles as inactive with zero life
      const particleEntry = {
        matrix,
        velocity,
        life: 0,
        initialScale: SMOKE_PARTICLE_BASE_SIZE * initialScaleMultiplier,
        maxLife,
        active: false,
      };
      this.particleData.push(particleEntry);

      // Set initial matrix with zero scale (invisible)
      matrix.compose(
        new THREE.Vector3(0, 0, 0),
        new THREE.Quaternion(),
        new THREE.Vector3(0, 0, 0)
      );
      this.instancedSmoke.setMatrixAt(i, matrix);
    }

    this.smokeContainer.add(this.instancedSmoke);
    parentObject.add(this.smokeContainer);

    // Initial update to apply all matrices
    this.instancedSmoke.instanceMatrix.needsUpdate = true;
  }

  /**
   * Emit a burst of smoke particles at the specified position
   * @param origin Origin point for the burst (local to the smoke container)
   * @param count Number of particles to emit (limited by pool size)
   * @param spreadRadius Radius around origin to spread particles
   * @param speedMultiplier Multiplier for particle velocity
   */
  public emitBurst(
    origin: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    count: number = 50,
    spreadRadius: number = SMOKE_EMISSION_RADIUS,
    speedMultiplier: number = 1.0,
    lifeMultiplier: number = 1.0
  ) {
    let emittedCount = 0;

    // Find inactive particles to use for this burst
    for (let i = 0; i < NUM_SMOKE_PARTICLES && emittedCount < count; i++) {
      const data = this.particleData[i];
      if (!data.active) {
        // Reset and activate this particle
        this.activateParticle(
          i,
          origin,
          spreadRadius,
          speedMultiplier,
          lifeMultiplier
        );
        emittedCount++;
      }
    }

    // Ensure matrix update
    this.instancedSmoke.instanceMatrix.needsUpdate = true;

    return emittedCount; // Return how many particles were actually emitted
  }

  private activateParticle(
    index: number,
    origin: THREE.Vector3,
    spreadRadius: number,
    speedMultiplier: number,
    lifeMultiplier: number
  ) {
    const data = this.particleData[index];

    // Set particle as active
    data.active = true;
    data.life = data.maxLife * lifeMultiplier;

    // Position in a circle around the origin, with higher concentration near center
    const angle = Math.random() * Math.PI * 2;
    // Square the random value to bias towards smaller radii
    const radius = Math.pow(Math.random(), 1.5) * spreadRadius;
    const position = new THREE.Vector3(
      origin.x + Math.cos(angle) * radius,
      origin.y + 0.01,
      origin.z + Math.sin(angle) * radius
    );

    // Set velocity (generally upwards and outwards with some randomness)
    data.velocity.set(
      (Math.random() - 0.5) * SMOKE_PARTICLE_BASE_SPEED * 0.8 * speedMultiplier,
      SMOKE_PARTICLE_BASE_SPEED * (0.7 + Math.random() * 0.6) * speedMultiplier, // Mostly upwards
      (Math.random() - 0.5) * SMOKE_PARTICLE_BASE_SPEED * 0.8 * speedMultiplier
    );

    // Initial scale for a newly activated particle (starts small)
    const scale = data.initialScale * 0.1;
    data.matrix.compose(
      position,
      new THREE.Quaternion(),
      new THREE.Vector3(scale, scale, scale)
    );

    this.instancedSmoke.setMatrixAt(index, data.matrix);
  }

  private resetParticle(
    index: number,
    isExpired: boolean,
    emissionOrigin: THREE.Vector3
  ) {
    const data = this.particleData[index];

    // Reset position in a circle around the emissionOrigin, with higher concentration near center
    const angle = Math.random() * Math.PI * 2;
    // Square the random value to bias towards smaller radii
    const radius = Math.pow(Math.random(), 1.5) * SMOKE_EMISSION_RADIUS;
    const position = new THREE.Vector3(
      emissionOrigin.x,
      emissionOrigin.y - 0.06,
      emissionOrigin.z + Math.sin(angle) * radius
    );

    // Reset velocity (generally upwards and outwards with some randomness)
    data.velocity.set(
      (Math.random() - 0.5) * SMOKE_PARTICLE_BASE_SPEED * 0.8,
      SMOKE_PARTICLE_BASE_SPEED * (0.7 + Math.random() * 0.6), // Mostly upwards
      (Math.random() - 0.5) * SMOKE_PARTICLE_BASE_SPEED * 0.8
    );

    if (isExpired) {
      data.life = data.maxLife; // Reset to full life
      // Initial scale for a newly reset particle (starts small)
      const scale = data.initialScale * 0.1;
      data.matrix.compose(
        position,
        new THREE.Quaternion(),
        new THREE.Vector3(scale, scale, scale)
      );
    } else {
      // Particle is being initialized (not expired), set its state based on its current life
      const elapsedTimeSeconds = (data.maxLife - data.life) / 1000;
      position.addScaledVector(data.velocity, elapsedTimeSeconds); // Advance position based on age

      const lifeRatio = 1 - data.life / data.maxLife; // 0 (brand new) to 1 (about to die)
      // Scale particles closer to center larger
      const centerScaleFactor = Math.max(
        0.1,
        1 - radius / SMOKE_EMISSION_RADIUS
      );
      let currentScale = data.initialScale * (0.1 + lifeRatio * 2.9); // Scale from 0.1x up to 3.0x of initialScale

      if (lifeRatio > 0.85) {
        // Start "fading" by shrinking rapidly in the last 15% of life
        currentScale *= Math.max(0, 1 - (lifeRatio - 0.85) / 0.15);
      }
      currentScale = Math.max(0.001, currentScale); // Prevent zero or negative scale

      data.matrix.compose(
        position,
        new THREE.Quaternion(), // No rotation for spheres
        new THREE.Vector3(currentScale, currentScale, currentScale)
      );
    }
    this.instancedSmoke.setMatrixAt(index, data.matrix);
  }

  update(_time: number, deltaMs: number) {
    if (!this.instancedSmoke || !this.smokeContainer.visible) return;

    const deltaSeconds = deltaMs / 1000;
    let needsMatrixUpdate = false;

    for (let i = 0; i < NUM_SMOKE_PARTICLES; i++) {
      const data = this.particleData[i];

      // Skip inactive particles
      if (!data.active) continue;

      data.life -= deltaMs;

      if (data.life <= 0) {
        // Deactivate the particle rather than recycling it
        data.active = false;
        data.matrix.compose(
          new THREE.Vector3(0, 0, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(0, 0, 0)
        );
        this.instancedSmoke.setMatrixAt(i, data.matrix);
        needsMatrixUpdate = true;
        continue;
      }

      // Update position
      const currentPosition = new THREE.Vector3().setFromMatrixPosition(
        data.matrix
      );
      currentPosition.addScaledVector(data.velocity, deltaSeconds);

      // Update scale based on life
      const lifeRatio = 1 - data.life / data.maxLife; // 0 (brand new) to 1 (about to die)
      // Scale grows from 0.1x of its initialScale up to 3x of its initialScale, then shrinks
      let currentScale = data.initialScale * (0.1 + lifeRatio * 2.9);

      if (lifeRatio > 0.85) {
        // Shrink rapidly in the last 15% of life
        currentScale *= Math.max(0, 1 - (lifeRatio - 0.85) / 0.15);
      }
      currentScale = Math.max(0.001, currentScale); // Clamp to a minimum small scale

      // Update matrix
      data.matrix.compose(
        currentPosition,
        new THREE.Quaternion(), // No rotation for smoke spheres
        new THREE.Vector3(currentScale, currentScale, currentScale)
      );
      this.instancedSmoke.setMatrixAt(i, data.matrix);
      needsMatrixUpdate = true;
    }

    if (needsMatrixUpdate) {
      this.instancedSmoke.instanceMatrix.needsUpdate = true;
    }
  }

  public setVisible(visible: boolean) {
    this.smokeContainer.visible = visible;
  }

  public dispose() {
    if (this.smokeContainer && this.smokeContainer.parent) {
      this.smokeContainer.parent.remove(this.smokeContainer);
    }
    if (this.instancedSmoke) {
      this.instancedSmoke.geometry.dispose(); // Dispose the source geometry
      (this.instancedSmoke.material as THREE.Material).dispose(); // Dispose the material
      this.instancedSmoke.dispose(); // Dispose instanced attributes (like instanceMatrix)
    }
    this.particleData = []; // Clear the array
  }
}
