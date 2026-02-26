-- ============================================================
-- ADD MISSING relevance_score COLUMN TO session_scores
-- ============================================================
-- This column exists in types/database.ts and is written by
-- both /api/interview/[sessionId]/end and /score routes, but
-- was never added to the initial schema migration.
-- ============================================================

ALTER TABLE session_scores
  ADD COLUMN IF NOT EXISTS relevance_score INTEGER
    CHECK (relevance_score >= 0 AND relevance_score <= 100);

COMMENT ON COLUMN session_scores.relevance_score IS 'Average relevance score across candidate responses (0–100)';
