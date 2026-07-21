// Per-session biomarker accumulator with repetition segmentation.
// Runs live during gameplay on the SAME MediaPipe landmarks the game receives,
// reusing computeHandMetrics() from metrics.js. On finalize() it produces the
// exact `metrics` object shape the clinical dashboard expects for each game,
// PLUS a `repetitions` array with per-repetition breakdown.
//
// Games call markRepetition(outcome) at each discrete action:
//   pastillero    -> each pill placed/dropped
//   interruptores -> each switch activated
//   jarra         -> each pour round completed
//
// Dashboard game keys (internal):
//   pastillero    -> "slingshot"  { maxPinchOpen, maxPullDistance, pullTremor, accuracyRatio, totalShots }
//   interruptores -> "flappy"     { maxExtension, maxFlexion, activationCount, fatigueIndex, smoothnessJerk }
//   jarra         -> "water"      { maxSupination, maxPronation, smoothnessJerk, waterAccuracy, poisonError, averagePouringTime }

import { computeHandMetrics, resetMetrics, computeSPARCFromProfile } from './metrics.js';

const MAX_FRAMES = 18000; // ~10 min at 30fps

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function stddev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
}
function cv(a) {
  const m = mean(a);
  return m > 0 ? stddev(a) / m : 0;
}
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = clamp(Math.round((p / 100) * (sorted.length - 1)), 0, sorted.length - 1);
  return sorted[idx];
}

export class BiomarkerAccumulator {
  constructor(gameKey) {
    this.gameKey = gameKey; // 'pastillero' | 'jarra' | 'interruptores'
    resetMetrics();
    this.start = Date.now();

    this.frames = 0;
    this._totalFramesAttempted = 0;
    this.handOpen = [];
    this.handOpeningSpeed = [];
    this.indexExt = [];
    this.tremor = [];
    this.smooth = [];
    this.speed = [];
    this.romDeg = [];

    // wrist rotation (jarra)
    this.supDeg = [];
    this.pronDeg = [];
    this.rotSmooth = [];
    this.prevRot = null;

    // Per-frame metrics for DB columns (accumulated here, aggregated in metricsTransform)
    this.tripodQualities = [];
    this.thumbOppositions = [];
    this.fingersExtended = [];
    this.fingerIndividuations = [];
    this.romNorms = [];
    this.tremorFreqs = [];
    this.intentionTremors = [];
    this.pinchDistances = [];

    // activity counter (interruptores)
    this.pinchRises = 0;
    this.prevPinch = false;

    // --- Repetition segmentation ---
    this._repStart = Date.now();
    this._repFrameStart = 0;
    this._repetitions = [];

    // --- B1: Reaction time ---
    this._stimulusTime = null;
    this._reactionTimes = [];
    this._waitingForReaction = false;
    this._baselineSpeed = 0;

    // --- C2: Bilateral asymmetry ---
    this._asymmetryReadings = [];

    // --- B3: BVE (endpoint positions for spatial dispersion) ---
    this._endpoints = [];

    // --- B5: Grip aperture at each grasp event ---
    this._gripApertures = [];

    // Latest pinchMm for external queries (B5 grip aperture at grab onset)
    this._lastPinchMm = 0;

    this.outcome = {};
  }

