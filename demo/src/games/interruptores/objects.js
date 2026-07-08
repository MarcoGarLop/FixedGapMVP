import * as THREE from 'three';

// Material base de estilo Clay/Plastic
function createPlasticMaterial(color, roughness = 1.0, metalness = 0.0) {
  return new THREE.MeshStandardMaterial({
    color: color,
    roughness: roughness,
    metalness: metalness,
  });
}

// Mesa
export function createTable(scene) {
  const woodMat = createPlasticMaterial('#c49a76');
  
  const topGeo = new THREE.BoxGeometry(6.0, 0.2, 3.0);
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.set(0, -0.1, -1.0); // Z: -1.0 to give space
  top.receiveShadow = true;
  scene.add(top);

  // Patas
  const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.0, 16);
  const positions = [[-2.5, -1.1, 0.2], [2.5, -1.1, 0.2], [-2.5, -1.1, -2.2], [2.5, -1.1, -2.2]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeo, woodMat);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    scene.add(leg);
  }
}

// Interruptor (Estilo "Frankenstein" Industrial / Plástico Suave)
export function createSwitch(scene, xPos, zPos = -0.5) {
  const group = new THREE.Group();

  // Colores y Materiales según especificación
  const baseMat = createPlasticMaterial('#4A4E53', 0.95, 0.0); // Gris marengo mate
  const armMat = createPlasticMaterial('#B0B3B8', 0.95, 0.0);  // Gris claro
  const gripMat = createPlasticMaterial('#D4A373', 0.95, 0.0); // Mostaza suave / Terracota
  const badgeMat = createPlasticMaterial('#E63946', 0.95, 0.0); // Rojo coral

  // --- Placa Base (Backplate) ---
  // Bloque vertical rectangular grueso con bordes redondeados
  const rectShape = new THREE.Shape();
  const w = 0.45, h = 0.8, r = 0.08;
  rectShape.moveTo(-w/2 + r, 0);
  rectShape.lineTo(w/2 - r, 0);
  rectShape.quadraticCurveTo(w/2, 0, w/2, r);
  rectShape.lineTo(w/2, h - r);
  rectShape.quadraticCurveTo(w/2, h, w/2 - r, h);
  rectShape.lineTo(-w/2 + r, h);
  rectShape.quadraticCurveTo(-w/2, h, -w/2, h - r);
  rectShape.lineTo(-w/2, r);
  rectShape.quadraticCurveTo(-w/2, 0, -w/2 + r, 0);

  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  };
  const baseGeo = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
  baseGeo.translate(0, 0, -0.05); // Centrar en profundidad
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0; // Apoyado en la mesa
  base.castShadow = true;
  group.add(base);

  // --- Bisagra Inferior (Hinge fija) ---
  // Dos cilindros horizontales en la base
  const hingeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.55, 32);
  const hinge = new THREE.Mesh(hingeGeo, armMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, 0.12, 0.07); // Sobresale un poco hacia adelante
  hinge.castShadow = true;
  group.add(hinge);

  // --- Grupo Móvil de la Palanca ---
  const leverGroup = new THREE.Group();
  // El pivote se coloca exactamente en el centro de la bisagra inferior
  leverGroup.position.set(0, 0.12, 0.07);

  // Brazo en forma de "U" invertida
  // Barras laterales
  const barGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 16);
  const leftBar = new THREE.Mesh(barGeo, armMat);
  leftBar.position.set(-0.18, 0.225, 0); // 0.225 es la mitad de 0.45
  leftBar.castShadow = true;
  leverGroup.add(leftBar);

  const rightBar = new THREE.Mesh(barGeo, armMat);
  rightBar.position.set(0.18, 0.225, 0);
  rightBar.castShadow = true;
  leverGroup.add(rightBar);

  // Travesaño superior
  const crossGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 16);
  const cross = new THREE.Mesh(crossGeo, armMat);
  cross.rotation.z = Math.PI / 2;
  cross.position.set(0, 0.45, 0);
  cross.castShadow = true;
  leverGroup.add(cross);

  // Mango (Grip grueso y ergonómico)
  const gripProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(0.09, 0.06), // Bulbo inferior
    new THREE.Vector2(0.1, 0.12),
    new THREE.Vector2(0.08, 0.18), // Cuello
    new THREE.Vector2(0.07, 0.24),
    new THREE.Vector2(0.09, 0.3),  // Bulbo superior
    new THREE.Vector2(0.07, 0.36),
    new THREE.Vector2(0, 0.38)     // Cúpula
  ];
  const gripGeo = new THREE.LatheGeometry(gripProfile, 32);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.set(0, 0.45, 0); // Nace del travesaño hacia arriba
  grip.castShadow = true;
  leverGroup.add(grip);

  // Insignia Circular (Detalle frontal)
  const badgeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 24);
  badgeGeo.rotateX(Math.PI / 2); // Orientar cara al frente (+Z)
  const badge = new THREE.Mesh(badgeGeo, badgeMat);
  badge.position.set(0, 0.45, 0.05); // Incrustado frontalmente en el travesaño
  badge.castShadow = true;
  leverGroup.add(badge);

  // Rotación inicial de la palanca (ligeramente hacia el jugador)
  leverGroup.rotation.x = Math.PI / 6; 
  
  group.add(leverGroup);
  
  group.position.set(xPos, 0, zPos);
  scene.add(group);

  return { group, leverGroup };
}

