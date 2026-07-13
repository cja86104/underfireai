-- ============================================
-- RESUME FILE HASH — dedupe repeated uploads
-- ============================================
-- Audit finding (underfireai-audit-checklist-v1.md §2, Cost leaks):
-- "/api/resume/upload triggers vulnerability scan in background — if it
-- re-runs on every upload and a user uploads the same resume 50x, that's
-- 50 Mistral calls. Add dedupe by file hash."
--
-- Adds a SHA-256 content hash of the raw uploaded file bytes to
-- user_resumes. The upload route computes this hash and, before triggering
-- a new background vulnerability scan, checks whether any of the user's
-- other resumes with the same hash already has a vulnerability scan from
-- the last 24 hours. If so, that result is copied instead of calling the
-- Mistral API again.

ALTER TABLE user_resumes
ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_user_resumes_user_hash
  ON user_resumes(user_id, file_hash)
  WHERE file_hash IS NOT NULL;

COMMENT ON COLUMN user_resumes.file_hash IS
  'SHA-256 hex digest of the raw uploaded file bytes. Used to dedupe repeated uploads of byte-identical resume content so the vulnerability scan (Mistral API call) is not re-run needlessly.';
