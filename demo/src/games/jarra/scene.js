import * as THREE from 'three';

export function createJarraScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4ede4');
  scene.fog = new THREE.Fog('#f4ede4', 8, 18);

  // Camera: elevated to look down into the pitcher
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 50);
  camera.position.set(0, 1.8, 5.5);
  camera.lookAt(0, 0.2, 0);

  // Soft ambient
  const ambient = new THREE.AmbientLight('#fffaf0', 0.65);
  scene.add(ambient);

  // Key light: warm, from upper right
  const key = new THREE.DirectionalLight('#fff8f0', 0.9);
  key.position.set(3, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 20;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.radius = 3;
  key.shadow.bias = -0.0003;
  scene.add(key);

  // Fill light from left
  const fill = new THREE.DirectionalLight('#e8e0ff', 0.3);
  fill.position.set(-4, 5, 2);
  scene.add(fill);

  // Rim light from behind
  const rim = new THREE.DirectionalLight('#ffd4a8', 0.2);
  rim.position.set(0, 2, -5);
  scene.add(rim);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}
