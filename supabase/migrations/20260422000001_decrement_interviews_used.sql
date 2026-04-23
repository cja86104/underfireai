-- =============================================================================
-- Define decrement_interviews_used RPC used by the interview-create rollback
-- path when a session INSERT fails after a credit was already consumed.
--
-- Called from app/api/interview/create/route.ts after a failed session INSERT
-- or session_interviewers INSERT. The caller previously invoked this RPC
-- through a raw rpc() cast, but the function was never defined — so the
-- rollback silently failed and the credit was orphaned.
--
-- Contract:
--   - Relative decrement (subtracts 1) so a concurrent successful create that
--     landed between our optimistic lock and this rollback is not clobbered.
--   - Clamps at 0: never produces a negative interviews_used value.
--   - Returns TRUE if a row was updated, FALSE otherwise (e.g. when the user
--     already had interviews_used = 0, which indicates a race we should log
--     but not surface as an error).
-- =============================================================================

CREATE OR REPLACE FUNCTION decrement_interviews_used(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows INTEGER;
BEGIN
  UPDATE profiles
  SET
    interviews_used = interviews_used - 1,
    updated_at      = NOW()
  WHERE id = p_user_id
    AND interviews_used > 0;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

COMMENT ON FUNCTION decrement_interviews_used IS
  'Atomic relative decrement of profiles.interviews_used. Clamps at 0. Used for credit rollback on session-create failure.';
