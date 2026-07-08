import * as THREE from 'three';

export function createPillGeometry(type) {
  switch (type) {
    case 'cardio': return createTabletRound();
    case 'vitamina': return createCapsule();
    case 'omega': return createSoftgel();
    case 'calcio': return createTabletLarge();
    default: return createTabletRound();
  }
}

function createTabletRound() {
  // Round chunky tablet — clearly circular
  const geo = new THREE.CylinderGeometry(0.3, 0.3, 0.16, 24);
  // Bevel the edges by scaling top/bottom rings inward
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (Math.abs(y) > 0.07) {
      const scale = 0.88;
      pos.setX(i, pos.getX(i) * scale);
      pos.setZ(i, pos.getZ(i) * scale);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function createCapsule() {
  // Clearly elongated capsule shape
  const geo = new THREE.CapsuleGeometry(0.16, 0.38, 12, 20);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function createSoftgel() {
  // Oval egg — wider than tall, clearly different from round
  const geo = new THREE.SphereGeometry(0.25, 24, 16);
  geo.scale(1.4, 0.65, 1.0);
  return geo;
}

function createTabletLarge() {
  // Big rectangular tablet with rounded edges — oblong
  const shape = new THREE.Shape();
  const w = 0.4;
  const h = 0.2;
  const r = 0.1;
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.18,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.center();
  geo.rotateX(Math.PI / 2);
  return geo;
}
