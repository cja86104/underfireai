-- Panel Interviews Migration
-- Adds support for multiple interviewers per session

-- ===========================================
-- SESSION INTERVIEWERS JUNCTION TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS session_interviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  seat_order INTEGER NOT NULL DEFAULT 0,  -- 0,1,2,3 = position in panel UI
  role_label TEXT,                         -- e.g. "Hiring Manager", "Tech Lead", "HR"
  is_lead BOOLEAN DEFAULT FALSE,           -- primary interviewer who leads/closes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, interviewer_id)
);

-- Index for fast lookups
CREATE INDEX idx_session_interviewers_session ON session_interviewers(session_id);
CREATE INDEX idx_session_interviewers_interviewer ON session_interviewers(interviewer_id);

-- ===========================================
-- ADD PANEL STATE TO SESSIONS
-- ===========================================
ALTER TABLE interview_sessions
ADD COLUMN IF NOT EXISTS panel_state JSONB DEFAULT NULL;

-- panel_state structure:
-- {
--   "impressions": {
--     "<interviewer_id>": {
--       "conviction": 50,      -- 0-100: how convinced they are
--       "sentiment": 0,        -- -1 to 1: negative to positive
--       "label": "neutral"     -- summary label
--     }
--   },
--   "summary": "The panel is still evaluating..."
-- }

-- ===========================================
-- ADD INTERVIEWER_ID TO MESSAGES
-- ===========================================
-- This allows tracking which panel member said what
ALTER TABLE interview_messages
ADD COLUMN IF NOT EXISTS interviewer_id UUID REFERENCES interviewers(id) ON DELETE SET NULL;

-- Index for filtering messages by interviewer
CREATE INDEX IF NOT EXISTS idx_interview_messages_interviewer ON interview_messages(interviewer_id);

-- ===========================================
-- RLS POLICIES FOR SESSION_INTERVIEWERS
-- ===========================================
ALTER TABLE session_interviewers ENABLE ROW LEVEL SECURITY;

-- Users can view panel members for their own sessions
CREATE POLICY "Users can view their session interviewers"
  ON session_interviewers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = session_interviewers.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Users can insert panel members for their own sessions
CREATE POLICY "Users can insert session interviewers"
  ON session_interviewers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = session_interviewers.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Users can delete panel members from their own sessions
CREATE POLICY "Users can delete their session interviewers"
  ON session_interviewers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = session_interviewers.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );
