import * as THREE from "three";

export const starMaterial = new THREE.MeshStandardMaterial({
  color: 0x444444,
  dithering: true,
  metalness: 0.3,
  roughness: 1,
  flatShading: true,
  emissive: 0xffffff,
  emissiveIntensity: 1,
});