// Lámpara (Rediseñada - Estilo Flexo Clásico Plástico)
export function createLamp(scene, xPos) {
  const group = new THREE.Group();
  
  // Colores y Materiales según especificación
  const baseMat = createPlasticMaterial('#F5B78E', 1.0, 0.0); // Naranja pastel cálido
  const armMat = createPlasticMaterial('#E5E7E9', 1.0, 0.0); // Gris casi blanco
  const darkMat = createPlasticMaterial('#2C3E50', 1.0, 0.0); // Gris muy oscuro / negro mate

  // Base (Cúpula baja con borde redondeado)
  const baseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.3, 0),
    new THREE.Vector2(0.32, 0.02),
    new THREE.Vector2(0.3, 0.08),
    new THREE.Vector2(0.15, 0.15),
    new THREE.Vector2(0, 0.15)
  ];
  const baseGeo = new THREE.LatheGeometry(baseProfile, 32);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.castShadow = true;
  group.add(base);

  // Dial de la Base (Disco ovalado sobresaliendo)
  const dialGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 24);
  const dial = new THREE.Mesh(dialGeo, baseMat);
  dial.rotation.x = Math.PI / 2;
  dial.rotation.z = -Math.PI / 6;
  dial.position.set(0.28, 0.06, 0.1); 
  dial.castShadow = true;
  group.add(dial);

  // Cable (Tubo grueso saliendo de la parte trasera izquierda conectando al interruptor izquierdo)
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.04, -0.15), // Origen profundo en la base de la lámpara
    new THREE.Vector3(-0.3, 0.01, -0.1),   // Baja a la mesa
    new THREE.Vector3(-0.5, 0.01, 0.4),    // Serpea hacia la derecha
    new THREE.Vector3(-0.9, 0.01, 0.1),    // Serpea hacia la izquierda
    new THREE.Vector3(-1.2, 0.01, 0.5),    // Se aproxima al interruptor
    new THREE.Vector3(-1.428, 0.04, 0.714) // Se inserta bajo el interruptor izquierdo (escala 1.4)
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 32, 0.025, 8, false);
  const cable = new THREE.Mesh(cableGeo, darkMat);
  cable.castShadow = true;
  group.add(cable);

  // Eje de anclaje de la base
  const basePillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 16);
  const basePillar = new THREE.Mesh(basePillarGeo, armMat);
  basePillar.position.set(0, 0.15, 0);
  basePillar.castShadow = true;
  group.add(basePillar);

  // Bisagra Inferior
  const baseHingeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 24);
  const baseHinge = new THREE.Mesh(baseHingeGeo, armMat);
  baseHinge.rotation.z = Math.PI / 2;
  baseHinge.position.set(0, 0.2, 0);
  baseHinge.castShadow = true;
  group.add(baseHinge);

  // --- Brazo Inferior ---
  const lowerArmGroup = new THREE.Group();
  lowerArmGroup.position.set(0, 0.2, 0);
  lowerArmGroup.rotation.x = -Math.PI / 5; // Inclinado hacia adelante

  const lowerArmGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.6, 16);
  const lowerArm = new THREE.Mesh(lowerArmGeo, armMat);
  lowerArm.position.y = 0.3;
  lowerArm.castShadow = true;
  lowerArmGroup.add(lowerArm);

  // Varilla tensora del brazo inferior
  const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8);
  const rod = new THREE.Mesh(rodGeo, armMat);
  rod.position.set(0, 0.3, -0.07); // Varilla detrás del brazo
  rod.castShadow = true;
  lowerArmGroup.add(rod);

  group.add(lowerArmGroup);

  // Bisagra Central
  const midHingeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.14, 24);
  const midHinge = new THREE.Mesh(midHingeGeo, armMat);
  midHinge.rotation.z = Math.PI / 2;
  midHinge.position.y = 0.6;
  midHinge.castShadow = true;
  lowerArmGroup.add(midHinge);

  // --- Brazo Superior ---
  const upperArmGroup = new THREE.Group();
  upperArmGroup.position.set(0, 0.6, 0);
  upperArmGroup.rotation.x = Math.PI / 2.2; // Dobla hacia la mesa

  const upperArmGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 16);
  const upperArm = new THREE.Mesh(upperArmGeo, armMat);
  upperArm.position.y = 0.25;
  upperArm.castShadow = true;
  upperArmGroup.add(upperArm);

  // Muelle / Resorte del brazo superior
  const springPoints = [];
  const turns = 5;
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const angle = t * Math.PI * 2 * turns;
    const radius = 0.06;
    springPoints.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      t * 0.3 + 0.1, // Abarca 0.3 uds de largo, desde 0.1
      Math.sin(angle) * radius
    ));
  }
  const springCurve = new THREE.CatmullRomCurve3(springPoints);
  const springGeo = new THREE.TubeGeometry(springCurve, 64, 0.015, 8, false);
  const spring = new THREE.Mesh(springGeo, darkMat);
  spring.castShadow = true;
  upperArmGroup.add(spring);

  lowerArmGroup.add(upperArmGroup);

  // Bisagra del Cabezal
  const headHingeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 24);
  const headHinge = new THREE.Mesh(headHingeGeo, armMat);
  headHinge.rotation.z = Math.PI / 2;
  headHinge.position.y = 0.5;
  headHinge.castShadow = true;
  upperArmGroup.add(headHinge);

  // --- Campana (Lampshade) ---
  const shadeGroup = new THREE.Group();
  shadeGroup.position.set(0, 0.5, 0);
  shadeGroup.rotation.x = -Math.PI / 3; // Orientada hacia abajo

  // Cilindro de conexión trasero
  const shadeConnGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16);
  const shadeConn = new THREE.Mesh(shadeConnGeo, armMat);
  shadeConn.position.y = 0.05;
  shadeConn.castShadow = true;
  shadeGroup.add(shadeConn);

  // Campana: Semiesfera (Exterior)
  const shadeProfile = [];
  for (let i = 0; i <= 24; i++) {
    const angle = (i / 24) * (Math.PI / 2);
    const r = 0.3 * Math.sin(angle);
    const y = -0.3 + 0.3 * Math.cos(angle); // El vértice está en y=0, el borde en y=-0.3
    shadeProfile.push(new THREE.Vector2(r, y));
  }
  const shadeOuterGeo = new THREE.LatheGeometry(shadeProfile, 32);
  const shadeOuter = new THREE.Mesh(shadeOuterGeo, armMat);
  shadeOuter.castShadow = true;
  shadeGroup.add(shadeOuter);

  // Interior de la campana (Amarillo emisivo)
  const innerProfile = [];
  for (let i = 0; i <= 24; i++) {
    const angle = (i / 24) * (Math.PI / 2);
    const r = 0.29 * Math.sin(angle);
    const y = -0.3 + 0.29 * Math.cos(angle); 
    innerProfile.push(new THREE.Vector2(r, y));
  }
  const shadeInnerGeo = new THREE.LatheGeometry(innerProfile, 32);
  const innerMat = new THREE.MeshStandardMaterial({
    color: '#FFD700',
    emissive: '#FFB800',
    emissiveIntensity: 0.8,
    roughness: 0.9,
    side: THREE.BackSide // Material visible por dentro
  });
  const shadeInner = new THREE.Mesh(shadeInnerGeo, innerMat);
  shadeGroup.add(shadeInner);

  // Luz Puntual simulando la bombilla
  const light = new THREE.PointLight('#ffedd6', 0, 4);
  light.position.set(0, -0.2, 0); // Dentro de la campana
  light.castShadow = true;
  shadeGroup.add(light);

  upperArmGroup.add(shadeGroup);

  group.position.set(xPos, 0, -1.8);
  // Rotar 180 grados desde la rotación anterior para que mire hacia la flor (a su derecha)
  group.rotation.y = Math.PI / 2;
  group.scale.set(1.4, 1.4, 1.4); // Aumentar tamaño de la lámpara
  scene.add(group);

  return { group, light };
}

