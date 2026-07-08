import * as THREE from 'three';
import { TRAY_MAT } from './materials.js';

const TRAY_W = 5.5;
const TRAY_D = 2.2;
const TRAY_H = 0.12;
const WALL_H = 0.18;
const WALL_T = 0.1;

export class Tray {
  constructor(scene) {
    this._group = new THREE.Group();
    this._group.position.set(0, 0, 2.0);
    scene.add(this._group);

    // Base plate
    const baseGeo = new THREE.BoxGeometry(TRAY_W, TRAY_H, TRAY_D);
    baseGeo.translate(0, TRAY_H / 2, 0);
    const base = new THREE.Mesh(baseGeo, TRAY_MAT);
    base.castShadow = true;
    base.receiveShadow = true;
    this._group.add(base);

    // Rounded rim walls
    this._addWall(0, 0, -TRAY_D / 2 + WALL_T / 2, TRAY_W, WALL_T); // back
    this._addWall(0, 0, TRAY_D / 2 - WALL_T / 2, TRAY_W, WALL_T);  // front
    this._addWall(-TRAY_W / 2 + WALL_T / 2, 0, 0, WALL_T, TRAY_D); // left
    this._addWall(TRAY_W / 2 - WALL_T / 2, 0, 0, WALL_T, TRAY_D);  // right
  }

  _addWall(x, y, z, w, d) {
    const geo = new THREE.BoxGeometry(w, WALL_H, d);
    geo.translate(0, TRAY_H + WALL_H / 2, 0);
    const wall = new THREE.Mesh(geo, TRAY_MAT);
    wall.position.set(x, y, z);
    wall.castShadow = true;
    this._group.add(wall);
  }

  getPosition() {
    return this._group.position;
  }

  getBounds() {
    const p = this._group.position;
    return {
      minX: p.x - TRAY_W / 2 + 0.2,
      maxX: p.x + TRAY_W / 2 - 0.2,
      minZ: p.z - TRAY_D / 2 + 0.2,
      maxZ: p.z + TRAY_D / 2 - 0.2,
      y: p.y + TRAY_H + 0.15,
    };
  }
}
