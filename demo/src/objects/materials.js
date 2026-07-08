import * as THREE from 'three';

// Clay/matte materials — high roughness, zero metalness, subsurface-like colors
export function clayMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: false,
  });
}

export const PILL_MATS = {
  cardio: clayMaterial('#d94f4f'),
  vitamina: clayMaterial('#e8a838'),
  omega: clayMaterial('#d4a843'),
  calcio: clayMaterial('#f0ebe3'),
};

export const TABLE_MAT = clayMaterial('#e8ddd0');
export const TRAY_MAT = clayMaterial('#c8bfb0');
export const COMPARTMENT_MAT = clayMaterial('#f5f0e8');
export const COMPARTMENT_DONE_MAT = clayMaterial('#b8e4c8');
export const FLOOR_MAT = clayMaterial('#f4ede4');
export const LABEL_MAT = clayMaterial('#3d3428');
export const GHOST_MAT = new THREE.MeshStandardMaterial({
  color: '#a09888',
  roughness: 0.9,
  metalness: 0,
  transparent: true,
  opacity: 0.25,
});
