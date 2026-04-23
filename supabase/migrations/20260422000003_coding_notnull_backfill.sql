-- =============================================================================
-- Backfill and enforce NOT NULL on four coding-feature columns whose original
-- migration (20250227000000_coding_interviews.sql) declared `DEFAULT X` without
-- the matching `NOT NULL` constraint. The columns are non-null in domain
-- intent — every code path either omits them (relying on the column default)
-- or writes a concrete value — but Postgres still permits an explicit NULL on
-- INSERT, which forces the generated TypeScript types to widen to `T | null`
-- and propagates non-null fallback bandaids (?? 1800, ?? '') throughout the
-- app. Closing the constraint at the schema level removes the bandaids and
-- prevents the user-visible "Invalid Date" render in code-replay-panel.tsx
-- when an empty-string submitted_at is fed to `new Date(...)`.
--
-- Affected columns (all keep their existing DEFAULT clauses):
--   coding_challenges.time_limit_seconds   INTEGER     DEFAULT 1800
--   coding_challenges.created_at           TIMESTAMPTZ DEFAULT NOW()
--   coding_challenges.updated_at           TIMESTAMPTZ DEFAULT NOW()
--   code_submissions.submitted_at          TIMESTAMPTZ DEFAULT NOW()
--
-- Backfill strategy:
--   Each UPDATE is gated `WHERE col IS NULL` so it is a cheap no-op on a
--   healthy database (the expected production state). The defensive UPDATEs
--   exist solely to guarantee the subsequent SET NOT NULL never aborts the
--   migration on a row that an out-of-band INSERT may have left null. NOW()
--   is the only sane fallback for timestamps with no other signal of the
--   original write time; 1800 matches the column's existing DEFAULT and the
--   value used everywhere downstream as the "no override" sentinel.
--
-- Idempotency:
--   ALTER COLUMN ... SET NOT NULL is a no-op if the column is already
--   NOT NULL, so this migration is safe to re-apply.
-- =============================================================================

-- Defensive backfill — no-op when columns are already populated (the norm).
UPDATE coding_challenges SET time_limit_seconds = 1800  WHERE time_limit_seconds IS NULL;
UPDATE coding_challenges SET created_at         = NOW() WHERE created_at         IS NULL;
UPDATE coding_challenges SET updated_at         = NOW() WHERE updated_at         IS NULL;
UPDATE code_submissions  SET submitted_at       = NOW() WHERE submitted_at       IS NULL;

-- Enforce the invariant. Column DEFAULTs are unaffected — SET NOT NULL only
-- changes the nullability constraint, not the default-value clause.
ALTER TABLE coding_challenges ALTER COLUMN time_limit_seconds SET NOT NULL;
ALTER TABLE coding_challenges ALTER COLUMN created_at         SET NOT NULL;
ALTER TABLE coding_challenges ALTER COLUMN updated_at         SET NOT NULL;
ALTER TABLE code_submissions  ALTER COLUMN submitted_at       SET NOT NULL;
