import * as THREE from 'three';

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export class DayLabels {
  constructor(scene, compartmentBounds) {
    this._meshes = [];
    this._scene = scene;

    // Create floating clay letter approximations using simple shapes
    // Each day gets a distinctive shape marker instead of text
    const colors = ['#d94f4f', '#e8a838', '#6bab7d', '#5a8fc7', '#9b7dc7', '#d4a843', '#c76b8a'];

    for (let i = 0; i < 7; i++) {
      const b = compartmentBounds[i];
      const geo = new THREE.SphereGeometry(0.08, 12, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i],
        roughness: 0.7,
        metalness: 0,
      });
      const dot = new THREE.Mesh(geo, mat);
      dot.position.set(b.centerX, 0.45, b.minZ - 0.15);
      dot.castShadow = true;
      scene.add(dot);
      this._meshes.push(dot);
    }
  }
}
