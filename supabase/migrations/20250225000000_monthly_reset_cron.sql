-- =============================================================================
-- UnderFireAI: Monthly Interview Reset Cron Job
-- =============================================================================
-- This migration sets up pg_cron to automatically reset monthly_interviews_used
-- for all users on the 1st of each month at midnight UTC.
--
-- PREREQUISITES:
-- 1. pg_cron extension must be enabled in your Supabase project
--    Go to: Database > Extensions > Search "pg_cron" > Enable
--
-- 2. The reset_monthly_interviews() function must exist (from initial schema)
-- =============================================================================

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres (required for Supabase)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the monthly reset job
-- Runs at 00:00 UTC on the 1st of every month
SELECT cron.schedule(
  'reset-monthly-interviews',           -- job name (unique identifier)
  '0 0 1 * *',                          -- cron expression: minute hour day month weekday
  $$SELECT public.reset_monthly_interviews()$$  -- SQL to execute
);

-- =============================================================================
-- VERIFICATION QUERIES (run these manually to verify setup)
-- =============================================================================

-- View all scheduled cron jobs:
-- SELECT * FROM cron.job;

-- View recent job executions:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- Manually trigger the reset (for testing):
-- SELECT public.reset_monthly_interviews();

-- Unschedule the job (if needed):
-- SELECT cron.unschedule('reset-monthly-interviews');

-- =============================================================================
-- NOTES
-- =============================================================================
-- 
-- The reset_monthly_interviews() function (from initial schema) does:
--   UPDATE profiles 
--   SET monthly_interviews_used = 0 
--   WHERE subscription_tier = 'free';
--
-- This resets the interview count for free-tier users only.
-- Pro/Premium users have unlimited interviews so they don't need reset.
-- =============================================================================
