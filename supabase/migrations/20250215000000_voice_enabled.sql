-- Add voice_enabled flag to interview_sessions
-- Tracks whether voice mode was active for this session (used in analytics / replay)

ALTER TABLE interview_sessions
ADD COLUMN IF NOT EXISTS voice_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN interview_sessions.voice_enabled IS 'Whether voice mode (TTS) was enabled for this interview session';
