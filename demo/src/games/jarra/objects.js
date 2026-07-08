import * as THREE from 'three';

// --- Pitcher (Jarra de barro) - Organic clay style ---
export function createPitcher(scene) {
  const group = new THREE.Group();

  const clayMat = new THREE.MeshStandardMaterial({
    color: '#ad6242',
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false,
  });

  // Body: hollow lathe profile (softer transitions, rounded pedestal and lip)
  const profile = [
    new THREE.Vector2(0.00, 0.00),
    new THREE.Vector2(0.14, 0.00), // base
    new THREE.Vector2(0.16, 0.005), // softer pedestal bottom corner
    new THREE.Vector2(0.17, 0.015), // pedestal height
    new THREE.Vector2(0.16, 0.03), // very soft indent
    new THREE.Vector2(0.26, 0.10), // curve towards belly
    new THREE.Vector2(0.36, 0.20), // belly lower
    new THREE.Vector2(0.39, 0.28), // max belly width
    new THREE.Vector2(0.36, 0.38), // belly upper
    new THREE.Vector2(0.27, 0.50), // soft shoulder
    new THREE.Vector2(0.24, 0.58), // neck narrowest
    new THREE.Vector2(0.27, 0.67), // flare
    new THREE.Vector2(0.29, 0.69), // outer lip arc
    new THREE.Vector2(0.29, 0.705), // lip top peak
    new THREE.Vector2(0.27, 0.71), // lip inner arc
    new THREE.Vector2(0.24, 0.69), // lip inside
    new THREE.Vector2(0.20, 0.58), // neck inner
    new THREE.Vector2(0.22, 0.50), // shoulder inner
    new THREE.Vector2(0.31, 0.38), // inner belly upper
    new THREE.Vector2(0.35, 0.28), // belly inner
    new THREE.Vector2(0.32, 0.20), // inner belly lower
    new THREE.Vector2(0.22, 0.10), // inner curve
    new THREE.Vector2(0.13, 0.05), // floor inner
    new THREE.Vector2(0.00, 0.05),
  ];
  
  const bodyGeo = new THREE.LatheGeometry(profile, 64);
  
  // Vertex deformation for a seamless "pinched" spout
  const pos = bodyGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y > 0.5 && x < -0.05) {
      const angle = Math.atan2(z, x);
      let distToSpoutCenter = Math.abs(angle);
      if (distToSpoutCenter > Math.PI) distToSpoutCenter = 2 * Math.PI - distToSpoutCenter;
      distToSpoutCenter = Math.PI - distToSpoutCenter;
      
      const maxAngleInfluence = 0.7; // Radians
      if (distToSpoutCenter < maxAngleInfluence) {
        const influence = Math.pow(1 - distToSpoutCenter / maxAngleInfluence, 2);
        const heightInfluence = Math.max(0, (y - 0.5) / 0.21);
        const totalInfluence = influence * heightInfluence;

        const pullOut = 0.14 * totalInfluence;
        const pinchIn = z * 0.4 * totalInfluence;
        const raiseUp = 0.04 * totalInfluence;
        
        pos.setX(i, x - pullOut);
        pos.setY(i, y + raiseUp);
        pos.setZ(i, z - pinchIn);
      }
    }
  }
  bodyGeo.computeVertexNormals();
  
  const body = new THREE.Mesh(bodyGeo, clayMat);
  body.position.y = -0.375;
  body.castShadow = true;
  group.add(body);

  // Handle (Restored wider arc, merged deeply into the body)
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.15, 0.58, 0), // hidden deep inside neck
    new THREE.Vector3(0.24, 0.58, 0), // crossing the wall
    new THREE.Vector3(0.48, 0.55, 0), // wide arc
    new THREE.Vector3(0.52, 0.35, 0), // wide arc
    new THREE.Vector3(0.38, 0.20, 0), // crossing the wall
    new THREE.Vector3(0.25, 0.20, 0), // hidden deep inside belly
  ]);
  const handleGeo = new THREE.TubeGeometry(handleCurve, 24, 0.045, 12, false);
  const handle = new THREE.Mesh(handleGeo, clayMat);
  handle.position.y = -0.375; // match body local space translation
  handle.castShadow = true;
  group.add(handle);

  group.position.set(0, 0.5, 0);
  scene.add(group);

  return group;
}