  update(landmarks, extra = {}) {
    try {
      const lms = landmarks && landmarks[0];
      if (lms) {
        this._totalFramesAttempted++;
        const confidence = extra.confidence ?? 1.0;
        const m = computeHandMetrics(lms, 0, confidence);

        // Skip low-quality frames for metric accumulation
        if (!m.qualityOk) return;

        this.frames++;
        if (this.speed.length >= MAX_FRAMES) {
          this.handOpen.shift();
          this.handOpeningSpeed.shift();
          this.indexExt.shift();
          this.tremor.shift();
          this.smooth.shift();
          this.speed.shift();
          this.romDeg.shift();
          this.tripodQualities.shift();
          this.thumbOppositions.shift();
          this.fingersExtended.shift();
          this.fingerIndividuations.shift();
          this.romNorms.shift();
        }
        this.handOpen.push(m.handOpenPct);
        this.handOpeningSpeed.push(m.handOpeningSpeed);
        this.indexExt.push(m.indexExtension);
        this.tremor.push(m.tremorAmp);
        this.smooth.push(m.smoothness);
        this.speed.push({ t: Date.now() - this.start, v: m.palmSpeed });
        this.romDeg.push(m.romDeg);
        this.tripodQualities.push(m.tripodQuality);
        this.thumbOppositions.push(m.thumbOpposition);
        this.fingersExtended.push(m.fingers);
        this.fingerIndividuations.push(m.fingerIndividuation);
        this.romNorms.push(m.romNorm);
        if (m.tremorFreqHz > 0) this.tremorFreqs.push(m.tremorFreqHz);
        if (m.intentionTremor > 0) this.intentionTremors.push(m.intentionTremor);

        if (m.pinchActive && !this.prevPinch) {
          this.pinchRises++;
          this.pinchDistances.push(m.pinchMm);
        }
        this.prevPinch = m.pinchActive;
        this._lastPinchMm = m.pinchMm || 0;

        // B1: Detect movement onset after stimulus
        if (this._waitingForReaction && m.palmSpeed > this._baselineSpeed + 15) {
          const rt = Date.now() - this._stimulusTime;
          if (rt >= 120 && rt < 3000) {
            this._reactionTimes.push(rt);
          }
          this._waitingForReaction = false;
        }
      }

      // C2: Record asymmetry if two hands are provided
      if (extra.asymmetry && typeof extra.asymmetry.asymmetryIndex === 'number') {
        this._asymmetryReadings.push(extra.asymmetry.asymmetryIndex);
      }

      if (typeof extra.wristRotationRad === 'number') {
        const deg = (extra.wristRotationRad * 180) / Math.PI;
        if (deg > 0.5) this.supDeg.push(deg);
        if (deg < -0.5) this.pronDeg.push(-deg);
        if (this.prevRot !== null) this.rotSmooth.push(Math.abs(deg - this.prevRot));
        this.prevRot = deg;
      }
    } catch (e) {
      console.warn('[biomarkers] update error', e);
    }
  }

  // B1: Call when a stimulus appears (target shown, pill becomes grabbable, etc.)
  // The accumulator will measure time until movement onset (palmSpeed rise).
  markStimulus() {
    this._stimulusTime = Date.now();
    this._waitingForReaction = true;
    const recent = this.speed.slice(-5).map(s => s.v);
    this._baselineSpeed = recent.length ? mean(recent) : 0;
  }

  // B3: Record endpoint position when patient drops/places an object.
  // targetPos: {x, z} of the intended target. dropPos: {x, z} of actual drop.
  recordEndpoint(dropPos, targetPos) {
    if (dropPos && targetPos) {
      const dx = dropPos.x - targetPos.x;
      const dz = dropPos.z - targetPos.z;
      this._endpoints.push({ dx, dz, error: Math.sqrt(dx * dx + dz * dz) });
    }
  }

  // B5: Record pinch aperture at the moment of a grasp event.
  recordGripAperture(pinchMm) {
    if (typeof pinchMm === 'number' && pinchMm > 0) {
      this._gripApertures.push(pinchMm);
    }
  }

  // Call at each discrete game event (pill placed, switch triggered, pour completed).
  // outcome: optional object with event-specific data (e.g. { success: true })
  markRepetition(outcome = {}) {
    const now = Date.now();
    const durationMs = now - this._repStart;
    const frameSlice = this.speed.slice(this._repFrameStart);
    const speedValues = frameSlice.map(s => s.v);

    // B4: Time-to-peak velocity ratio (how early in the movement peak occurs)
    let peakVelocityRatio = null;
    if (speedValues.length >= 3 && durationMs > 0) {
      let peakIdx = 0;
      let peakVal = 0;
      for (let i = 0; i < speedValues.length; i++) {
        if (speedValues[i] > peakVal) { peakVal = speedValues[i]; peakIdx = i; }
      }
      peakVelocityRatio = peakIdx / (speedValues.length - 1);
    }

    // C5: Per-repetition SPARC (real spectral arc length for this gesture)
    const repSparc = speedValues.length >= 10
      ? Math.round(computeSPARCFromProfile(speedValues) * 1000) / 1000
      : null;

    const rep = {
      index: this._repetitions.length,
      durationMs,
      peakVelocity: speedValues.length ? Math.max(...speedValues) : 0,
      meanVelocity: mean(speedValues),
      peakVelocityRatio,
      sparc: repSparc,
      smoothness: mean(this.smooth.slice(this._repFrameStart)),
      romDeg: percentile(this.romDeg.slice(this._repFrameStart), 90),
      reactionTimeMs: this._reactionTimes.length > this._repetitions.length
        ? this._reactionTimes[this._repetitions.length]
        : null,
      ...outcome,
    };

    this._repetitions.push(rep);
    this._repStart = now;
    this._repFrameStart = this.frames;
  }

