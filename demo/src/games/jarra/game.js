import * as THREE from 'three';
import { createJarraScene } from './scene.js';
import { createPitcher, createPitcherLiquid, createGlass, createFaucet, createTable } from './objects.js';
import { WaterEngine } from './waterEngine.js';
import { HandTracker } from '../../tracking/HandTracker.js';
import { WristRotationDetector } from '../../tracking/WristRotationDetector.js';
import { PipSkeleton } from '../../tracking/pipSkeleton.js';
import { createClinicalButton, removeClinicalButton, openClinicalView } from '../../clinical/clinicalView.js';
import { BiomarkerAccumulator } from '../../clinical/sessionMetrics.js';
import { recordGame } from '../../clinical/sessionRecorder.js';

const LERP_FACTOR = 0.08;
const MAX_ANGULAR_VEL = 0.06;

export function startJarraGame(container) {
  container.innerHTML = `
    <canvas id="jarra-canvas"></canvas>
    <div id="pip">
      <video id="pip-video" autoplay playsinline muted width="960" height="720"></video>
      <canvas id="pip-skeleton"></canvas>
    </div>
    <div id="hud">
      <h3>Jarra de Agua</h3>
      <div class="row"><span>Ronda</span><span class="val" id="hud-round">1 / 3</span></div>
      <div class="row"><span>Jarra</span><span class="val" id="hud-jug">0%</span></div>
      <div class="row"><span>Vaso</span><span class="val" id="hud-glass">0%</span></div>
      <div class="row"><span>Derrames</span><span class="val" id="hud-spills">0</span></div>
    </div>
    <div id="stats"></div>
    <div id="phase-indicator"></div>
    <div id="modal-overlay">
      <div id="modal">
        <h2>¡Sesión completa!</h2>
        <p id="modal-rounds"></p>
        <p id="modal-spills"></p>
        <p id="modal-time"></p>
        <p id="modal-precision"></p>
        <button id="modal-btn">Siguiente juego</button>
      </div>
    </div>
  `;

  // --- Scene ---
  const canvas = document.getElementById('jarra-canvas');
  const { renderer, scene, camera } = createJarraScene(canvas);

  // --- Objects ---
  const pitcherGroup = createPitcher(scene);
  const liquid = createPitcherLiquid(pitcherGroup);
  const glasses = [];
  for (let i = 0; i < 6; i++) {
    glasses.push(createGlass(scene));
  }
  const faucet = createFaucet(scene);
  createTable(scene);

  // --- Particle system ---
  const particleGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const particleMat = new THREE.MeshStandardMaterial({ color: '#5bb8e8', roughness: 0.3, metalness: 0 });
  const particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, 300);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  particleMesh.count = 0;
  scene.add(particleMesh);
  const dummy = new THREE.Object3D();

  // --- Engine ---
  const engine = new WaterEngine();
  engine.startLevel();

  // --- Tracking ---
  const wristDetector = new WristRotationDetector();
  const pipSkeleton = new PipSkeleton();
  const handTracker = new HandTracker({ maxHands: 1 });

  // --- Biomarker capture (live) ---
  const biomarkers = new BiomarkerAccumulator('jarra');
  let gameRecorded = false;

  handTracker.onResults((landmarks) => {
    wristDetector.update(landmarks);
    biomarkers.update(landmarks, { wristRotationRad: wristDetector.pitcherRotation });
  });
  handTracker.onRawResults((results) => {
    pipSkeleton.draw(results);
  });
  handTracker.start(document.getElementById('pip-video'));

  // --- Smoothing ---
  let currentRotation = 0;
  let startTime = Date.now();
  let visualPitcherVolume = 0;
  let visualGlassVolume = 0;
  let prevRound = 1;
  let prevPhase = 'ready';

  function smoothVolumes(state, dt) {
    const lerpSpeed = 8.0;
    
    // Snap volume to 0 instantly when a new round starts to prevent the new empty glass from showing shrinking water
    if (state.phase === 'waiting' && state.glassVolume === 0 && visualGlassVolume > 0.5) {
      visualGlassVolume = 0;
    }

    visualPitcherVolume += (state.pitcherVolume - visualPitcherVolume) * lerpSpeed * dt;
    visualGlassVolume += (state.glassVolume - visualGlassVolume) * lerpSpeed * dt;
    
    // snap to 0 if very close to avoid persistent invisible planes
    if (visualPitcherVolume < 0.001) visualPitcherVolume = 0;
    if (visualGlassVolume < 0.001) visualGlassVolume = 0;
  }

  function smoothRotation() {
    const target = wristDetector.pitcherRotation;

    let diff = target - currentRotation;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    const clamped = Math.max(-MAX_ANGULAR_VEL, Math.min(MAX_ANGULAR_VEL, diff * LERP_FACTOR));
    currentRotation += clamped;

    while (currentRotation > Math.PI) currentRotation -= 2 * Math.PI;
    while (currentRotation < -Math.PI) currentRotation += 2 * Math.PI;
  }

  function updateScene(state) {
    // Pitcher rotation
    pitcherGroup.rotation.z = currentRotation;

    // Liquid inside pitcher - Simple visibility threshold
    if (visualPitcherVolume > 0.95) {
      liquid.mesh.visible = true;
    } else {
      liquid.mesh.visible = false;
    }

    // Tray grid glass logic
    const getGridCoords = (i) => {
      const coords = [
        { x: -0.75, z: 0 },     // 0: Activo (Bajo el grifo)
        { x: 0.5, z: 0 },       // 1: Col 1 Centro
        { x: 0.5, z: -0.35 },   // 2: Col 1 Fondo
        { x: 0.5, z: 0.35 },    // 3: Col 1 Frente
        { x: 0.9, z: 0 },       // 4: Col 2 Centro
        { x: 0.9, z: -0.35 },   // 5: Col 2 Fondo
        { x: 0.9, z: 0.35 }     // 6: Col 2 Frente
      ];
      return coords[i] || coords[0];
    };

    let progress = 0;
    if (state.phase === 'sliding') {
      progress = Math.min(1.0, -state.slideX / 4.0);
    }

    const currentRoundIndex = state.round - 1;

    for (let i = 0; i < glasses.length; i++) {
      const g = glasses[i];
      let targetX, targetZ;

      if (i < currentRoundIndex) {
        // Vasos de rondas anteriores (ya desaparecidos por la izquierda)
        targetX = -3.0; 
        targetZ = 0;
      } else if (i === currentRoundIndex) {
        // Vaso de la ronda actual
        const start = getGridCoords(0);
        if (state.phase === 'sliding') {
          // Desaparece por la izquierda
          targetX = start.x - (2.0 * progress);
          targetZ = start.z;
        } else {
          targetX = start.x;
          targetZ = start.z;
        }
      } else if (i === currentRoundIndex + 1 && state.phase === 'sliding') {
        // El vaso que le toca entrar vuela desde su hueco en la cuadrícula hasta el grifo
        const start = getGridCoords(i);
        const end = getGridCoords(0);
        targetX = start.x + (end.x - start.x) * progress;
        targetZ = start.z + (end.z - start.z) * progress;
      } else {
        // Los demás vasos esperan quietos en su hueco de la cuadrícula
        const pos = getGridCoords(i);
        targetX = pos.x;
        targetZ = pos.z;
      }
      
      g.group.position.x = targetX;
      g.group.position.z = targetZ;
      
      // Desaparición total si cruza el borde de la mesa
      g.group.visible = targetX > -2.0;

      // Handle water visibility and volume
      if (i === currentRoundIndex) {
        if (visualGlassVolume > 0.005) {
          g.waterMesh.visible = true;
          g.waterMesh.scale.y = visualGlassVolume;
        } else {
          g.waterMesh.visible = false;
        }
      } else if (i < currentRoundIndex) {
        g.waterMesh.visible = true;
        g.waterMesh.scale.y = 1.0; 
      } else {
        g.waterMesh.visible = false; 
      }
    }

    // Particles
    const particles = engine.getParticles();
    let count = 0;
    for (const p of particles) {
      if (!p.active) continue;
      dummy.position.set(p.x, p.y, 0);
      dummy.updateMatrix();
      particleMesh.setMatrixAt(count, dummy.matrix);
      count++;
    }
    particleMesh.count = count;
    if (count > 0) particleMesh.instanceMatrix.needsUpdate = true;
  }

  function updateHUD(state) {
    document.getElementById('hud-round').textContent = `${state.round} / ${state.totalRounds}`;
    document.getElementById('hud-jug').textContent = `${Math.round(state.pitcherVolume * 100)}%`;
    document.getElementById('hud-glass').textContent = `${Math.round(state.glassVolume * 100)}%`;
    document.getElementById('hud-spills').textContent = state.spillCount;
  }

  function updatePhaseIndicator(state) {
    const el = document.getElementById('phase-indicator');
    switch (state.phase) {
      case 'waiting':
        el.textContent = `Preparando... ${Math.ceil(state.waitTimer)}`;
        el.style.color = '#e8a838';
        break;
      case 'filling':
        el.textContent = 'Llenando jarra...';
        el.style.color = '#5bb8e8';
        break;
      case 'pouring':
        el.textContent = 'Gira la muñeca para verter agua en el vaso';
        el.style.color = '#6bab7d';
        break;
      case 'sliding':
        el.textContent = 'Siguiente ronda...';
        el.style.color = '#8a7d6d';
        break;
      default:
        el.textContent = '';
    }
  }

  function showModal() {
    const elapsed = Date.now() - startTime;
    const secs = Math.floor(elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const state = engine.getState();
    const precision = Math.max(0, 100 - state.spillCount * 5);

    document.getElementById('modal-rounds').textContent = `Rondas: ${state.totalRounds}`;
    document.getElementById('modal-spills').textContent = `Derrames: ${state.spillCount}`;
    document.getElementById('modal-time').textContent = `Tiempo: ${m}:${s.toString().padStart(2, '0')}`;
    document.getElementById('modal-precision').textContent = `Precisión: ${precision}%`;
    document.getElementById('modal-overlay').classList.add('visible');
  }

  document.getElementById('modal-btn').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('demo:next'));
  });

  // --- Clinical View Button ---
  const clinicalBtn = createClinicalButton();
  let clinicalCleanup = null;

  clinicalBtn.addEventListener('click', () => {
    if (animId) cancelAnimationFrame(animId);
    handTracker.stop();
    clinicalCleanup = openClinicalView(container, () => {
      clinicalCleanup = null;
      startJarraGame(container);
    });
  });

  // --- Render loop ---
  let lastTime = performance.now();
  const fpsBuf = [];
  let animId = null;
  let modalShown = false;

  function frame() {
    animId = requestAnimationFrame(frame);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    fpsBuf.push(dt);
    if (fpsBuf.length > 60) fpsBuf.shift();
    const fps = Math.round(1 / (fpsBuf.reduce((a, b) => a + b, 0) / fpsBuf.length));
    document.getElementById('stats').textContent = `${fps} FPS | CV: ${handTracker.getFPS()}`;

    smoothRotation();
    engine.update(currentRotation, dt);

    const state = engine.getState();
    smoothVolumes(state, dt);
    updateScene(state);
    updateHUD(state);
    updatePhaseIndicator(state);

    // B1: Mark stimulus when pouring phase begins (pitcher full, player must act)
    if (state.phase === 'pouring' && prevPhase !== 'pouring') {
      biomarkers.markStimulus();
    }
    prevPhase = state.phase;

    // Mark repetition when a new round begins (round counter advances)
    if (state.round > prevRound) {
      biomarkers.markRepetition({ round: prevRound, spills: state.spillCount });
      prevRound = state.round;
    }

    if (state.phase === 'success' && !modalShown) {
      biomarkers.markRepetition({ round: state.round, spills: state.spillCount });
      modalShown = true;
      showModal();
    }

    renderer.render(scene, camera);
  }

  frame();

  function cleanup() {
    if (!gameRecorded) {
      gameRecorded = true;
      const st = engine.getState();
      biomarkers.setOutcome({
        spills: st.spillCount,
        rounds: st.totalRounds,
        avgPourMs: (Date.now() - startTime) / Math.max(1, st.totalRounds),
      });
      recordGame(biomarkers.finalize(), biomarkers);
    }
    handTracker.stop();
    if (animId) cancelAnimationFrame(animId);
    renderer.dispose();
    removeClinicalButton();
    if (clinicalCleanup) clinicalCleanup();
  }

  return cleanup;
}
