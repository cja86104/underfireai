-- Add Premium Custom Scenario Builder fields to interview_sessions
-- These store the configuration used to create the session for analytics and replay.
-- Null for free/pro users; populated only for premium users using the scenario builder.

ALTER TABLE interview_sessions
ADD COLUMN IF NOT EXISTS archetype_mix TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS constraints TEXT[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trait_overrides JSONB DEFAULT NULL;

COMMENT ON COLUMN interview_sessions.archetype_mix IS 'Premium: 1-2 archetype keys blended for this session';
COMMENT ON COLUMN interview_sessions.constraints IS 'Premium: behavioural constraints applied to interviewer conduct';
COMMENT ON COLUMN interview_sessions.trait_overrides IS 'Premium: explicit personality trait overrides (0-100 values)';
