import * as THREE from 'three';
import { FLOOR_MAT } from './materials.js';

export function createFloor(scene) {
  const geo = new THREE.PlaneGeometry(20, 20);
  const floor = new THREE.Mesh(geo, FLOOR_MAT);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);
}
