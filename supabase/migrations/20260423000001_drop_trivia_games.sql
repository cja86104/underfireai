-- =============================================================================
-- Drop the orphaned `trivia_games` table and its maintenance function.
--
-- ORIGIN OF DRIFT:
--   Neither the table nor its cleanup function were ever authored in this
--   repository. They were created out-of-band against the UnderFire Supabase
--   project (likely via the Dashboard SQL editor) but belonged in a sibling
--   project (Kirra Companion) — the tell is the `companion_id` column, which
--   is a Kirra concept; UnderFire has no "companion" model anywhere in code.
--
-- SAFETY VERIFIED:
--   1. Zero application code references `trivia_games` or
--      `cleanup_expired_trivia_games`. A full repo grep for /trivia/i returned
--      only the auto-generated rows in types/database.ts (which this migration
--      will cause the next regen to remove) and unrelated use of the English
--      word "trivial" in comments.
--   2. `SELECT COUNT(*) FROM trivia_games` returned 0 — no data loss.
--   3. `SELECT * FROM cron.job WHERE command LIKE '%trivia%'` returned 0 rows
--      — no scheduled cron job will break when the function disappears.
--   4. The regenerated types show `Relationships: []` for the table, so no
--      incoming FKs from other tables depend on it — CASCADE is not required
--      but is used defensively below in case the Dashboard-created schema
--      includes RLS policies or indexes the regen did not surface.
--
-- IDEMPOTENT:
--   `IF EXISTS` on both DROP statements makes this migration safe to re-run
--   and safe to apply to any environment (dev/staging/prod) regardless of
--   whether the objects are already absent.
-- =============================================================================

-- Function first (nothing depends on it once the table is gone, but dropping
-- in this order keeps the intent explicit: scheduled cleanup goes away, then
-- the thing it was cleaning up).
DROP FUNCTION IF EXISTS cleanup_expired_trivia_games() CASCADE;

-- Table. CASCADE picks up any RLS policies, indexes, or grants attached to
-- the table. Since Relationships: [] in the regenerated types, nothing
-- outside the table's own dependents is affected.
DROP TABLE IF EXISTS trivia_games CASCADE;
