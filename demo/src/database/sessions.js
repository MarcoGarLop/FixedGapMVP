import { supabase } from './supabaseClient.js';

export async function createSession(subjectId, startedAt = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const device = {
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height,
    cameraWidth: 960,
    cameraHeight: 720,
    platform: navigator.platform,
  };

  const payload = {
    subject_id: subjectId,
    operator_id: user.id,
    device,
  };
  if (startedAt) payload.started_at = startedAt;

  const { data, error } = await supabase
    .from('sessions')
    .insert(payload)
    .select()
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, session: data };
}

export async function updateSessionQuality(sessionId, qualityPct, avgFps) {
  const { error } = await supabase
    .from('sessions')
    .update({ quality_frames_pct: qualityPct, avg_fps: avgFps })
    .eq('id', sessionId);

  if (error) {
    console.error('[sessions] updateSessionQuality failed:', error.message, error.code);
  }
}

export async function listSessionsForSubject(subjectId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('completed', true)
    .order('started_at', { ascending: false });

  if (error) return [];
  return data;
}
