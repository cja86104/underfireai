-- ============================================
-- CUSTOM INTERVIEWERS
-- Adds is_custom flag to interviewers table so Premium users
-- can distinguish hand-built interviewers from auto-generated ones.
-- ============================================

ALTER TABLE interviewers
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN interviewers.is_custom IS 'Premium: true when this interviewer was manually created via the Custom Interviewer Creator, false when auto-generated during session setup.';