// --- Liquid inside pitcher ---
export function createPitcherLiquid(pitcherGroup) {
  const liqProfile = [
    new THREE.Vector2(0.00, 0.06),
    new THREE.Vector2(0.12, 0.06),
    new THREE.Vector2(0.21, 0.10),
    new THREE.Vector2(0.31, 0.20),
    new THREE.Vector2(0.34, 0.28),
    new THREE.Vector2(0.30, 0.38),
    new THREE.Vector2(0.21, 0.50),
    new THREE.Vector2(0.19, 0.58),
    new THREE.Vector2(0.23, 0.69),
    new THREE.Vector2(0.00, 0.69),
  ];
  const geo = new THREE.LatheGeometry(liqProfile, 64);
  
  // Apply vertex deformation for the spout
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    if (y > 0.5 && x < -0.05) {
      const angle = Math.atan2(z, x);
      let distToSpoutCenter = Math.abs(angle);
      if (distToSpoutCenter > Math.PI) distToSpoutCenter = 2 * Math.PI - distToSpoutCenter;
      distToSpoutCenter = Math.PI - distToSpoutCenter;
      
      const maxAngleInfluence = 0.7;
      if (distToSpoutCenter < maxAngleInfluence) {
        const influence = Math.pow(1 - distToSpoutCenter / maxAngleInfluence, 2);
        const heightInfluence = Math.max(0, (y - 0.5) / 0.21);
        const totalInfluence = influence * heightInfluence;

        pos.setX(i, x - 0.14 * totalInfluence);
        pos.setY(i, y + 0.04 * totalInfluence);
        pos.setZ(i, z - z * 0.4 * totalInfluence);
      }
    }
  }
  geo.computeVertexNormals();
  geo.translate(0, -0.375, 0); // match body position

  const mat = new THREE.MeshStandardMaterial({
    color: '#5bb8e8',
    transparent: true,
    opacity: 0.85,
    roughness: 0.2,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  pitcherGroup.add(mesh);

  return { mesh };
}

// --- Glass (Vaso) - Tumbler style ---
export function createGlass(scene) {
  const group = new THREE.Group();

  const glassMat = new THREE.MeshStandardMaterial({
    color: '#e0eff5',
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });

  // Body: Tumbler shape
  const profile = [
    new THREE.Vector2(0.00, 0.00),
    new THREE.Vector2(0.12, 0.00),
    new THREE.Vector2(0.16, 0.08),
    new THREE.Vector2(0.20, 0.20),
    new THREE.Vector2(0.17, 0.35),
    new THREE.Vector2(0.17, 0.40), // lip outer
    new THREE.Vector2(0.15, 0.40), // lip inner
    new THREE.Vector2(0.15, 0.35),
    new THREE.Vector2(0.18, 0.20),
    new THREE.Vector2(0.14, 0.08),
    new THREE.Vector2(0.10, 0.02),
    new THREE.Vector2(0.00, 0.02),
  ];
  const bodyGeo = new THREE.LatheGeometry(profile, 32);
  const body = new THREE.Mesh(bodyGeo, glassMat);
  body.position.y = -0.2;
  group.add(body);

  // Water fill inside glass — Scaled vertically from the bottom! No clipping planes needed.
  const waterProfile = [
    new THREE.Vector2(0.00, 0.00),
    new THREE.Vector2(0.09, 0.00),
    new THREE.Vector2(0.13, 0.06),
    new THREE.Vector2(0.17, 0.18),
    new THREE.Vector2(0.14, 0.33),
    new THREE.Vector2(0.00, 0.33),
  ];
  const waterGeo = new THREE.LatheGeometry(waterProfile, 24);

  const waterMat = new THREE.MeshStandardMaterial({
    color: '#5bb8e8',
    transparent: true,
    opacity: 0.8,
    roughness: 0.15,
    side: THREE.DoubleSide,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -0.18; // Base of the inside of the glass
  water.visible = false;
  group.add(water);

  group.position.set(-0.75, -0.9, 0); // Aligned position
  group.castShadow = true;
  scene.add(group);

  return { group, waterMesh: water };
}

// --- Faucet (Grifo) - Golden style with valve ---
export function createFaucet(scene) {
  const group = new THREE.Group();
  
  // Golden material
  const goldMat = new THREE.MeshStandardMaterial({ 
    color: '#e6c25a', 
    roughness: 0.25, 
    metalness: 0.85 
  });
  
  // Base metal for some parts
  const darkMetal = new THREE.MeshStandardMaterial({
    color: '#444444',
    roughness: 0.6,
    metalness: 0.5
  });

  // Vertical pipe from wall/ceiling
  const pipeVGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 16);
  const pipeV = new THREE.Mesh(pipeVGeo, goldMat);
  pipeV.position.y = 0.6;
  pipeV.castShadow = true;
  group.add(pipeV);

  // Horizontal arm
  const pipeHGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.4, 16);
  const pipeH = new THREE.Mesh(pipeHGeo, goldMat);
  pipeH.rotation.z = Math.PI / 2;
  pipeH.position.set(-0.1, 0.05, 0);
  pipeH.castShadow = true;
  group.add(pipeH);

  // Nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.025, 0.045, 0.1, 16);
  const nozzle = new THREE.Mesh(nozzleGeo, goldMat);
  nozzle.position.set(-0.15, -0.02, 0); // Desplazado a la izquierda, bajo la válvula
  nozzle.castShadow = true;
  group.add(nozzle);
  
  // Valve (Llave de paso) on top
  const valveGroup = new THREE.Group();
  
  const valveStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 8);
  const valveStem = new THREE.Mesh(valveStemGeo, goldMat);
  valveStem.position.y = 0.04;
  valveGroup.add(valveStem);
  
  const valveWheelGeo = new THREE.TorusGeometry(0.05, 0.012, 8, 16);
  const valveWheel = new THREE.Mesh(valveWheelGeo, darkMetal);
  valveWheel.rotation.x = Math.PI / 2;
  valveWheel.position.y = 0.08;
  valveGroup.add(valveWheel);
  
  // Cross bars inside the wheel
  const crossGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.1, 8);
  const cross1 = new THREE.Mesh(crossGeo, darkMetal);
  cross1.rotation.z = Math.PI / 2;
  cross1.position.y = 0.08;
  valveGroup.add(cross1);
  const cross2 = new THREE.Mesh(crossGeo, darkMetal);
  cross2.rotation.x = Math.PI / 2;
  cross2.position.y = 0.08;
  valveGroup.add(cross2);
  
  valveGroup.position.set(-0.15, 0.07, 0); // Placed on the horizontal arm
  group.add(valveGroup);

  group.position.set(0, 1.5, 0);
  scene.add(group);

  // World position where water drops come from
  const nozzleWorldPos = new THREE.Vector3(-0.15, 1.43, 0);
  return { group, nozzlePos: nozzleWorldPos };
}

// --- Wooden table ---
export function createTable(scene) {
  const woodMat = new THREE.MeshStandardMaterial({ color: '#a0724a', roughness: 0.9, metalness: 0 });

  // Table top
  const topGeo = new THREE.BoxGeometry(4.0, 0.15, 1.8);
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.set(0, -1.15, 0);
  top.receiveShadow = true;
  top.castShadow = true;
  scene.add(top);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
  const positions = [[-1.6, -1.7, 0.6], [1.6, -1.7, 0.6], [-1.6, -1.7, -0.6], [1.6, -1.7, -0.6]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    scene.add(leg);
  }
}
