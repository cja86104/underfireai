-- =============================================================================
-- Tighten RLS scope and add missing defensive constraints.
--
-- ROOT CAUSE (policy drop):
--   The 20250227 migration granted UPDATE on code_submissions to session
--   owners. No server route or client code ever calls .update() on that
--   table — submissions are append-only (INSERT) by design. Leaving the
--   policy in place widens the authenticated-user attack surface for a
--   capability the product does not use. Principle of least privilege
--   says drop it.
--
-- ROOT CAUSE (CHECK constraint):
--   interview_sessions.max_user_messages has no CHECK constraint. The
--   create route currently derives the value from SESSION_LENGTH_CONFIG
--   (10/20/30), so the live data is well within bounds, but a schema
--   without a CHECK lets any future route (or a direct SQL write) set
--   e.g. 99_999 — a runaway session would burn AI credit per user turn
--   until the message cap is reached. 50 is chosen to exceed the deepest
--   session length (30) with headroom while capping abuse.
--
-- SAFETY:
--   - DROP POLICY is non-breaking: service_role bypasses RLS, so the
--     webhook/admin paths are unaffected, and no user-facing code calls
--     .update() on code_submissions (verified by grep).
--   - ADD CONSTRAINT validates existing rows first. Live data is 10/20/30,
--     all pass. NULL is permitted because the column allows null.
-- =============================================================================

-- Step 1: Drop the unused UPDATE policy on code_submissions.
-- Submissions are immutable after insert. Nothing in the application calls
-- .update() on this table (confirmed by grep). Dropping the policy leaves
-- UPDATE denied for anon/authenticated and permitted for service_role.
DROP POLICY IF EXISTS "Users can update their code submissions" ON code_submissions;

-- Step 2: Add a range CHECK on interview_sessions.max_user_messages.
-- Prevents a future code path or manual SQL write from setting a runaway
-- value. NULL stays valid because the column was added without NOT NULL
-- (migration 20250214 uses DEFAULT 20 but does not forbid null).
ALTER TABLE interview_sessions
  ADD CONSTRAINT chk_max_user_messages
  CHECK (
    max_user_messages IS NULL
    OR (max_user_messages > 0 AND max_user_messages <= 50)
  );

COMMENT ON CONSTRAINT chk_max_user_messages ON interview_sessions IS
  'Bounds max_user_messages to (0, 50] to cap per-session AI cost. Current SESSION_LENGTH_CONFIG values are 10/20/30.';