// Árbol Bonsái (Reacciona a la luz)
export function createBonsai(scene, xPos) {
  const group = new THREE.Group();
  
  // Materiales
  const potMat = createPlasticMaterial('#2C3033', 0.95, 0.0); // Gris marengo
  const trunkMat = createPlasticMaterial('#8B5A2B', 0.95, 0.0); // Marrón tierra
  // Instanciado independientemente para poder mutar su color
  const foliageMat = createPlasticMaterial('#BDB76B', 0.95, 0.0); // Ocre enfermizo inicial

  // --- Maceta (Octogonal baja) ---
  const potRadius = 0.18;
  const potProfile = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (i === 0) potProfile.moveTo(Math.cos(a) * potRadius, Math.sin(a) * potRadius);
    else potProfile.lineTo(Math.cos(a) * potRadius, Math.sin(a) * potRadius);
  }
  
  const extrudeSettings = {
    depth: 0.1,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015
  };
  const potGeo = new THREE.ExtrudeGeometry(potProfile, extrudeSettings);
  potGeo.rotateX(Math.PI / 2); // Depth crece ahora en el eje Y hacia abajo
  potGeo.translate(0, 0.1, 0); // Lo subimos para que apoye en y=0
  
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.castShadow = true;
  group.add(pot);

  // Tierra en la maceta
  const soilGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.11, 8);
  const soilMat = createPlasticMaterial('#1a1105'); // Tierra muy oscura
  const soil = new THREE.Mesh(soilGeo, soilMat);
  soil.position.y = 0.05;
  group.add(soil);

  // --- Tronco (Forma de S retorcida) ---
  const curvePoints = [
    new THREE.Vector3(0, 0.1, 0),       // Base
    new THREE.Vector3(0.06, 0.25, 0.03), // Curva derecha
    new THREE.Vector3(-0.06, 0.4, -0.03),// Curva izquierda
    new THREE.Vector3(0.08, 0.55, 0.05) // Cúspide
  ];
  const trunkCurve = new THREE.CatmullRomCurve3(curvePoints);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 24, 0.025, 8, false);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.castShadow = true;
  group.add(trunk);

  // Base del tronco más ancha
  const trunkBaseGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
  const trunkBase = new THREE.Mesh(trunkBaseGeo, trunkMat);
  trunkBase.position.y = 0.15;
  group.add(trunkBase);

  // --- Follaje (Nubes de hojas) ---
  const foliageGroup = new THREE.Group();
  const cloudGeo = new THREE.SphereGeometry(0.1, 16, 16);
  
  // Nube 1 (Cúspide)
  const cloud1 = new THREE.Mesh(cloudGeo, foliageMat);
  cloud1.position.set(0.08, 0.55, 0.05);
  cloud1.scale.set(1.5, 0.8, 1.2);
  cloud1.castShadow = true;
  foliageGroup.add(cloud1);

  // Nube 2 (Izquierda)
  const cloud2 = new THREE.Mesh(cloudGeo, foliageMat);
  cloud2.position.set(-0.12, 0.4, -0.05);
  cloud2.scale.set(1.2, 0.7, 1.0);
  cloud2.castShadow = true;
  foliageGroup.add(cloud2);

  // Nube 3 (Derecha baja)
  const cloud3 = new THREE.Mesh(cloudGeo, foliageMat);
  cloud3.position.set(0.12, 0.3, 0.05);
  cloud3.scale.set(1.0, 0.6, 1.0);
  cloud3.castShadow = true;
  foliageGroup.add(cloud3);

  // Nube 4 (Frente)
  const cloud4 = new THREE.Mesh(cloudGeo, foliageMat);
  cloud4.position.set(0.05, 0.45, 0.12);
  cloud4.scale.set(1.0, 0.7, 1.0);
  cloud4.castShadow = true;
  foliageGroup.add(cloud4);

  group.add(foliageGroup);

  group.position.set(xPos, 0, -1.8); // Desplazado hacia atrás
  // Rotarlo un poco para que se vea su perfil en S
  group.rotation.y = -Math.PI / 6;
  group.scale.set(1.8, 1.8, 1.8); // Aumentar tamaño del bonsái considerablemente
  scene.add(group);

  return { group, foliageMat };
}

