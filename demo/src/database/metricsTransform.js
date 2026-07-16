// Transforms the output of BiomarkerAccumulator.finalize() into the flat
// column format expected by the game_results table in Supabase.
//
// This is the critical bridge between the live metric pipeline and the database.
// Each field here maps to a direct column in game_results for queryable access.

function safeNum(v) {
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function percentile(arr, p) {
  if (!arr || !arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(Math.round((p / 100) * (sorted.length - 1)), sorted.length - 1);
  return sorted[idx];
}

function mean(arr) {
  if (!arr || !arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Map internal game key ('slingshot','flappy','water') back to DB game_key
const GAME_KEY_MAP = {
  slingshot: 'pastillero',
  flappy: 'interruptores',
  water: 'jarra',
};

export function transformGameResult(finalized, sessionId, playOrder, accumulator) {
  const gameKey = GAME_KEY_MAP[finalized.game] || finalized.game;
  const stats = finalized.repetitionStats;
  const reps = finalized.repetitions || [];

  // Extract raw arrays from accumulator for percentile computation
  const handOpen = accumulator?.handOpen || [];
  const handOpeningSpeed = accumulator?.handOpeningSpeed || [];
  const indexExt = accumulator?.indexExt || [];
  const tremor = accumulator?.tremor || [];
  const speed = accumulator?.speed || [];
  const romDeg = accumulator?.romDeg || [];

  // Compute values not directly in finalize output but available from accumulator
  const speedValues = speed.map(s => s.v);
  const pinchCount = accumulator?.pinchRises || 0;

  // Fingers extended: we don't have per-frame count in accumulator,
  // so we use the metrics_display value where available
  const fingersMax = null; // Would need per-frame tracking, skip for now
  const fingersMean = null;

  return {
    session_id: sessionId,
    game_key: gameKey,
    play_order: playOrder,
    duration_ms: finalized.durationMs,

    // A. Pinch & Grasp
    pinch_count: safeNum(pinchCount),
    pinch_distance_mean_mm: null, // Would need per-pinch distance tracking
    pinch_distance_max_mm: null,
    tripod_quality_mean: null, // Would need per-frame accumulation
    thumb_opposition_mean: null,
    grip_aperture_mean_mm: stats?.gripApertureCV?.mean || null,
    grip_aperture_cv: stats?.gripApertureCV?.value || null,

    // B. Hand Opening & Extension
    hand_open_pct_p90: safeNum(percentile(handOpen, 90)),
    hand_open_pct_p10: safeNum(percentile(handOpen, 10)),
    hand_opening_speed_p75: safeNum(percentile(handOpeningSpeed, 75)),
    fingers_extended_max: fingersMax,
    fingers_extended_mean: fingersMean,
    index_extension_p75: safeNum(percentile(indexExt, 75)),
    finger_individuation_mean: null, // Would need per-frame accumulation

    // C. Range of Motion
    rom_deg_p90: safeNum(percentile(romDeg, 90)),
    rom_norm_mean: null, // Would need romNorm per-frame
    max_supination_deg: finalized.metrics?.maxSupination || null,
    max_pronation_deg: finalized.metrics?.maxPronation || null,

    // D. Velocity & Kinematics
    palm_speed_mean: safeNum(mean(speedValues)),
    palm_speed_p75: safeNum(percentile(speedValues, 75)),
    mean_peak_velocity: stats?.meanPeakVelocity || null,
    peak_velocity_ratio_mean: stats?.peakVelocityRatio?.mean || null,

    // E. Smoothness
    session_sparc: finalized.sessionSparc || null,
    sparc_mean: stats?.sparc?.mean || null,
    sparc_cv: stats?.sparc?.cv || null,
    sparc_worst: stats?.sparc?.worst || null,

    // F. Tremor
    tremor_amp_mean: safeNum(mean(tremor)),
    tremor_freq_hz: null, // Aggregated from per-frame — would need accumulation
    tremor_band: 'none',
    intention_tremor_mean: null, // Would need per-frame accumulation

    // G. Inter-repetition Variability
    rep_count: reps.length || null,
    duration_cv: stats?.durationCV || null,
    peak_velocity_cv: stats?.peakVelocityCV || null,
    mean_velocity_cv: stats?.meanVelocityCV || null,
    mean_duration_ms: stats?.meanDuration || null,

    // H. Spatial Precision
    bve_value: stats?.bve?.value || null,
    endpoint_accuracy: stats?.bve?.endpointAccuracy || null,
    endpoint_max_error: stats?.bve?.maxError || null,

    // I. Reaction Time
    reaction_time_mean_ms: stats?.reactionTime?.mean || null,
    reaction_time_median_ms: stats?.reactionTime?.median || null,
    reaction_time_cv: stats?.reactionTime?.cv || null,
    reaction_time_count: stats?.reactionTime?.count || null,

    // J. Fatigue & Asymmetry
    fatigue_index: finalized.metrics?.fatigueIndex || null,
    asymmetry_mean: finalized.asymmetry?.mean || null,
    asymmetry_readings: finalized.asymmetry?.readings || null,

    // K. Composite
    cri_score: null, // Computed at display time, not stored from game
    cri_level: null,

    // L. Signal Quality
    quality_frames_pct: null, // Will be set by the session recorder
    avg_fps: null,

    // M. Raw Data
    repetitions: reps,
    outcome: extractOutcome(finalized, gameKey),
    metrics_display: finalized.metrics || {},
  };
}

function extractOutcome(finalized, gameKey) {
  const m = finalized.metrics || {};
  switch (gameKey) {
    case 'pastillero':
      return {
        placed: m.totalShots ? Math.round(m.accuracyRatio * m.totalShots) : null,
        errors: m.totalShots ? m.totalShots - Math.round(m.accuracyRatio * m.totalShots) : null,
        totalPills: m.totalShots || null,
        accuracyRatio: m.accuracyRatio || null,
      };
    case 'jarra':
      return {
        spills: m.poisonError || null,
        rounds: null,
        avgPourMs: m.averagePouringTime || null,
      };
    case 'interruptores':
      return {
        score: m.activationCount || null,
        maxScore: null,
      };
    default:
      return {};
  }
}
