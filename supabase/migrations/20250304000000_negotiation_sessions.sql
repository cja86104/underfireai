-- ============================================
-- SALARY NEGOTIATION PREP MODULE (Premium)
-- Creates negotiation_sessions and negotiation_messages tables.
-- Users practice compensation negotiation against an AI recruiter/hiring manager.
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE negotiation_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE negotiation_role AS ENUM ('recruiter', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- NEGOTIATION SESSIONS TABLE
-- ============================================
CREATE TABLE negotiation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Context provided at session creation
  target_role TEXT NOT NULL,
  company_name TEXT,
  current_offer_amount INTEGER NOT NULL CHECK (current_offer_amount > 0),
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  experience_years INTEGER CHECK (experience_years >= 0),
  additional_context TEXT,

  -- Session lifecycle
  status negotiation_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER CHECK (duration_seconds >= 0),

  -- Outcome: what the AI "offered" at the end of the simulation
  final_simulated_offer INTEGER CHECK (final_simulated_offer > 0),

  -- Scores (populated on session completion)
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  framing_score INTEGER CHECK (framing_score >= 0 AND framing_score <= 100),
  strategy_score INTEGER CHECK (strategy_score >= 0 AND strategy_score <= 100),
  composure_score INTEGER CHECK (composure_score >= 0 AND composure_score <= 100),

  -- AI-generated feedback (populated on session completion)
  ai_feedback TEXT,
  key_tactics_used TEXT[] DEFAULT '{}',
  improvements TEXT[] DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_negotiation_sessions_user ON negotiation_sessions(user_id);
CREATE INDEX idx_negotiation_sessions_user_status ON negotiation_sessions(user_id, status);
CREATE INDEX idx_negotiation_sessions_started ON negotiation_sessions(started_at DESC);

-- Comments
COMMENT ON TABLE negotiation_sessions IS 'Premium: salary negotiation practice sessions against an AI recruiter.';
COMMENT ON COLUMN negotiation_sessions.current_offer_amount IS 'Initial offer amount in USD cents (stored as integer).';
COMMENT ON COLUMN negotiation_sessions.target_amount IS 'User''s negotiation target in USD cents.';
COMMENT ON COLUMN negotiation_sessions.final_simulated_offer IS 'The offer amount the AI ''agreed to'' at session end, if applicable.';

-- ============================================
-- NEGOTIATION MESSAGES TABLE
-- ============================================
CREATE TABLE negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES negotiation_sessions(id) ON DELETE CASCADE,
  role negotiation_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_negotiation_messages_session ON negotiation_messages(session_id);
CREATE INDEX idx_negotiation_messages_session_created ON negotiation_messages(session_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE negotiation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE negotiation_messages ENABLE ROW LEVEL SECURITY;

-- Negotiation sessions policies
CREATE POLICY "Users can view own negotiation sessions"
  ON negotiation_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own negotiation sessions"
  ON negotiation_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own negotiation sessions"
  ON negotiation_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own negotiation sessions"
  ON negotiation_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Negotiation messages policies
CREATE POLICY "Users can view own negotiation messages"
  ON negotiation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM negotiation_sessions
      WHERE negotiation_sessions.id = negotiation_messages.session_id
        AND negotiation_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own negotiation sessions"
  ON negotiation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM negotiation_sessions
      WHERE negotiation_sessions.id = negotiation_messages.session_id
        AND negotiation_sessions.user_id = auth.uid()
    )
  );
