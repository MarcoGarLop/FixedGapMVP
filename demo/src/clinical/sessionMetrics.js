// Per-session biomarker accumulator.
// Runs live during gameplay on the SAME MediaPipe landmarks the game receives,
// reusing computeHandMetrics() from metrics.js. On finalize() it produces the
// exact `metrics` object shape the clinical dashboard expects for each game.
//
// Dashboard game keys (internal):
//   pastillero    -> "slingshot"  { maxPinchOpen, maxPullDistance, pullTremor, accuracyRatio, totalShots }
//   interruptores -> "flappy"     { maxExtension, maxFlexion, activationCount, fatigueIndex, smoothnessJerk }
//   jarra         -> "water"      { maxSupination, maxPronation, smoothnessJerk, waterAccuracy, poisonError, averagePouringTime }

import { computeHandMetrics, resetMetrics } from './metrics.js';

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
// High percentile: representative "best sustained" value, not a single spike.
// Varies session-to-session (unlike an absolute max, which saturates).
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
    this.handOpen = [];       // 0-100 samples (for opening/flexion)
    this.indexExt = [];       // degrees samples (for extension)
    this.tremor = [];         // 0-1 samples
    this.smooth = [];         // 0-1 samples
    this.speed = [];          // { t, v } for fatigue split + reach distance

    // wrist rotation (jarra)
    this.supDeg = [];         // positive-angle samples
    this.pronDeg = [];        // positive-magnitude samples
    this.rotSmooth = [];
    this.prevRot = null;

    // activity counter (interruptores)
    this.pinchRises = 0;
    this.prevPinch = false;

    this.outcome = {}; // real game outcomes injected at finalize time
  }

  // landmarks: filtered array of hands (each is 21 points). extra: optional signals.
  update(landmarks, extra = {}) {
    try {
      const lms = landmarks && landmarks[0];
      if (lms) {
        const m = computeHandMetrics(lms, 0);
        this.frames++;
        this.handOpen.push(m.handOpenPct);
        this.indexExt.push(m.indexExtension);
        this.tremor.push(m.tremorAmp);
        this.smooth.push(m.smoothness);
        this.speed.push({ t: Date.now() - this.start, v: m.palmSpeed });
        if (m.pinchActive && !this.prevPinch) this.pinchRises++;
        this.prevPinch = m.pinchActive;
      }

      if (typeof extra.wristRotationRad === 'number') {
        const deg = (extra.wristRotationRad * 180) / Math.PI;
        if (deg > 0.5) this.supDeg.push(deg);
        if (deg < -0.5) this.pronDeg.push(-deg);
        if (this.prevRot !== null) this.rotSmooth.push(Math.abs(deg - this.prevRot));
        this.prevRot = deg;
      }
    } catch (e) {
      // Never let metrics break gameplay.
      // eslint-disable-next-line no-console
      console.warn('[biomarkers] update error', e);
    }
  }

  setOutcome(o) { Object.assign(this.outcome, o); }

  _fatigueIndex() {
    // Compare mean palm speed of first third vs last third of the session.
    // Negative => slower/fatigued toward the end. Clamped to [-30, 0].
    if (this.speed.length < 6) return 0;
    const n = this.speed.length;
    const k = Math.max(1, Math.floor(n / 3));
    const f = mean(this.speed.slice(0, k).map((s) => s.v));
    const l = mean(this.speed.slice(-k).map((s) => s.v));
    if (f <= 0) return 0;
    const change = ((l - f) / f) * 100;
    return clamp(Math.min(0, change), -30, 0);
  }

  finalize() {
    const durationMs = Math.max(1, Date.now() - this.start);
    const tremorAmp = mean(this.tremor);   // 0-1
    const smoothness = mean(this.smooth);  // 0-1
    const rotJerk = mean(this.rotSmooth);  // deg between frames

    // Representative values (p90 = best sustained, mean speed, etc.)
    const openP90 = percentile(this.handOpen, 90);   // 0-100
    const openP10 = percentile(this.handOpen, 10);   // 0-100 (closed hand)
    const extP75 = percentile(this.indexExt, 75);    // degrees
    const speedP75 = percentile(this.speed.map((s) => s.v), 75); // mm/s

    if (this.gameKey === 'pastillero') {
      const placed = this.outcome.placed || 0;
      const errors = this.outcome.errors || 0;
      const total = placed + errors;
      return {
        game: 'slingshot',
        durationMs,
        metrics: {
          maxPinchOpen: clamp(openP90 / 100, 0, 1),
          maxPullDistance: clamp(speedP75, 50, 500),
          pullTremor: clamp(0.5 + tremorAmp * 5.5, 0.5, 6),
          accuracyRatio: total > 0 ? clamp(placed / total, 0.05, 1) : 0.05,
          totalShots: clamp(Math.round(total || this.outcome.totalPills || 8), 8, 20),
        },
      };
    }

    if (this.gameKey === 'interruptores') {
      return {
        game: 'flappy',
        durationMs,
        metrics: {
          maxExtension: clamp(extP75 / 180, 0.1, 1),
          maxFlexion: clamp(1 - openP10 / 100, 0.1, 1),
          activationCount: clamp(Math.round(this.pinchRises), 5, 60),
          fatigueIndex: this._fatigueIndex(),
          smoothnessJerk: clamp((1 - smoothness) * 6, 0.5, 6),
        },
      };
    }

    // jarra -> water
    const spills = this.outcome.spills || 0;
    const rounds = this.outcome.rounds || 3;
    return {
      game: 'water',
      durationMs,
      metrics: {
        maxSupination: clamp(percentile(this.supDeg, 90) || 10, 10, 90),
        maxPronation: clamp(percentile(this.pronDeg, 90) || 10, 10, 90),
        smoothnessJerk: clamp(0.5 + rotJerk * 0.5, 0.5, 6),
        waterAccuracy: clamp(100 - spills * 5, 10, 100),
        poisonError: clamp(spills, 0, 50),
        averagePouringTime: clamp(
          this.outcome.avgPourMs || durationMs / Math.max(1, rounds),
          500,
          5000
        ),
      },
    };
  }
}
