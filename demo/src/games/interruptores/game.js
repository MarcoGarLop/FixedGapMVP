import * as THREE from 'three';
import { createInterruptoresScene } from './scene.js';
import { createTable, createSwitch, createLamp, createBonsai, createFan, createCandle } from './objects.js';
import { WindParticles } from './particles.js';
import { HandTracker } from '../../tracking/HandTracker.js';
import { PinchDetector } from '../../tracking/PinchDetector.js';
import { PipSkeleton } from '../../tracking/pipSkeleton.js';
import { Hand3D } from '../../objects/hand3D.js';
import { createClinicalButton, removeClinicalButton, openClinicalView } from '../../clinical/clinicalView.js';
import { BiomarkerAccumulator } from '../../clinical/sessionMetrics.js';
import { recordGame } from '../../clinical/sessionRecorder.js';

export function startInterruptoresGame(container) {
  container.innerHTML = `
    <canvas id="interruptores-canvas"></canvas>
    <div id="pip">
      <video id="pip-video" autoplay playsinline muted width="960" height="720"></video>
      <canvas id="pip-skeleton"></canvas>
    </div>
    <div id="hud">
      <h3>Interruptores</h3>
      <div class="row"><span>Objetivo</span><span class="val" id="hud-target">Preparando...</span></div>
      <div class="row"><span>Completados</span><span class="val" id="hud-score">0 / 6</span></div>
    </div>
    <div id="stats"></div>
    <div id="modal-overlay">
      <div id="modal">
        <h2>¡Sesión completa!</h2>
        <p id="modal-time"></p>
        <button id="modal-btn">Siguiente juego</button>
      </div>
    </div>
  `;

  // --- Scene ---
  const canvas = document.getElementById('interruptores-canvas');
  const { renderer, scene, camera, ambient, key } = createInterruptoresScene(canvas);

  // --- Objects ---
  createTable(scene);

  const leftSwitch = createSwitch(scene, -1.5, 0.2); // Closer to front edge
  const lamp = createLamp(scene, -2.5);
  const bonsai = createBonsai(scene, -1.2); // Separado ligeramente de la lámpara

  const rightSwitch = createSwitch(scene, 1.5, 0.2); // Closer to front edge
  const fan = createFan(scene, 2.5);
  const candle = createCandle(scene, 1.0);

  // Partículas de viento
  const windPos = new THREE.Vector3(2.5, 0.5, -1.8);
  const wind = new WindParticles(scene, windPos, -1);

  const leftHand3D = new Hand3D(scene, 'vertical');
  const rightHand3D = new Hand3D(scene, 'vertical');

  // --- Tracking ---
  const leftPinchDetector = new PinchDetector();
  const rightPinchDetector = new PinchDetector();
  const pipSkeleton = new PipSkeleton();
  const handTracker = new HandTracker({ maxHands: 2 });

  // --- Biomarker capture (live) ---
  const biomarkers = new BiomarkerAccumulator('interruptores');
  let gameRecorded = false;
  let _prevWristL = null;
  let _prevWristR = null;

  let latestLeftHand = null;
  let latestRightHand = null;

  handTracker.onResults((landmarks, meta) => {
    latestLeftHand = null;
    latestRightHand = null;

    if (!landmarks || landmarks.length === 0) {
      leftHand3D.update([]);
      rightHand3D.update([]);
      leftPinchDetector.update([]);
      rightPinchDetector.update([]);
      return;
    }

    // Calcular la coordenada X 3D de cada mano para saber en qué lado de la pantalla están
    const handsWithX = landmarks.map(hand => {
      // Usamos el nudillo central (9) para estimar la posición
      const x = (1 - hand[9].x) * (5.5 - (-5.5)) + (-5.5);
      return { hand, x };
    });

    // Ordenar de izquierda a derecha (menor X a mayor X)
    handsWithX.sort((a, b) => a.x - b.x);

    if (handsWithX.length === 1) {
      if (handsWithX[0].x < 0) {
        latestLeftHand = handsWithX[0].hand;
      } else {
        latestRightHand = handsWithX[0].hand;
      }
    } else if (handsWithX.length >= 2) {
      latestLeftHand = handsWithX[0].hand;
      latestRightHand = handsWithX[1].hand;
    }

    if (latestLeftHand) {
      leftPinchDetector.update([latestLeftHand]);
      leftHand3D.update([latestLeftHand], leftPinchDetector.isPinching, leftPinchDetector.pinchType);
    } else {
      leftHand3D.update([]);
      leftPinchDetector.update([]);
    }

    if (latestRightHand) {
      rightPinchDetector.update([latestRightHand]);
      rightHand3D.update([latestRightHand], rightPinchDetector.isPinching, rightPinchDetector.pinchType);
    } else {
      rightHand3D.update([]);
      rightPinchDetector.update([]);
    }

    // Feed biomarkers with whichever hand is currently active.
    const activeHand = latestRightHand || latestLeftHand;
    biomarkers.update(activeHand ? [activeHand] : [], {});

    // C2: Bilateral asymmetry from wrist displacement between frames.
    if (latestLeftHand && latestRightHand) {
      if (_prevWristL && _prevWristR) {
        const dL = Math.sqrt(
          Math.pow((latestLeftHand[0].x - _prevWristL.x) * 960, 2) +
          Math.pow((latestLeftHand[0].y - _prevWristL.y) * 540, 2)
        );
        const dR = Math.sqrt(
          Math.pow((latestRightHand[0].x - _prevWristR.x) * 960, 2) +
          Math.pow((latestRightHand[0].y - _prevWristR.y) * 540, 2)
        );
        const maxD = Math.max(dL, dR);
        if (maxD > 1) {
          const ratio = Math.min(dL, dR) / (maxD + 0.001);
          const asymIdx = Math.round((1 - ratio) * 100);
          biomarkers._asymmetryReadings.push(asymIdx);
        }
      }
      _prevWristL = { x: latestLeftHand[0].x, y: latestLeftHand[0].y };
      _prevWristR = { x: latestRightHand[0].x, y: latestRightHand[0].y };
    }
  });

  handTracker.onRawResults((results) => {
    pipSkeleton.draw(results);
  });

  handTracker.start(document.getElementById('pip-video'));

  // --- Game State ---
  const state = {
    score: 0,
    maxScore: 6,
    startTime: Date.now(),
    modalShown: false,
    
    // target can be 'left' (flower) or 'right' (candle)
    target: 'none',
    
    // Switch states: 'idle', 'grabbed', 'activated'
    left: { state: 'idle', grabStartY: 0, startRot: Math.PI/6, prevPinching: false },
    right: { state: 'idle', grabStartY: 0, startRot: Math.PI/6, prevPinching: false },
    
    // Cinematic states
    lampOn: false,
    candleLit: true,
    fanSpeed: 0,
  };

  const MIN_ROT = Math.PI/6;
  const MAX_ROT = Math.PI/2.5;

  function resetRound() {
    state.left.state = 'idle';
    state.right.state = 'idle';

    // Randomize next target
    state.target = Math.random() > 0.5 ? 'left' : 'right';

    if (state.target === 'left') {
      document.getElementById('hud-target').textContent = 'Ilumina el bonsái (Izd)';
      document.getElementById('hud-target').style.color = '#ecc94b';
      ambient.intensity = 0.4;
      key.intensity = 0.6;
    } else {
      document.getElementById('hud-target').textContent = 'Apaga la vela (Der)';
      document.getElementById('hud-target').style.color = '#ed8936';
      state.candleLit = true;
      candle.flame.scale.set(1, 1, 1);
      ambient.intensity = 0.6;
      key.intensity = 0.8;
    }

    // B1: Mark stimulus onset for reaction time measurement
    biomarkers.markStimulus();
  }

  // Initial setup
  setTimeout(resetRound, 1000);

  // --- Logic ---
  const sickColor = new THREE.Color('#BDB76B'); // Ocre enfermizo
  const healthyColor = new THREE.Color('#32CD32'); // Verde vibrante
  const GRAB_RADIUS = 0.8; // Z distance tolerance for grab

  function gameUpdate(dt) {
    if (state.score >= state.maxScore) {
      if (!state.modalShown) {
        state.modalShown = true;
        showModal();
      }
      return;
    }

    // --- LÓGICA MANO IZQUIERDA ---
    if (latestLeftHand) {
      const nowPinchingL = leftPinchDetector.isPinching && leftPinchDetector.pinchType === 'middle';
      const pinchPosL = leftHand3D.getPinchWorldPos([latestLeftHand], leftPinchDetector.pinchType);

      if (nowPinchingL && !state.left.prevPinching && pinchPosL && state.left.state === 'idle') {
        const distLeft = new THREE.Vector2(pinchPosL.x - (-1.5), pinchPosL.y - 0.5).length();
        if (distLeft < GRAB_RADIUS) {
          state.left.state = 'grabbed';
          state.left.grabStartY = pinchPosL.y;
          state.left.startRot = leftSwitch.leverGroup.rotation.x;
        }
      }

      if (nowPinchingL && state.left.state === 'grabbed' && pinchPosL) {
        const deltaY = pinchPosL.y - state.left.grabStartY;
        const deltaRot = -(deltaY / 0.25) * (MAX_ROT - MIN_ROT);
        let newRot = state.left.startRot + deltaRot;
        if (newRot < MIN_ROT) newRot = MIN_ROT;
        if (newRot > MAX_ROT) {
          newRot = MAX_ROT;
          if (state.target === 'left') {
            state.left.state = 'activated';
            triggerEvent('left');
          }
        }
        leftSwitch.leverGroup.rotation.x = newRot;
      }

      if (!nowPinchingL && state.left.prevPinching && state.left.state === 'grabbed') {
        state.left.state = 'idle';
      }
      state.left.prevPinching = nowPinchingL;
    } else {
      state.left.prevPinching = false;
      if (state.left.state === 'grabbed') state.left.state = 'idle';
    }

    // --- LÓGICA MANO DERECHA ---
    if (latestRightHand) {
      const nowPinchingR = rightPinchDetector.isPinching && rightPinchDetector.pinchType === 'middle';
      const pinchPosR = rightHand3D.getPinchWorldPos([latestRightHand], rightPinchDetector.pinchType);

      if (nowPinchingR && !state.right.prevPinching && pinchPosR && state.right.state === 'idle') {
        const distRight = new THREE.Vector2(pinchPosR.x - 1.5, pinchPosR.y - 0.5).length();
        if (distRight < GRAB_RADIUS) {
          state.right.state = 'grabbed';
          state.right.grabStartY = pinchPosR.y;
          state.right.startRot = rightSwitch.leverGroup.rotation.x;
        }
      }

      if (nowPinchingR && state.right.state === 'grabbed' && pinchPosR) {
        const deltaY = pinchPosR.y - state.right.grabStartY;
        const deltaRot = -(deltaY / 0.25) * (MAX_ROT - MIN_ROT);
        let newRot = state.right.startRot + deltaRot;
        if (newRot < MIN_ROT) newRot = MIN_ROT;
        if (newRot > MAX_ROT) {
          newRot = MAX_ROT;
          if (state.target === 'right') {
            state.right.state = 'activated';
            triggerEvent('right');
          }
        }
        rightSwitch.leverGroup.rotation.x = newRot;
      }

      if (!nowPinchingR && state.right.prevPinching && state.right.state === 'grabbed') {
        state.right.state = 'idle';
      }
      state.right.prevPinching = nowPinchingR;
    } else {
      state.right.prevPinching = false;
      if (state.right.state === 'grabbed') state.right.state = 'idle';
    }

    // LERP ungrabbed idle switches back to top
    if (state.left.state === 'idle') {
      leftSwitch.leverGroup.rotation.x += (MIN_ROT - leftSwitch.leverGroup.rotation.x) * 10 * dt;
    }
    if (state.right.state === 'idle') {
      rightSwitch.leverGroup.rotation.x += (MIN_ROT - rightSwitch.leverGroup.rotation.x) * 10 * dt;
    }

    // --- Cinematic Animations ---
    if (state.lampOn) {
      lamp.light.intensity += (3 - lamp.light.intensity) * 5 * dt;
    } else {
      lamp.light.intensity += (0 - lamp.light.intensity) * 5 * dt;
    }

    // LERP del color del Bonsái
    const targetBonsaiColor = state.lampOn ? healthyColor : sickColor;
    bonsai.foliageMat.color.lerp(targetBonsaiColor, 2 * dt);

    if (!state.candleLit) {
      state.fanSpeed += (20 - state.fanSpeed) * 3 * dt; // Accelerate via LERP
      candle.flame.scale.lerp(new THREE.Vector3(0, 0, 0), 5 * dt);
      candle.light.intensity += (0 - candle.light.intensity) * 5 * dt;
    } else {
      state.fanSpeed += (0 - state.fanSpeed) * 3 * dt; // Decelerate via LERP
      // Flicker slightly when lit
      candle.light.intensity = 0.5 + Math.random() * 0.1;
    }

    // Apply rotation based on current fan speed
    fan.rotorGroup.rotation.z -= state.fanSpeed * dt;

    // Update particles (only when fan is active)
    wind.update(dt, !state.candleLit);

    document.getElementById('hud-score').textContent = `${state.score} / ${state.maxScore}`;
  }

  function triggerEvent(target) {
    if (target === 'left') {
      state.lampOn = !state.lampOn;
    } else if (target === 'right') {
      state.candleLit = false;
    }

    state.score++;
    biomarkers.markRepetition({ target, score: state.score });
    document.getElementById('hud-target').textContent = '¡Muy bien!';
    document.getElementById('hud-target').style.color = '#48bb78';

    // Wait a bit, then reset for next round
    if (state.score < state.maxScore) {
      setTimeout(resetRound, 3000);
    }
  }

  function showModal() {
    const elapsed = Date.now() - state.startTime;
    const secs = Math.floor(elapsed / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    document.getElementById('modal-time').textContent = `Tiempo total: ${m}:${s.toString().padStart(2, '0')}`;
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
      startInterruptoresGame(container);
    });
  });

  // --- Render loop ---
  let lastTime = performance.now();
  let animId = null;

  function frame() {
    animId = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    gameUpdate(dt);
    renderer.render(scene, camera);
  }

  frame();

  function cleanup() {
    if (!gameRecorded) {
      gameRecorded = true;
      biomarkers.setOutcome({ score: state.score, maxScore: state.maxScore });
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
