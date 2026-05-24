-- =============================================================================
-- Update max_user_messages CHECK constraint to reflect corrected
-- SESSION_LENGTH_CONFIG values: short=7, standard=12, deep=16.
--
-- Existing rows may have values of 20 or 30 from the old config (standard/deep).
-- Backfill clamps them to the new maximums before the constraint is applied.
-- Completed sessions are unaffected by the cap going forward — only new
-- sessions created after this migration will enforce the new values.
-- =============================================================================

-- 1. Drop the old constraint.
ALTER TABLE interview_sessions
  DROP CONSTRAINT IF EXISTS chk_max_user_messages;

-- 2. Backfill: clamp existing rows to the new cap.
--    Old values 20 → 12 (standard), 30 → 16 (deep), 10 → 7 (short).
UPDATE interview_sessions
  SET max_user_messages = CASE
    WHEN max_user_messages >= 20 THEN 16
    WHEN max_user_messages >= 10 THEN 12
    WHEN max_user_messages > 7  THEN 7
    ELSE max_user_messages
  END
WHERE max_user_messages > 16;

-- 3. Add the corrected constraint.
ALTER TABLE interview_sessions
  ADD CONSTRAINT chk_max_user_messages
  CHECK (
    max_user_messages IS NULL
    OR (max_user_messages > 0 AND max_user_messages <= 20)
  );

COMMENT ON CONSTRAINT chk_max_user_messages ON interview_sessions IS
  'Bounds max_user_messages to (0, 20]. SESSION_LENGTH_CONFIG values: short=7, standard=12, deep=16.';