  setOutcome(o) { Object.assign(this.outcome, o); }

  _fatigueIndex() {
    const reps = this._repetitions;
    if (reps.length < 6) return 0;
    const n = Math.min(3, Math.floor(reps.length / 2));
    const firstPeaks = reps.slice(0, n).map(r => r.peakVelocity);
    const lastPeaks = reps.slice(-n).map(r => r.peakVelocity);
    const f = mean(firstPeaks);
    const l = mean(lastPeaks);
    if (!f || f <= 0) return 0;
    const change = ((l - f) / f) * 100;
    return clamp(change, -30, 30);
  }

  _computeRepetitionStats() {
    const reps = this._repetitions;
    if (reps.length < 2) return null;

    const durations = reps.map(r => r.durationMs);
    const peaks = reps.map(r => r.peakVelocity);
    const means = reps.map(r => r.meanVelocity);
    const rts = this._reactionTimes;

    // B4: Peak velocity ratio stats
    const ratios = reps.map(r => r.peakVelocityRatio).filter(r => r !== null);
    const peakVelocityRatioStats = ratios.length >= 2 ? {
      mean: Math.round(mean(ratios) * 1000) / 1000,
      cv: Math.round(cv(ratios) * 1000) / 1000,
    } : null;

    // C5: Per-repetition SPARC stats
    const sparcs = reps.map(r => r.sparc).filter(s => s !== null);
    const sparcStats = sparcs.length >= 2 ? {
      mean: Math.round(mean(sparcs) * 1000) / 1000,
      cv: Math.round(cv(sparcs.map(Math.abs)) * 1000) / 1000,
      worst: Math.round(Math.min(...sparcs) * 1000) / 1000,
    } : null;

    // B3: BVE (Bivariate Variable Error) — spatial endpoint dispersion
    // A5: Dysmetria — mean and max endpoint overshoot (distance from target)
    let bve = null;
    if (this._endpoints.length >= 3) {
      const dxArr = this._endpoints.map(e => e.dx);
      const dzArr = this._endpoints.map(e => e.dz);
      const sigmaX = stddev(dxArr);
      const sigmaZ = stddev(dzArr);
      const errors = this._endpoints.map(e => e.error);
      bve = {
        value: Math.sqrt(sigmaX * sigmaX + sigmaZ * sigmaZ),
        meanError: mean(errors),
        maxError: Math.max(...errors),
        // Endpoint accuracy (mean absolute error from target).
        // Not a true directional dysmetria measure — would require approach
        // trajectory vector projection. Presented as spatial accuracy metric.
        endpointAccuracy: mean(errors),
        n: this._endpoints.length,
      };
    }

    // B5: Grip aperture variability
    let gripApertureCV = null;
    if (this._gripApertures.length >= 3) {
      gripApertureCV = {
        value: Math.round(cv(this._gripApertures) * 1000) / 1000,
        mean: Math.round(mean(this._gripApertures) * 10) / 10,
        n: this._gripApertures.length,
      };
    }

    return {
      count: reps.length,
      durationCV: cv(durations),
      peakVelocityCV: cv(peaks),
      meanVelocityCV: cv(means),
      meanDuration: mean(durations),
      meanPeakVelocity: mean(peaks),
      peakVelocityRatio: peakVelocityRatioStats,
      sparc: sparcStats,
      bve,
      gripApertureCV,
      reactionTime: rts.length > 0 ? {
        mean: Math.round(mean(rts)),
        median: Math.round(percentile(rts, 50)),
        cv: Math.round(cv(rts) * 100) / 100,
        count: rts.length,
      } : null,
    };
  }

