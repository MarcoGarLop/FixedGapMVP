import { supabase } from './supabaseClient.js';
import { createSession, updateSessionQuality } from './sessions.js';
import { transformGameResult } from './metricsTransform.js';

// Orchestrates the full upload of a completed playthrough to Supabase.
// Called once at the end of a 3-game session.
//
// Parameters:
//   subjectId  - UUID of the subject who played
//   games      - Array of {finalized, accumulator} for each game in play order
//
// Returns: { ok, sessionId, error? }

export async function uploadPlaythrough(subjectId, games) {
  if (!subjectId || !games || games.length === 0) {
    return { ok: false, error: 'Missing subjectId or games' };
  }

  // 1. Create session
  const sessionResult = await createSession(subjectId);
  if (!sessionResult.ok) {
    console.error('[upload] Session creation failed:', sessionResult.error);
    return { ok: false, error: sessionResult.error };
  }

  const sessionId = sessionResult.session.id;

  // 2. Transform and insert each game result
  const errors = [];
  for (let i = 0; i < games.length; i++) {
    const { finalized, accumulator } = games[i];
    if (!finalized) continue;

    const row = transformGameResult(finalized, sessionId, i + 1, accumulator);

    const { error } = await supabase
      .from('game_results')
      .insert(row);

    if (error) {
      console.error(`[upload] game_results insert failed for game ${i + 1}:`, error.message);
      errors.push(error.message);
    }
  }

  // 3. Update session quality (average across games)
  const qualityScores = games
    .filter(g => g.accumulator)
    .map(g => {
      const acc = g.accumulator;
      const total = acc.frames || 1;
      return 100; // Placeholder until we track quality_frames properly
    });

  if (qualityScores.length > 0) {
    const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    await updateSessionQuality(sessionId, avgQuality, null);
  }

  if (errors.length > 0) {
    return { ok: false, sessionId, error: errors.join('; ') };
  }

  return { ok: true, sessionId };
}
