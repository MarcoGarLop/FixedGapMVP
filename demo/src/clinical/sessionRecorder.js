// Aggregates the three games of one playthrough into a single dashboard
// "session" and appends it to Alpha's history in localStorage.
//
// Storage key: 'fixedgap_alpha_sessions'
// Value: JSON array of session objects (grows one entry per playthrough).
//
// The stored session matches the shape the dashboard builds internally:
//   { id, patientId, date, handUsed, games:[...3 finalized game metrics...] }
// The dashboard computes `derived` itself from `games` on load.

const STORAGE_KEY = 'fixedgap_alpha_sessions';
export const ALPHA_PATIENT_ID = 'pat-alpha';

// Order the dashboard expects inside a session: slingshot, flappy, water.
const GAME_ORDER = { slingshot: 0, flappy: 1, water: 2 };

let currentGames = [];

export function startPlaythrough() {
  currentGames = [];
}

export function recordGame(finalizedGame) {
  if (finalizedGame && finalizedGame.game) {
    currentGames.push(finalizedGame);
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

// Commits the accumulated games as a new session appended to Alpha's history.
export function commitPlaythrough(handUsed = 'right') {
  if (currentGames.length === 0) return null;

  const games = [...currentGames].sort(
    (a, b) => (GAME_ORDER[a.game] ?? 9) - (GAME_ORDER[b.game] ?? 9)
  );

  const history = loadHistory();
  const idx = history.length;
  const now = new Date();

  const session = {
    id: `sess-${ALPHA_PATIENT_ID}-${String(idx).padStart(3, '0')}`,
    patientId: ALPHA_PATIENT_ID,
    date: now.toISOString().slice(0, 10),
    handUsed,
    games,
  };

  history.push(session);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[sessionRecorder] could not persist', e);
  }

  currentGames = [];
  return session;
}