  finalize() {
    const durationMs = Math.max(1, Date.now() - this.start);
    const tremorAmpRaw = mean(this.tremor);
    const smoothness = mean(this.smooth);
    const rotJerk = mean(this.rotSmooth);

    // Pathological tremor score: only count amplitude at clinical frequencies (3-6Hz).
    // If average freq is outside pathological band, attenuate heavily.
    const avgFreq = this.tremorFreqs.length > 0
      ? this.tremorFreqs.reduce((a, b) => a + b, 0) / this.tremorFreqs.length
      : 0;
    const freqWeight = (avgFreq >= 3 && avgFreq <= 6) ? 1.0 : 0.15;
    const tremorAmp = tremorAmpRaw * freqWeight;

    const openP90 = percentile(this.handOpen, 90);
    const openP10 = percentile(this.handOpen, 10);
    const extP75 = percentile(this.indexExt, 75);
    const speedP75 = percentile(this.speed.map((s) => s.v), 75);
    const openSpeedP75 = percentile(this.handOpeningSpeed, 75);

    // Session-level SPARC: computed over the full speed profile of the entire game
    const fullSpeedProfile = this.speed.map(s => s.v);
    const sessionSparc = fullSpeedProfile.length >= 10
      ? Math.round(computeSPARCFromProfile(fullSpeedProfile) * 1000) / 1000
      : null;

    const repetitionStats = this._computeRepetitionStats();

    // C2: Bilateral asymmetry summary (persisted with session)
    const asymmetry = this._asymmetryReadings.length > 0 ? {
      mean: Math.round(mean(this._asymmetryReadings)),
      readings: this._asymmetryReadings.length,
    } : null;

    if (this.gameKey === 'pastillero') {
      const placed = this.outcome.placed || 0;
      const errors = this.outcome.errors || 0;
      const total = placed + errors;
      return {
        game: 'slingshot',
        durationMs,
        sessionSparc,
        metrics: {
          maxPinchOpen: clamp(openP90 / 100, 0, 1),
          maxPullDistance: clamp(speedP75, 50, 500),
          pullTremor: clamp(0.5 + tremorAmp * 5.5, 0.5, 6),
          accuracyRatio: total > 0 ? clamp(placed / total, 0.05, 1) : 0.05,
          totalShots: clamp(Math.round(total || this.outcome.totalPills || 8), 8, 20),
        },
        repetitions: this._repetitions,
        repetitionStats,
        asymmetry,
      };
    }

    if (this.gameKey === 'interruptores') {
      return {
        game: 'flappy',
        durationMs,
        sessionSparc,
        metrics: {
          maxExtension: clamp(extP75 / 180, 0.1, 1),
          maxFlexion: clamp(1 - openP10 / 100, 0.1, 1),
          activationCount: clamp(Math.round(this.pinchRises), 5, 60),
          fatigueIndex: this._fatigueIndex(),
          smoothnessJerk: clamp((1 - smoothness) * 6, 0.5, 6),
        },
        repetitions: this._repetitions,
        repetitionStats,
        asymmetry,
      };
    }

    // jarra -> water
    // A6: Pronosupination values are QUALITATIVE ESTIMATES derived from 2D landmark
    // visibility ratios. Angular precision is insufficient for direct clinical measurement
    // without IMU or depth sensor. Present to clinician as exploratory proxy only.
    const spills = this.outcome.spills || 0;
    const rounds = this.outcome.rounds || 3;
    return {
      game: 'water',
      durationMs,
      sessionSparc,
      metrics: {
        maxSupination: clamp(percentile(this.supDeg, 90) || 10, 10, 90),
        maxPronation: clamp(percentile(this.pronDeg, 90) || 10, 10, 90),
        pronosupQualityLevel: 'qualitative-proxy',
        smoothnessJerk: clamp(0.5 + rotJerk * 0.5, 0.5, 6),
        waterAccuracy: clamp(100 - spills * 5, 10, 100),
        poisonError: clamp(spills, 0, 50),
        averagePouringTime: clamp(
          this.outcome.avgPourMs || durationMs / Math.max(1, rounds),
          500,
          5000
        ),
      },
      repetitions: this._repetitions,
      repetitionStats,
      asymmetry,
    };
  }
}
