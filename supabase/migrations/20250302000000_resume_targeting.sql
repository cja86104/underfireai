-- ============================================
-- RESUME TARGETING FOR INTERVIEWS
-- Adds fields for resume-targeted interview practice
-- ============================================

-- Add resume targeting fields to interview_sessions
ALTER TABLE interview_sessions
  ADD COLUMN IF NOT EXISTS target_resume_weak_spots BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS target_job_description_id UUID REFERENCES job_descriptions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resume_targeting_context JSONB;

-- Index for JD-targeted sessions
CREATE INDEX IF NOT EXISTS idx_sessions_jd ON interview_sessions(target_job_description_id)
  WHERE target_job_description_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN interview_sessions.target_resume_weak_spots IS 'Whether to probe resume vulnerabilities during this interview';
COMMENT ON COLUMN interview_sessions.target_job_description_id IS 'JD to target gaps from during this interview';
COMMENT ON COLUMN interview_sessions.resume_targeting_context IS 'Cached vulnerabilities and gaps for the interview prompt';
