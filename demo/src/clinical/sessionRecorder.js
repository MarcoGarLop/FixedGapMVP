// Aggregates the three games of one playthrough into a single dashboard
// "session" and appends it to Alpha's history in localStorage.
// Also uploads to Supabase when connected and a subject is selected.
//
// Storage key: 'fixedgap_alpha_sessions'
// Value: JSON array of session objects (grows one entry per playthrough).
//
// The stored session matches the shape the dashboard builds internally:
//   { id, patientId, date, handUsed, games:[...3 finalized game metrics...] }
// The dashboard computes `derived` itself from `games` on load.

import { uploadPlaythrough } from '../database/uploadSession.js';

const STORAGE_KEY = 'fixedgap_alpha_sessions';
const BASELINE_KEY = 'fixedgap_alpha_baseline';
export const ALPHA_PATIENT_ID = 'pat-alpha';

// Order the dashboard expects inside a session: slingshot, flappy, water.
const GAME_ORDER = { slingshot: 0, flappy: 1, water: 2 };

let currentGames = [];
let currentAccumulators = [];
let activeSubjectId = null;

export function setActiveSubject(subjectId) {
  activeSubjectId = subjectId;
}

export function getActiveSubject() {
  return activeSubjectId;
}

export function startPlaythrough() {
  currentGames = [];
  currentAccumulators = [];
}

export function recordGame(finalizedGame, accumulator = null) {
  if (finalizedGame && finalizedGame.game) {
    currentGames.push(finalizedGame);
    currentAccumulators.push(accumulator);
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// C3: Patient baseline — tracks historical maxima for intra-patient normalization.
// Stored separately so it persists even if sessions are cleared.
function loadBaseline() {
  try {
    const raw = localStorage.getItem(BASELINE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function updateBaseline(games) {
  const baseline = loadBaseline();

  for (const g of games) {
    if (!g.repetitions) continue;
    for (const rep of g.repetitions) {
      if (rep.peakVelocity > (baseline.peakVelocity || 0)) {
        baseline.peakVelocity = rep.peakVelocity;
      }
      if (rep.romDeg > (baseline.romDeg || 0)) {
        baseline.romDeg = rep.romDeg;
      }
    }
  }

  // Also check aggregated metrics
  for (const g of games) {
    if (g.game === 'water') {
      const sup = g.metrics.maxSupination || 0;
      const pro = g.metrics.maxPronation || 0;
      if (sup > (baseline.maxSupination || 0)) baseline.maxSupination = sup;
      if (pro > (baseline.maxPronation || 0)) baseline.maxPronation = pro;
    }
  }

  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline));
  } catch { /* best effort */ }

  return baseline;
}

export function getPatientBaseline() {
  return loadBaseline();
}

// Commits the accumulated games as a new session appended to Alpha's history.
// Also uploads to Supabase if a subject is selected.
export async function commitPlaythrough(handUsed = 'right') {
  if (currentGames.length === 0) return { session: null, uploadResult: null };

  const games = [...currentGames].sort(
    (a, b) => (GAME_ORDER[a.game] ?? 9) - (GAME_ORDER[b.game] ?? 9)
  );

  // C3: Update patient baseline with this session's maxima
  const baseline = updateBaseline(games);

  const history = loadHistory();
  const idx = history.length;
  const now = new Date();

  const session = {
    id: `sess-${ALPHA_PATIENT_ID}-${String(idx).padStart(3, '0')}`,
    patientId: ALPHA_PATIENT_ID,
    date: now.toISOString().slice(0, 10),
    handUsed,
    games,
    baseline,
  };

  history.push(session);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('[sessionRecorder] could not persist', e);
  }

  let uploadResult = null;

  // Upload to Supabase (blocking, to allow UI to show loader)
  if (activeSubjectId) {
    const gamesForUpload = games.map((finalized, i) => ({
      finalized,
      accumulator: currentAccumulators[i] || null,
    }));
    
    try {
      uploadResult = await uploadPlaythrough(activeSubjectId, gamesForUpload);
      if (uploadResult.ok) {
        console.log('[sessionRecorder] Uploaded to Supabase:', uploadResult.sessionId);
      } else {
        console.warn('[sessionRecorder] Supabase upload failed:', uploadResult.error);
      }
    } catch (err) {
      console.warn('[sessionRecorder] Supabase upload error:', err);
      uploadResult = { ok: false, error: err.message };
    }
  }

  currentGames = [];
  currentAccumulators = [];
  return { session, uploadResult };
}
