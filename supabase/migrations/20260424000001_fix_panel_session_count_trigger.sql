-- =============================================================================
-- Fix interviewer total_sessions counting for panel interviews.
--
-- WHY
--   The original trigger (20250121000000_initial_schema.sql → function
--   update_interviewer_session_count, trigger on_session_created) fires AFTER
--   INSERT ON interview_sessions and increments interviewers.total_sessions
--   for NEW.interviewer_id — the single lead interviewer stored on the
--   session row.
--
--   When panel mode shipped (20250226000000_panel_interviews.sql), panel
--   sessions began attaching ADDITIONAL interviewers via the
--   session_interviewers junction table, but only the lead panelist's id is
--   stored on interview_sessions.interviewer_id. Non-lead panelists sit in
--   session_interviewers and never had their total_sessions incremented.
--   This migration credits every interviewer who actually participated,
--   exactly once, regardless of whether the session is panel or single.
--
-- BEHAVIOR
--   Non-panel (behavioral, technical, case, hr, phone_screen):
--     The interview_sessions INSERT trigger fires and increments the single
--     interview_sessions.interviewer_id. session_interviewers is not populated
--     for non-panel sessions, so the new session_interviewers trigger is a
--     no-op.
--
--   Panel:
--     The interview_sessions INSERT trigger is skipped via the
--     `interview_type <> 'panel'` guard. After the session row exists,
--     /api/interview/create inserts one row per panelist into
--     session_interviewers (including the lead, with is_lead = TRUE). The
--     new session_interviewers trigger fires FOR EACH ROW and increments each
--     panelist's total_sessions exactly once. The lead is counted once
--     (via session_interviewers), not twice.
--
-- WHY NOT A SINGLE TRIGGER WITH SUBQUERY
--   An obvious-looking alternative would be a single trigger on
--   interview_sessions INSERT that does
--     UPDATE interviewers SET total_sessions = total_sessions + 1
--     WHERE id IN (SELECT interviewer_id FROM session_interviewers WHERE session_id = NEW.id);
--   That does NOT work because /api/interview/create inserts the
--   interview_sessions row FIRST and the session_interviewers rows AFTER
--   (see app/api/interview/create/route.ts). At trigger time the junction is
--   empty. A per-row trigger on session_interviewers sidesteps the ordering
--   problem and naturally handles future additions.
--
-- DOUBLE-COUNTING SAFETY
--   interview_sessions.interviewer_id for a panel row equals the lead
--   panelist's id. Without the `interview_type <> 'panel'` guard on the
--   session trigger, the lead would receive +2 (once from the session
--   trigger, once from the is_lead = TRUE session_interviewers row). The
--   guard eliminates that race.
--
-- RLS AND PRIVILEGE MODEL
--   The original trigger function used LANGUAGE plpgsql with no SECURITY
--   DEFINER and has worked in production. The new functions mirror that
--   exact model — no privilege elevation introduced. The trigger runs in the
--   context of the INSERT caller, which has already been authorised by the
--   RLS INSERT policies on interview_sessions and session_interviewers.
--
-- BACKFILL
--   Deliberately NOT backfilling historical panel sessions. Production has
--   effectively zero paying users, total_sessions is a UI decoration (sorted
--   interviewer list, dashboard stat), and historical under-counting does
--   not affect correctness of any billing, credit, or scoring calculation.
--   If a backfill is ever required, it is a one-shot UPDATE:
--     UPDATE interviewers i
--     SET total_sessions = (
--       SELECT COUNT(*)
--       FROM interview_sessions s
--       LEFT JOIN session_interviewers si ON si.session_id = s.id
--       WHERE
--         (s.interview_type <> 'panel' AND s.interviewer_id = i.id)
--         OR (s.interview_type =  'panel' AND si.interviewer_id = i.id)
--     );
--
-- ROLLBACK RECIPE
--   To restore the original lead-only-counting behavior:
--     DROP TRIGGER IF EXISTS on_session_created_count_interviewer ON interview_sessions;
--     DROP TRIGGER IF EXISTS on_session_interviewer_added_count ON session_interviewers;
--     DROP FUNCTION IF EXISTS public.update_interviewer_session_count_on_session();
--     DROP FUNCTION IF EXISTS public.update_interviewer_session_count_on_panel();
--     CREATE OR REPLACE FUNCTION update_interviewer_session_count()
--     RETURNS TRIGGER AS $$
--     BEGIN
--       IF TG_OP = 'INSERT' THEN
--         UPDATE interviewers
--         SET total_sessions = total_sessions + 1
--         WHERE id = NEW.interviewer_id;
--       END IF;
--       RETURN NEW;
--     END;
--     $$ LANGUAGE plpgsql;
--     CREATE TRIGGER on_session_created
--       AFTER INSERT ON interview_sessions
--       FOR EACH ROW
--       EXECUTE FUNCTION update_interviewer_session_count();
-- =============================================================================

