import * as THREE from 'three';

export function createInterruptoresScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e4db'); 
  scene.fog = new THREE.Fog('#e8e4db', 6, 15);

  // Camera looking slightly down at the table, moved backwards
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 3.5, 6.5);
  camera.lookAt(0, 0, -1.0);

  // Soft ambient light
  const ambient = new THREE.AmbientLight('#fff5e6', 0.6);
  scene.add(ambient);

  // Directional key light
  const key = new THREE.DirectionalLight('#fff0d4', 0.8);
  key.position.set(2, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 15;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0005;
  scene.add(key);

  // Fill light
  const fill = new THREE.DirectionalLight('#dbe5ff', 0.3);
  fill.position.set(-3, 4, 1);
  scene.add(fill);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera, ambient, key };
}
