-- =============================================================================
-- Drop the deprecated reset_monthly_interviews() function and its pg_cron job.
--
-- WHY
--   reset_monthly_interviews() was the monthly free-tier reset used by the
--   pre-credit-pack subscription model:
--     UPDATE profiles SET monthly_interviews_used = 0 WHERE subscription_tier = 'free';
--
--   Migration 20250306000000_interview_credits.sql replaced the body with a
--   no-op (RAISE NOTICE only) when UnderFire moved to the permanent credit-pack
--   model. The function has been a documented no-op ever since, and the pg_cron
--   job (scheduled in 20250225000000_monthly_reset_cron.sql with name
--   'reset-monthly-interviews', '0 0 1 * *') has been invoking it harmlessly
--   on the 1st of every month.
--
--   Grep confirms zero callers: no server route, no client, no other RPC, no
--   scheduled job outside the one unscheduled here. The only references are
--   historical migrations and the types/database.ts Functions block (cleaned
--   up in a paired surgical edit after this migration applies).
--
-- SAFETY
--   1. cron.unschedule is called via subquery on cron.job so it is a no-op if
--      the job has already been removed (e.g., someone disabled it via the
--      Supabase dashboard). This avoids the "job not found" error that the
--      direct cron.unschedule('reset-monthly-interviews') form would raise.
--   2. DROP FUNCTION IF EXISTS tolerates a pre-dropped function.
--   3. No data is touched. profiles.monthly_interviews_used is untouched; that
--      column is not read by any current code path (credit accounting uses
--      purchased_interviews and interviews_used instead).
--
-- ROLLBACK RECIPE
--   If this removal turns out to be wrong, restore by running:
--
--     -- 1. Recreate the no-op function body (from 20250306000000)
--     CREATE OR REPLACE FUNCTION reset_monthly_interviews()
--     RETURNS void AS $$
--     BEGIN
--       RAISE NOTICE 'reset_monthly_interviews() is deprecated - no action taken';
--     END;
--     $$ LANGUAGE plpgsql SECURITY DEFINER;
--
--     -- 2. Re-schedule the cron job (from 20250225000000)
--     SELECT cron.schedule(
--       'reset-monthly-interviews',
--       '0 0 1 * *',
--       $cron$SELECT public.reset_monthly_interviews()$cron$
--     );
-- =============================================================================

-- 1. Unschedule the cron job if it is still scheduled. No-op if already gone.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'reset-monthly-interviews';

-- 2. Drop the deprecated no-op function.
DROP FUNCTION IF EXISTS public.reset_monthly_interviews();
