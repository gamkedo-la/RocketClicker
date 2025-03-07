import * as THREE from "three";

const DEG_TO_RAD = Math.PI / 180;

export class Camera {
  camera: THREE.OrthographicCamera;
  cameraAzimuth: number = 180;
  cameraElevation: number = 30;

  // Create a pivot object to handle orbital positioning
  pivot: THREE.Object3D = new THREE.Object3D();

  origin = new THREE.Vector2();

  constructor(width: number, height: number) {
    const aspect = width / height;
    const cameraSize = 3;

    this.camera = new THREE.OrthographicCamera(
      -(cameraSize * aspect) / 2,
      (cameraSize * aspect) / 2,
      cameraSize / 2,
      -cameraSize / 2,
      0.1,
      2000
    );

    this.camera.zoom = 11;

    // Position camera at a distance from pivot
    //this.camera.position.set(0, 0, 100);

    // Add camera as child of pivot
    this.pivot.add(this.camera);

    // Make camera look at pivot center
    this.camera.lookAt(this.pivot.position);

    // Set initial orbital position
    this.update();

    // TODO: Magic numbers :love:
    this.addOrigin(0.05, 0, 0.133);
  }

  update() {
    // Calculate position on sphere
    const x =
      100 *
      Math.sin(this.cameraAzimuth * DEG_TO_RAD) *
      Math.cos(this.cameraElevation * DEG_TO_RAD);
    const y = 100 * Math.sin(this.cameraElevation * DEG_TO_RAD);
    const z =
      100 *
      Math.cos(this.cameraAzimuth * DEG_TO_RAD) *
      Math.cos(this.cameraElevation * DEG_TO_RAD);

    // Position camera
    this.camera.position.set(x, y, z);
    this.camera.lookAt(new THREE.Vector3(0, 0, 0));

    this.camera.updateProjectionMatrix();
  }

  // Set pivot position (origin point for orbit)
  setOrigin(x: number, y: number, z: number) {
    this.origin.set(x, z);
    this.pivot.position.set(x, y, z);
  }

  addOrigin(x: number, y: number, z: number) {
    this.origin.add(new THREE.Vector2(x, z));
    this.pivot.position.add(new THREE.Vector3(x, y, z));
  }

  // Get the pivot to add to scene or parent object
  getPivot() {
    return this.pivot;
  }
}
