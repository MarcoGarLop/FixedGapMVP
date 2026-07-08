import * as THREE from 'three';
import { createPillGeometry } from './pillGeometry.js';
import { PILL_MATS } from './materials.js';

export class Pills3D {
  constructor(scene) {
    this._scene = scene;
    this._meshes = new Map(); // pill.id -> mesh
  }

  createPill(pill, position) {
    const geo = createPillGeometry(pill.type);
    const mat = PILL_MATS[pill.type].clone();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Random Y rotation for variety
    mesh.rotation.y = Math.random() * Math.PI * 2;
    this._scene.add(mesh);
    this._meshes.set(pill.id, mesh);
    return mesh;
  }

  getMesh(pillId) {
    return this._meshes.get(pillId);
  }

  setPosition(pillId, pos) {
    const mesh = this._meshes.get(pillId);
    if (mesh) {
      mesh.position.x = pos.x;
      mesh.position.y = pos.y;
      mesh.position.z = pos.z;
    }
  }

  setHeld(pillId, held) {
    const mesh = this._meshes.get(pillId);
    if (!mesh) return;
    const targetScale = held ? 1.2 : 1.0;
    mesh.scale.setScalar(targetScale);
    // Lift up when held
    if (held) mesh.position.y = 0.6;
  }

  removePill(pillId) {
    const mesh = this._meshes.get(pillId);
    if (mesh) {
      this._scene.remove(mesh);
      mesh.geometry.dispose();
      this._meshes.delete(pillId);
    }
  }

  animateTo(pillId, target, duration, onDone) {
    const mesh = this._meshes.get(pillId);
    if (!mesh) return;
    const start = mesh.position.clone();
    const startTime = performance.now();

    const animate = () => {
      const t = Math.min(1, (performance.now() - startTime) / duration);
      const ease = easeOutBack(t);
      mesh.position.lerpVectors(start, target, ease);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        mesh.position.copy(target);
        if (onDone) onDone();
      }
    };
    animate();
  }

  animateBounce(pillId, target, duration) {
    const mesh = this._meshes.get(pillId);
    if (!mesh) return;

    const start = mesh.position.clone();
    const startTime = performance.now();

    // Shake first, then move back
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / duration);

      if (t < 0.2) {
        // Shake phase
        const shakeT = t / 0.2;
        mesh.position.x = start.x + Math.sin(shakeT * Math.PI * 6) * 0.1 * (1 - shakeT);
        mesh.position.z = start.z + Math.cos(shakeT * Math.PI * 4) * 0.05 * (1 - shakeT);
      } else {
        // Return phase
        const returnT = (t - 0.2) / 0.8;
        const ease = easeOutBack(returnT);
        mesh.position.lerpVectors(start, target, ease);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        mesh.position.copy(target);
      }
    };
    animate();
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