-- 1. Drop the old single-trigger setup.
DROP TRIGGER IF EXISTS on_session_created ON interview_sessions;
DROP FUNCTION IF EXISTS public.update_interviewer_session_count();

-- 2. Session-level trigger: non-panel sessions only.
CREATE OR REPLACE FUNCTION public.update_interviewer_session_count_on_session()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.interview_type <> 'panel' THEN
    UPDATE interviewers
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.interviewer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_created_count_interviewer
  AFTER INSERT ON interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_interviewer_session_count_on_session();

-- 3. Panel-member trigger: per session_interviewers row, every panelist
--    (including the lead) gets +1. Fires only for panel sessions because
--    non-panel flows never insert into session_interviewers.
CREATE OR REPLACE FUNCTION public.update_interviewer_session_count_on_panel()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE interviewers
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.interviewer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_session_interviewer_added_count
  AFTER INSERT ON session_interviewers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_interviewer_session_count_on_panel();

-- =============================================================================
-- VERIFICATION QUERIES (run manually after apply, Supabase SQL editor,
-- service role or appropriate credentials). Each uses a transaction with
-- ROLLBACK so nothing persists.
-- =============================================================================
--
-- A. Non-panel still increments exactly once.
--      BEGIN;
--      WITH i AS (SELECT id, total_sessions AS before_count FROM interviewers LIMIT 1),
--           u AS (SELECT id FROM auth.users LIMIT 1)
--      INSERT INTO interview_sessions
--        (user_id, interviewer_id, interview_type, difficulty, session_length, max_user_messages)
--      SELECT u.id, i.id, 'behavioral', 5, 'standard', 20 FROM i, u;
--      SELECT i.total_sessions FROM interviewers i
--        WHERE i.id = (SELECT id FROM interviewers LIMIT 1);
--      -- expect before_count + 1
--      ROLLBACK;
--
-- B. Panel increments every attached interviewer exactly once, none twice.
--      BEGIN;
--      -- Pick three interviewer ids (<ia>, <ib>, <ic>) and one user id (<u>).
--      -- Snapshot the three counts:
--      SELECT id, total_sessions FROM interviewers
--        WHERE id IN ('<ia>','<ib>','<ic>')
--        ORDER BY id;
--      -- Create the panel session (lead is <ia>):
--      INSERT INTO interview_sessions
--        (user_id, interviewer_id, interview_type, difficulty, session_length, max_user_messages)
--      VALUES ('<u>', '<ia>', 'panel', 5, 'standard', 20)
--      RETURNING id;
--      -- Take the returned id (<S>) and attach panelists:
--      INSERT INTO session_interviewers (session_id, interviewer_id, seat_order, is_lead) VALUES
--        ('<S>', '<ia>', 0, TRUE),
--        ('<S>', '<ib>', 1, FALSE),
--        ('<S>', '<ic>', 2, FALSE);
--      SELECT id, total_sessions FROM interviewers
--        WHERE id IN ('<ia>','<ib>','<ic>')
--        ORDER BY id;
--      -- expect each count = its snapshot + 1 (lead counted ONCE, not twice)
--      ROLLBACK;
-- =============================================================================
