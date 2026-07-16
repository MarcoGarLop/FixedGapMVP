-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix Supabase Advisor Warnings
-- Run this AFTER the initial schema.sql
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1 & 2: Set search_path on functions to prevent path injection
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_session_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE sessions SET
    games_played = (SELECT COUNT(*) FROM game_results WHERE session_id = NEW.session_id),
    completed = (SELECT COUNT(*) = 3 FROM game_results WHERE session_id = NEW.session_id),
    ended_at = CASE
      WHEN (SELECT COUNT(*) FROM game_results WHERE session_id = NEW.session_id) = 3
      THEN now() ELSE NULL
    END
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: Revoke anon access to materialized view, keep authenticated access
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE SELECT ON mv_normative_percentiles FROM anon;
GRANT SELECT ON mv_normative_percentiles TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4: Recreate v_latest_sessions as SECURITY INVOKER (respects RLS of caller)
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS v_latest_sessions;

CREATE VIEW v_latest_sessions
WITH (security_invoker = true)
AS
SELECT DISTINCT ON (s.subject_id)
  s.id AS session_id,
  s.subject_id,
  s.started_at,
  sub.display_name,
  sub.subject_type,
  sub.birth_year,
  sub.sex,
  sub.dominant_hand
FROM sessions s
JOIN subjects sub ON s.subject_id = sub.id
WHERE s.completed = true
ORDER BY s.subject_id, s.started_at DESC;

-- Also revoke anon access to the view
REVOKE SELECT ON v_latest_sessions FROM anon;
GRANT SELECT ON v_latest_sessions TO authenticated;
