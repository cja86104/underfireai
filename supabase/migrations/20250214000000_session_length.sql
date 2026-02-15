-- Add session length fields for cost control
-- Session lengths limit the number of user messages per interview

-- Add session_length enum type
DO $$ BEGIN
  CREATE TYPE session_length AS ENUM ('short', 'standard', 'deep');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to interview_sessions
ALTER TABLE interview_sessions
ADD COLUMN IF NOT EXISTS session_length session_length DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS max_user_messages INTEGER DEFAULT 20;

-- Set default values based on session_length for existing rows
UPDATE interview_sessions
SET max_user_messages = CASE session_length
  WHEN 'short' THEN 10
  WHEN 'standard' THEN 20
  WHEN 'deep' THEN 30
  ELSE 20
END
WHERE max_user_messages IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN interview_sessions.session_length IS 'Session length: short (~15min, 10 msgs), standard (~30min, 20 msgs), deep (~45min, 30 msgs)';
COMMENT ON COLUMN interview_sessions.max_user_messages IS 'Maximum number of user (candidate) messages allowed in this session';
