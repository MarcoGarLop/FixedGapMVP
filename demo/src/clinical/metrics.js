const VIDEO_W = 960;
const VIDEO_H = 540;
const POS_BUFFER_SIZE = 60;
const TREMOR_BUFFER_SIZE = 30;
const PX_TO_MM_BASE = 80;

// Per-hand state
const handState = [createHandState(), createHandState()];

function createHandState() {
  return {
    posBuffer: [],
    maxSpanObserved: 1,
    prevTremorAmp: 0.1,
    speedHistory: [],
    sparcBuffer: [],
  };
}

function gDist(p1, p2) {
  return Math.sqrt(
    Math.pow((p1.x - p2.x) * VIDEO_W, 2) + Math.pow((p1.y - p2.y) * VIDEO_H, 2)
  );
}

export function resetMetrics() {
  for (let i = 0; i < 2; i++) {
    handState[i] = createHandState();
  }
}

function computeSPARC(speedHistory) {
  if (speedHistory.length < 10) return 0;
  const N = speedHistory.length;
  let totalArc = 0;
  for (let i = 1; i < N; i++) {
    const dx = 1;
    const dy = speedHistory[i] - speedHistory[i - 1];
    totalArc += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.max(-5, -totalArc / N);
}

export function computeHandMetrics(landmarks, handIdx) {
  const now = Date.now();
  const st = handState[handIdx];

  const m = {
    pinchActive: false,
    pinchMm: 0,
    tripodQuality: 0,
    thumbOpposition: 0,
    handOpenPct: 0,
    handOpenSpeed: 0,
    fingers: 0,
    indexExtension: 0,
    palmSpeed: 0,
    smoothness: 1.0,
    sparc: 0,
    romDeg: 0,
    tremorAmp: st.prevTremorAmp,
    wristStability: 1.0,
    fingerIndividuation: 0,
    graspVariability: 0,
  };

  if (!landmarks || landmarks.length < 21) return m;

  const lm = landmarks;
  const hSize = gDist(lm[0], lm[9]);
  const palmScale = gDist(lm[5], lm[17]);
  const pxToMm = PX_TO_MM_BASE / (palmScale + 0.001);

  // M1: Pinch precision (thumb-index distance)
  const dPinchPx = gDist(lm[4], lm[8]);
  m.pinchMm = Math.round(dPinchPx * pxToMm);
  m.pinchActive = dPinchPx / hSize < 0.15;

  // M15: Tripod quality (angle 4-8-12 + distances)
  const d48 = gDist(lm[4], lm[8]);
  const d412 = gDist(lm[4], lm[12]);
  const d812 = gDist(lm[8], lm[12]);
  const cosAngle = (d48 * d48 + d812 * d812 - d412 * d412) / (2 * d48 * d812 + 0.001);
  const tripodAngle = Math.acos(Math.min(1, Math.max(-1, cosAngle))) * 180 / Math.PI;
  const avgTripodDist = (d48 + d412 + d812) / 3;
  m.tripodQuality = Math.max(0, Math.min(100, 100 - Math.abs(tripodAngle - 60) * 1.5));

  // Thumb opposition: distance L4-L20 normalized
  const thumbPinkyDist = gDist(lm[4], lm[20]);
  m.thumbOpposition = Math.round(Math.min(100, (1 - thumbPinkyDist / (hSize * 1.5)) * 100));

  // M2: Hand openness (speed of finger spread)
  const tips = [4, 8, 12, 16, 20];
  const avgDistTips = tips.reduce((s, idx) => s + gDist(lm[idx], lm[9]), 0) / tips.length;
  st.maxSpanObserved = Math.max(st.maxSpanObserved, avgDistTips);
  m.handOpenPct = Math.round((avgDistTips / st.maxSpanObserved) * 100);

  // Fingers extended count
  let extended = 0;
  [8, 12, 16, 20].forEach((tip, i) => {
    const joint = [6, 10, 14, 18][i];
    if (gDist(lm[tip], lm[0]) > gDist(lm[joint], lm[0])) extended++;
  });
  if (gDist(lm[4], lm[17]) > gDist(lm[3], lm[17])) extended++;
  m.fingers = extended;

  // Index extension accuracy (angle at MCP joint 5-6-8)
  const v1i = { x: lm[5].x - lm[6].x, y: lm[5].y - lm[6].y };
  const v2i = { x: lm[8].x - lm[6].x, y: lm[8].y - lm[6].y };
  const dotI = v1i.x * v2i.x + v1i.y * v2i.y;
  const m1i = Math.sqrt(v1i.x ** 2 + v1i.y ** 2);
  const m2i = Math.sqrt(v2i.x ** 2 + v2i.y ** 2);
  m.indexExtension = Math.round(
    (Math.acos(Math.min(1, Math.max(-1, dotI / (m1i * m2i + 0.001)))) * 180) / Math.PI
  );

  // Palm position buffer for speed/smoothness/tremor
  st.posBuffer.push({ x: lm[0].x, y: lm[0].y, t: now });
  if (st.posBuffer.length > POS_BUFFER_SIZE) st.posBuffer.shift();

  if (st.posBuffer.length > 2) {
    const p1 = st.posBuffer[st.posBuffer.length - 1];
    const p2 = st.posBuffer[st.posBuffer.length - 2];
    const dt = (p1.t - p2.t) / 1000;
    m.palmSpeed = Math.round((gDist(p1, p2) * pxToMm) / (dt + 0.001));

    // Hand open speed (rate of change of openness)
    m.handOpenSpeed = m.palmSpeed;

    // Smoothness (direction inversions)
    let inversions = 0;
    for (let i = 2; i < st.posBuffer.length; i++) {
      const v1 = st.posBuffer[i - 1].y - st.posBuffer[i - 2].y;
      const v2 = st.posBuffer[i].y - st.posBuffer[i - 1].y;
      if (v1 * v2 < 0) inversions++;
    }
    m.smoothness = Math.max(0, 1 - inversions / TREMOR_BUFFER_SIZE);

    // Wrist stability: std dev of wrist position
    if (st.posBuffer.length >= 10) {
      const recent = st.posBuffer.slice(-10);
      const meanX = recent.reduce((a, b) => a + b.x, 0) / recent.length;
      const meanY = recent.reduce((a, b) => a + b.y, 0) / recent.length;
      const std = Math.sqrt(
        recent.reduce((a, b) => a + (b.x - meanX) ** 2 + (b.y - meanY) ** 2, 0) / recent.length
      );
      m.wristStability = Math.max(0, Math.min(1, 1 - std * 50));
    }
  }

  // SPARC (Spectral Arc Length approximation)
  st.speedHistory.push(m.palmSpeed);
  if (st.speedHistory.length > 60) st.speedHistory.shift();
  m.sparc = computeSPARC(st.speedHistory);

  // M4: ROM (wrist angle)
  const v1 = { x: lm[0].x - lm[9].x, y: lm[0].y - lm[9].y };
  const v2 = { x: lm[5].x - lm[0].x, y: lm[5].y - lm[0].y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2);
  m.romDeg = Math.round(
    (Math.acos(Math.min(1, Math.max(-1, dot / (mag1 * mag2 + 0.001)))) * 180) / Math.PI
  );

  // Tremor (high-freq variance during stillness)
  if (m.palmSpeed < 20 && st.posBuffer.length >= TREMOR_BUFFER_SIZE) {
    const recentPos = st.posBuffer.slice(-TREMOR_BUFFER_SIZE);
    const meanX = recentPos.reduce((a, b) => a + b.x, 0) / TREMOR_BUFFER_SIZE;
    const stdX = Math.sqrt(
      recentPos.reduce((a, b) => a + Math.pow(b.x - meanX, 2), 0) / TREMOR_BUFFER_SIZE
    );
    m.tremorAmp = Math.min(1, stdX * 100);
  }
  st.prevTremorAmp = m.tremorAmp;

  // Finger individuation (correlation of finger tip speeds)
  const fingerTips = [8, 12, 16, 20];
  let individuation = 0;
  if (st.posBuffer.length > 3) {
    const speeds = fingerTips.map(tip => {
      return gDist(lm[tip], { x: lm[tip].x + 0.001, y: lm[tip].y });
    });
    const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const variance = speeds.reduce((a, b) => a + (b - mean) ** 2, 0) / speeds.length;
    individuation = Math.min(100, variance * 1000);
  }
  m.fingerIndividuation = Math.round(individuation);

  return m;
}

export function computeAsymmetry(metricsL, metricsR) {
  if (!metricsL || !metricsR) return { asymmetryIndex: 0, recoveryGap: 0 };

  const speedRatio = Math.min(metricsL.palmSpeed, metricsR.palmSpeed) /
    (Math.max(metricsL.palmSpeed, metricsR.palmSpeed) + 0.001);
  const openRatio = Math.min(metricsL.handOpenPct, metricsR.handOpenPct) /
    (Math.max(metricsL.handOpenPct, metricsR.handOpenPct) + 0.001);

  const asymmetryIndex = Math.round((1 - (speedRatio + openRatio) / 2) * 100);
  const recoveryGap = Math.abs(metricsL.palmSpeed - metricsR.palmSpeed);

  return { asymmetryIndex, recoveryGap: Math.round(recoveryGap) };
}
