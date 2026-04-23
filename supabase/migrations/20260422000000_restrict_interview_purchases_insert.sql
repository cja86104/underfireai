-- =============================================================================
-- Restrict interview_purchases INSERT to service_role only.
--
-- ROOT CAUSE: The 20250306 migration created an INSERT policy
--   "Service role can insert purchases" ON interview_purchases
--   FOR INSERT WITH CHECK (true);
-- The policy name implies service-role scope, but WITH CHECK (true) applies
-- to every RLS role (anon, authenticated). An authenticated user could
-- therefore forge rows in interview_purchases (granting themselves audit
-- trail for interviews they never paid for).
--
-- FIX: service_role bypasses RLS by default and does not need a policy.
-- Dropping this policy leaves INSERT denied for anon/authenticated and
-- permitted for the webhook handler (which uses SUPABASE_SERVICE_ROLE_KEY).
-- The SELECT policy for users viewing their own purchases is retained.
-- =============================================================================

DROP POLICY IF EXISTS "Service role can insert purchases" ON interview_purchases;
