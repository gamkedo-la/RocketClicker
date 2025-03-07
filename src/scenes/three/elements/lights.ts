import * as THREE from "three";

export function createLights() {
  const lights = [];

  const ambientLight = new THREE.AmbientLight(0x2d3645, 1.5);
  lights.push(ambientLight);

  let directionalLight = new THREE.DirectionalLight(0xfffc9c, 0.5);
  directionalLight.position.set(0, -10, 0);
  directionalLight.castShadow = true;
  lights.push(directionalLight);

  let spotLight = new THREE.SpotLight(0xffffff, 5, 10, Math.PI / 8, 0.02, 0);
  spotLight.position.set(0.02, 2.3, 0.72);
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.set(4, 4);
  lights.push(spotLight);

  return lights;
}
