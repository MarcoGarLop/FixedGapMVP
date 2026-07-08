// One Euro Filter — adaptive low-pass with minimal latency at low speeds
// and aggressive smoothing at high speeds. Superior to fixed-alpha for hand tracking.
// Reference: Casiez et al. 2012 "1€ Filter"

class LowPassFilter {
  constructor(alpha) {
    this._alpha = alpha;
    this._initialized = false;
    this._value = 0;
  }

  filter(value) {
    if (!this._initialized) {
      this._value = value;
      this._initialized = true;
      return value;
    }
    this._value = this._alpha * value + (1 - this._alpha) * this._value;
    return this._value;
  }

  setAlpha(alpha) {
    this._alpha = Math.max(0, Math.min(1, alpha));
  }

  lastValue() {
    return this._value;
  }

  reset() {
    this._initialized = false;
  }
}

function computeAlpha(rate, cutoff) {
  const tau = 1.0 / (2 * Math.PI * cutoff);
  const te = 1.0 / rate;
  return 1.0 / (1.0 + tau / te);
}

export class OneEuroFilter {
  constructor(freq = 30, minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this._freq = freq;
    this._minCutoff = minCutoff;
    this._beta = beta;
    this._dCutoff = dCutoff;
    this._xFilter = new LowPassFilter(computeAlpha(freq, minCutoff));
    this._dxFilter = new LowPassFilter(computeAlpha(freq, dCutoff));
    this._lastTime = null;
  }

  filter(value, timestamp) {
    if (this._lastTime !== null && timestamp !== this._lastTime) {
      this._freq = 1000 / (timestamp - this._lastTime);
    }
    this._lastTime = timestamp;

    const prevValue = this._xFilter.lastValue();
    const dx = this._xFilter._initialized ? (value - prevValue) * this._freq : 0;

    const edx = this._dxFilter.filter(dx);
    this._dxFilter.setAlpha(computeAlpha(this._freq, this._dCutoff));

    const cutoff = this._minCutoff + this._beta * Math.abs(edx);
    this._xFilter.setAlpha(computeAlpha(this._freq, cutoff));

    return this._xFilter.filter(value);
  }

  reset() {
    this._xFilter.reset();
    this._dxFilter.reset();
    this._lastTime = null;
  }
}

export class LandmarkFilter {
  constructor(freq = 30, minCutoff = 1.5, beta = 0.01, dCutoff = 1.0) {
    this._filters = [];
    this._opts = { freq, minCutoff, beta, dCutoff };
  }

  filter(landmarks, timestamp) {
    if (!landmarks) return null;

    // Initialize filters lazily on first frame
    if (this._filters.length === 0) {
      for (let i = 0; i < landmarks.length; i++) {
        this._filters.push({
          x: new OneEuroFilter(this._opts.freq, this._opts.minCutoff, this._opts.beta, this._opts.dCutoff),
          y: new OneEuroFilter(this._opts.freq, this._opts.minCutoff, this._opts.beta, this._opts.dCutoff),
          z: new OneEuroFilter(this._opts.freq, this._opts.minCutoff, this._opts.beta, this._opts.dCutoff),
        });
      }
    }

    const filtered = [];
    for (let i = 0; i < landmarks.length; i++) {
      filtered.push({
        x: this._filters[i].x.filter(landmarks[i].x, timestamp),
        y: this._filters[i].y.filter(landmarks[i].y, timestamp),
        z: this._filters[i].z.filter(landmarks[i].z, timestamp),
      });
    }
    return filtered;
  }

  reset() {
    this._filters = [];
  }
}
