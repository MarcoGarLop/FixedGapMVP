import * as THREE from 'three';

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
];

const HAND_COLOR = '#f5c9a8';
const PINCH_COLOR = '#6bab7d';

// World bounds that map to the table area
// Camera looks at the table from above-ish, table goes from z ~ -3 to z ~ 3.5
// and x from ~ -4 to 4
const WORLD_X_MIN = -5.5;
const WORLD_X_MAX = 5.5;
const WORLD_Z_MIN = -4.0;  // far (pillbox area)
const WORLD_Z_MAX = 3.8;   // near (tray area)
const HAND_HEIGHT = 1.2;    // fixed height above table for visual

export class Hand3D {
  constructor(scene, orientation = 'horizontal') {
    this._scene = scene;
    this.orientation = orientation;
    this._offsetY = null;
    this._lostTime = null;

    this._jointMat = new THREE.MeshStandardMaterial({ color: HAND_COLOR, roughness: 0.75, metalness: 0 });
    this._boneMat = new THREE.MeshStandardMaterial({ color: HAND_COLOR, roughness: 0.8, metalness: 0 });
    this._pinchMat = new THREE.MeshStandardMaterial({ color: PINCH_COLOR, roughness: 0.6, metalness: 0.1 });

    const jointGeo = new THREE.SphereGeometry(0.055, 10, 8);
    const boneGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);

    this._joints = [];
    this._bones = [];

    for (let i = 0; i < 21; i++) {
      const mesh = new THREE.Mesh(jointGeo, this._jointMat);
      mesh.castShadow = false;
      mesh.visible = false;
      scene.add(mesh);
      this._joints.push(mesh);
    }

    for (let i = 0; i < CONNECTIONS.length; i++) {
      const mesh = new THREE.Mesh(boneGeo, this._boneMat);
      mesh.castShadow = false;
      mesh.visible = false;
      scene.add(mesh);
      this._bones.push(mesh);
    }

    this._pinchPos = new THREE.Vector3(0, 0, 0);
  }

  update(landmarks, isPinching, pinchType = 'none') {
    const lms = landmarks[0];
    if (!lms) {
      this._hideAll();
      if (!this._lostTime) this._lostTime = Date.now();
      if (Date.now() - this._lostTime > 1000) {
        this._offsetY = null; // Reset calibration after 1 second of lost tracking
      }
      return;
    }
    this._lostTime = null;

    if (this._offsetY === null && this.orientation === 'vertical') {
      this._offsetY = lms[9].y; // Calibrate to middle finger MCP
    }

    for (let i = 0; i < 21; i++) {
      const pos = this._toWorld(lms[i]);
      const joint = this._joints[i];
      joint.position.copy(pos);
      joint.visible = true;

      const isPinchFinger = isPinching && (i === 4 || (pinchType === 'middle' ? i === 12 : i === 8));
      if (isPinchFinger) {
        joint.material = this._pinchMat;
        joint.scale.setScalar(1.4);
      } else {
        joint.material = this._jointMat;
        joint.scale.setScalar(1.0);
      }
    }

    for (let i = 0; i < CONNECTIONS.length; i++) {
      const [si, ei] = CONNECTIONS[i];
      const start = this._joints[si].position;
      const end = this._joints[ei].position;
      const bone = this._bones[i];

      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();

      bone.position.copy(mid);
      bone.scale.set(1, len, 1);
      bone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      bone.visible = true;
    }
  }

  _toWorld(lm) {
    // MediaPipe: x 0-1 (left edge to right edge of camera image)
    //            y 0-1 (top to bottom)
    //            z: relative depth (negative = closer to camera)
    //
    // For this top-down table game:
    //   MP x -> World X (mirrored: left hand on right side of screen)
    //   MP y -> World Z (top of camera = far on table, bottom = near/tray)
    //   Hand visual height uses mp.z for slight depth variation

    const x = (1 - lm.x) * (WORLD_X_MAX - WORLD_X_MIN) + WORLD_X_MIN;
    let y, z;
    
    if (this.orientation === 'vertical') {
      const oy = this._offsetY !== null ? this._offsetY : 0.5;
      y = 0.8 + (oy - lm.y) * 4.0; 
      z = lm.z * 5 + 1.0; // Shift well forward, off the table edge
    } else {
      z = lm.y * (WORLD_Z_MAX - WORLD_Z_MIN) + WORLD_Z_MIN;
      y = HAND_HEIGHT - lm.z * 1.5;
    }

    return new THREE.Vector3(x, y, z);
  }

  getPinchWorldPos(landmarks, pinchType = 'none') {
    const lms = landmarks[0];
    if (!lms) return null;

    if (this._offsetY === null && this.orientation === 'vertical') {
      this._offsetY = lms[9].y;
    }

    const thumb = lms[4];
    const targetFinger = lms[pinchType === 'middle' ? 12 : 8];
    const mx = (thumb.x + targetFinger.x) / 2;
    const my = (thumb.y + targetFinger.y) / 2;

    const x = (1 - mx) * (WORLD_X_MAX - WORLD_X_MIN) + WORLD_X_MIN;
    let y = 0, z = 0;

    if (this.orientation === 'vertical') {
      const oy = this._offsetY !== null ? this._offsetY : 0.5;
      y = 0.8 + (oy - my) * 4.0;
      z = 1.0; // Fixed depth plane entirely in front of table edge
    } else {
      z = my * (WORLD_Z_MAX - WORLD_Z_MIN) + WORLD_Z_MIN;
      y = HAND_HEIGHT;
    }

    // No smoothing needed here — One-Euro filter handles it upstream
    this._pinchPos.x = x;
    this._pinchPos.y = y;
    this._pinchPos.z = z;

    return this._pinchPos.clone();
  }

  _hideAll() {
    for (const j of this._joints) j.visible = false;
    for (const b of this._bones) b.visible = false;
  }
}