// Ventilador (Rediseñado - Clásico de escritorio con jaula retro)
export function createFan(scene, xPos) {
  const group = new THREE.Group();
  
  // Colores y Materiales según especificación
  const bodyMat = createPlasticMaterial('#A8E6CF', 0.95, 0.0); // Verde menta suave / pastel retro
  const bladeMat = createPlasticMaterial('#FDFFFC', 0.95, 0.0); // Blanco hueso
  const buttonMat = createPlasticMaterial('#ECC94B', 0.95, 0.0); // Mostaza mate

  // --- Base ---
  // Cúpula muy baja y gruesa con bordes biselados
  const baseProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.25, 0),
    new THREE.Vector2(0.28, 0.02),
    new THREE.Vector2(0.28, 0.06),
    new THREE.Vector2(0.2, 0.12),
    new THREE.Vector2(0, 0.12)
  ];
  const baseGeo = new THREE.LatheGeometry(baseProfile, 32);
  const base = new THREE.Mesh(baseGeo, bodyMat);
  base.position.y = 0; // Apoyado sobre la mesa
  base.castShadow = true;
  group.add(base);

  // --- Botón/Dial Lateral ---
  // Cilíndrico exagerado para parecer de juguete
  const buttonGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.04, 24);
  const button = new THREE.Mesh(buttonGeo, buttonMat);
  button.rotation.x = Math.PI / 2;
  button.position.set(0.18, 0.06, 0.18); // Lateral derecho-frontal
  button.castShadow = true;
  group.add(button);

  // --- Soporte (Cuello) ---
  const neckGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.35, 24);
  const neck = new THREE.Mesh(neckGeo, bodyMat);
  neck.position.y = 0.25;
  neck.castShadow = true;
  group.add(neck);

  // --- Carcasa del Motor ---
  const motorGroup = new THREE.Group();
  motorGroup.position.set(0, 0.45, -0.05); // Ligeramente retrasado en Z

  // Semiesfera trasera
  const motorGeo = new THREE.SphereGeometry(0.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  motorGeo.rotateX(-Math.PI / 2); // Apuntar hacia atrás (-Z)
  const motor = new THREE.Mesh(motorGeo, bodyMat);
  motor.castShadow = true;
  motorGroup.add(motor);

  // Cilindro central para alargar la carcasa
  const motorCylGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.12, 32);
  motorCylGeo.rotateX(Math.PI / 2);
  const motorCyl = new THREE.Mesh(motorCylGeo, bodyMat);
  motorCyl.position.set(0, 0, 0.06); 
  motorCyl.castShadow = true;
  motorGroup.add(motorCyl);

  group.add(motorGroup);

  // --- Jaula Protectora (Estética "Plastilina") ---
  const cageGroup = new THREE.Group();
  cageGroup.position.set(0, 0.45, 0.05); // Centro geométrico de la jaula

  const rCage = 0.42; // Radio aumentado para evitar clipping
  const tCage = 0.015; // Grosor de los "churros"

  // Aro central (el más ancho)
  const ringMidGeo = new THREE.TorusGeometry(rCage, tCage, 16, 32);
  const ringMid = new THREE.Mesh(ringMidGeo, bodyMat);
  ringMid.position.z = 0.08;
  ringMid.castShadow = true;
  cageGroup.add(ringMid);

  // Aro frontal (cerrando la cúpula)
  const ringFrontGeo = new THREE.TorusGeometry(rCage * 0.8, tCage, 16, 32);
  const ringFront = new THREE.Mesh(ringFrontGeo, bodyMat);
  ringFront.position.z = 0.18;
  ringFront.castShadow = true;
  cageGroup.add(ringFront);

  // Aro trasero
  const ringBackGeo = new THREE.TorusGeometry(rCage * 0.9, tCage, 16, 32);
  const ringBack = new THREE.Mesh(ringBackGeo, bodyMat);
  ringBack.position.z = -0.05;
  ringBack.castShadow = true;
  cageGroup.add(ringBack);

  // Tapa central frontal (donde se unen los radios por delante, proyectada hacia adelante)
  const frontCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.02, 24);
  frontCapGeo.rotateX(Math.PI / 2);
  const frontCap = new THREE.Mesh(frontCapGeo, bodyMat);
  frontCap.position.z = 0.28;
  frontCap.castShadow = true;
  cageGroup.add(frontCap);

  // Radios curvos gruesos formando la "cúpula" hueca profunda
  const numSpokes = 8;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i / numSpokes) * Math.PI * 2;
    const curvePoints = [
      new THREE.Vector3(0, 0, -0.15), // Atrás en la carcasa
      new THREE.Vector3(Math.cos(angle) * rCage * 0.9, Math.sin(angle) * rCage * 0.9, -0.05), // Pasa por el aro trasero
      new THREE.Vector3(Math.cos(angle) * rCage, Math.sin(angle) * rCage, 0.08),  // Pasa por el aro central
      new THREE.Vector3(Math.cos(angle) * rCage * 0.8, Math.sin(angle) * rCage * 0.8, 0.18), // Pasa por el aro frontal
      new THREE.Vector3(Math.cos(angle) * 0.05, Math.sin(angle) * 0.05, 0.28)     // Conecta a la tapa frontal lejana
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const spokeGeo = new THREE.TubeGeometry(curve, 16, tCage, 8, false);
    const spoke = new THREE.Mesh(spokeGeo, bodyMat);
    spoke.castShadow = true;
    cageGroup.add(spoke);
  }

  group.add(cageGroup);

  // --- Grupo Rotatorio (Rotor y Aspas) ---
  const rotorGroup = new THREE.Group();
  // Retrasamos el buje ligeramente hacia atrás (Z = -0.02) para dar mucho más margen de seguridad
  rotorGroup.position.set(0, 0.45, -0.02); 

  // Buje central (esférico blanco)
  const hubGeo = new THREE.SphereGeometry(0.08, 24, 24);
  const hub = new THREE.Mesh(hubGeo, bladeMat);
  rotorGroup.add(hub);

  // 3 Aspas tipo pala/pétalo en color hueso
  const bladeProfile = new THREE.Shape();
  bladeProfile.moveTo(0, 0);
  bladeProfile.quadraticCurveTo(0.12, 0.08, 0.14, 0.18); // Anchas en el medio
  bladeProfile.quadraticCurveTo(0.1, 0.3, 0, 0.32);      // Punta muy redondeada
  bladeProfile.quadraticCurveTo(-0.1, 0.3, -0.14, 0.18);
  bladeProfile.quadraticCurveTo(-0.12, 0.08, 0, 0);

  const extrudeSettings = {
    depth: 0.02,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.015,
    bevelThickness: 0.015
  };
  const bladeGeo = new THREE.ExtrudeGeometry(bladeProfile, extrudeSettings);
  bladeGeo.translate(0, 0, -0.01); // Centrar grosor
  bladeGeo.rotateX(Math.PI / 6);   // Inclinación aerodinámica

  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.rotation.z = -angle;
    blade.castShadow = true;
    rotorGroup.add(blade);
  }

  group.add(rotorGroup);

  // Cable (Tubo grueso conectando al interruptor derecho)
  const cableMat = createPlasticMaterial('#2C3E50', 1.0, 0.0); // Gris muy oscuro mate
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.03, -0.2),      // Origen profundo en la base del ventilador
    new THREE.Vector3(0.1, 0.01, -0.3),    // Baja a la mesa y se abre
    new THREE.Vector3(0.4, 0.01, 0.1),     // Serpea hacia la izquierda
    new THREE.Vector3(0.9, 0.01, -0.2),    // Serpea hacia la derecha
    new THREE.Vector3(1.2, 0.01, 0.4),     // Se aproxima al interruptor
    new THREE.Vector3(1.538, 0.04, 0.769)  // Se inserta bajo el interruptor derecho (escala 1.3)
  ]);
  const cableGeo = new THREE.TubeGeometry(cableCurve, 32, 0.025, 8, false);
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.castShadow = true;
  group.add(cable);

  // Rotar el ventilador 90 grados a la izquierda para mirar a la vela
  group.rotation.y = -Math.PI / 2;
  group.position.set(xPos, 0, -1.8);
  group.scale.set(1.3, 1.3, 1.3); // Aumentar tamaño del ventilador
  scene.add(group);

  return { group, rotorGroup };
}

// Vela (Rediseñada - Candelabro Clásico Plástico)
export function createCandle(scene, xPos) {
  const group = new THREE.Group();
  
  // Colores y Materiales
  const holderMat = createPlasticMaterial('#505A66', 0.95, 0.0); // Gris pizarra mate
  const waxMat = createPlasticMaterial('#FCEBCC', 0.95, 0.0);    // Vainilla crema
  const wickMat = createPlasticMaterial('#3B3C36', 0.95, 0.0);   // Gris oscuro
  const flameMat = new THREE.MeshStandardMaterial({
    color: '#FFAA00',
    emissive: '#FF8800',
    emissiveIntensity: 0.8,
    roughness: 1.0,
    metalness: 0.0,
  });

  // --- Candelabro ---
  // 1. Platillo Base (Saucer) reducido considerablemente
  const saucerProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.21, 0),     // Suelo ancho
    new THREE.Vector2(0.24, 0.02),  // Borde exterior curvado
    new THREE.Vector2(0.24, 0.06),  // Borde alto
    new THREE.Vector2(0.21, 0.08),  // Cúspide gruesa del borde
    new THREE.Vector2(0.18, 0.06),  // Caída interior
    new THREE.Vector2(0.12, 0.03),  // Suelo interior conectando con el cuello
    new THREE.Vector2(0, 0.03)      // Centro
  ];
  const saucerGeo = new THREE.LatheGeometry(saucerProfile, 32);
  const saucer = new THREE.Mesh(saucerGeo, holderMat);
  saucer.castShadow = true;
  group.add(saucer);

  // 2. Asa (Handle tipo dónut grueso) reajustada a la nueva base
  const handleGeo = new THREE.TorusGeometry(0.08, 0.035, 16, 32);
  const handle = new THREE.Mesh(handleGeo, holderMat);
  handle.position.set(0.28, 0.07, 0); // Sale lateralmente a la derecha pegada al nuevo borde
  handle.castShadow = true;
  group.add(handle);

  // Apoya-dedo en el asa (Thumb rest)
  const thumbGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 16);
  const thumbRest = new THREE.Mesh(thumbGeo, holderMat);
  thumbRest.position.set(0.28, 0.15, 0); // Tope superior del asa
  thumbRest.castShadow = true;
  group.add(thumbRest);

  // 3. Cuello y Copa (Holder)
  const neckProfile = [
    new THREE.Vector2(0, 0.03),     // Nace del platillo
    new THREE.Vector2(0.12, 0.03),  // Base del cuello
    new THREE.Vector2(0.08, 0.1),   // Estrechamiento curvilíneo
    new THREE.Vector2(0.13, 0.16),  // Ensanche inferior de la copa
    new THREE.Vector2(0.14, 0.22),  // Borde superior de la copa
    new THREE.Vector2(0.12, 0.22),  // Grosor del labio superior
    new THREE.Vector2(0, 0.2)       // Fondo de la copa
  ];
  const neckGeo = new THREE.LatheGeometry(neckProfile, 32);
  const neck = new THREE.Mesh(neckGeo, holderMat);
  neck.castShadow = true;
  group.add(neck);


  // --- Vela ---
  const r = 0.11;
  const h = 0.22; // Altura de la cera visible
  const candleProfile = [
    new THREE.Vector2(0, 0.18),      // Empotrado en la copa
    new THREE.Vector2(r, 0.18),      
    new THREE.Vector2(r, 0.18 + h - 0.02), // Borde superior redondeado
    new THREE.Vector2(r - 0.02, 0.18 + h), // Cúspide del cráter
    new THREE.Vector2(r - 0.05, 0.18 + h - 0.02), // Descenso del cráter
    new THREE.Vector2(0, 0.18 + h - 0.04)  // Centro hundido
  ];
  const candleGeo = new THREE.LatheGeometry(candleProfile, 32);
  const candle = new THREE.Mesh(candleGeo, waxMat);
  candle.castShadow = true;
  group.add(candle);

  // --- Gotas de cera derretida (Pegotes) ---
  // Pegote 1: Escurriendo por la copa izquierda y cayendo al platillo
  const drop1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.08, 16, 16), waxMat);
  drop1.position.set(-0.11, 0.32, 0); // Lado de la vela
  drop1.castShadow = true;
  group.add(drop1);

  const drop2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.06, 16, 16), waxMat);
  drop2.position.set(-0.13, 0.23, 0); // Lado de la copa del candelabro
  drop2.rotation.z = Math.PI / 10;
  drop2.castShadow = true;
  group.add(drop2);

  const drop3 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), waxMat);
  drop3.scale.set(1.2, 0.5, 1.0);
  drop3.position.set(-0.16, 0.05, 0); // Charco espeso apoyado sobre el nuevo borde más estrecho
  drop3.castShadow = true;
  group.add(drop3);

  // Pegote 2: Gota gruesa al frente
  const drop4 = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 16, 16), waxMat);
  drop4.position.set(0.05, 0.34, 0.1); 
  drop4.castShadow = true;
  group.add(drop4);

  // --- Mecha (Wick) ---
  const topY = 0.18 + h - 0.04;
  const wickGeo = new THREE.CapsuleGeometry(0.012, 0.025, 16, 16);
  const wick = new THREE.Mesh(wickGeo, wickMat);
  wick.rotation.z = Math.PI / 8; // Inclinada
  wick.position.set(0, topY + 0.015, 0); 
  wick.castShadow = true;
  group.add(wick);

  // --- Llama (Flame) ---
  const flameProfile = [
    new THREE.Vector2(0, 0),         // Base exacta en y=0 (origen de escala)
    new THREE.Vector2(0.025, 0.01),  // Redondeo base
    new THREE.Vector2(0.035, 0.03),  // Anchura máxima
    new THREE.Vector2(0.025, 0.07),  // Cuello
    new THREE.Vector2(0.01, 0.10),   // Punta redondeada
    new THREE.Vector2(0, 0.12)       // Cúspide
  ];
  const flameGeo = new THREE.LatheGeometry(flameProfile, 32);
  const flame = new THREE.Mesh(flameGeo, flameMat);
  // Colocada apoyada directamente sobre la mecha
  flame.position.set(-0.01, topY + 0.025, 0); 
  group.add(flame);

  // --- Luz ---
  const light = new THREE.PointLight('#FFB800', 0.5, 3);
  light.position.set(0, topY + 0.08, 0); 
  group.add(light);

  group.position.set(xPos, 0, -1.4);
  group.scale.set(1.5, 1.5, 1.5); // Aumentar tamaño
  scene.add(group);

  return { group, flame, light };
}
