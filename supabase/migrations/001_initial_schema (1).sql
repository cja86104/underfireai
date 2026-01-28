-- UnderFireAI Database Schema
-- Migration: 001_initial_schema
-- Description: Complete schema for interview coaching platform

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE interview_type AS ENUM (
  'behavioral',
  'technical',
  'case',
  'hr',
  'panel',
  'phone_screen'
);

CREATE TYPE company_style AS ENUM (
  'faang',
  'startup',
  'consulting',
  'enterprise',
  'agency',
  'government'
);

CREATE TYPE session_status AS ENUM (
  'in_progress',
  'completed',
  'abandoned',
  'paused'
);

CREATE TYPE message_role AS ENUM (
  'interviewer',
  'candidate'
);

CREATE TYPE subscription_tier AS ENUM (
  'free',
  'pro',
  'premium'
);

CREATE TYPE subscription_status AS ENUM (
  'active',
  'canceled',
  'past_due',
  'trialing'
);

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier subscription_tier NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  subscription_period_end TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  monthly_interviews_used INTEGER NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Stripe lookups
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- ============================================
-- INTERVIEWERS TABLE
-- ============================================
CREATE TABLE interviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  interview_type interview_type NOT NULL,
  company_style company_style,
  role_focus TEXT,
  backstory TEXT,
  personality_base JSONB,
  difficulty_level INTEGER NOT NULL DEFAULT 5 CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  current_mood JSONB,
  voice_config JSONB,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's interviewers
CREATE INDEX idx_interviewers_user ON interviewers(user_id);
CREATE INDEX idx_interviewers_type ON interviewers(interview_type);

-- ============================================
-- INTERVIEWER PERSONALITY TABLE
-- ============================================
CREATE TABLE interviewer_personality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interviewer_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE UNIQUE,
  communication_style JSONB,
  question_patterns JSONB,
  red_flags TEXT[],
  green_flags TEXT[],
  pet_peeves TEXT[],
  favorite_topics TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for interviewer lookup
CREATE INDEX idx_interviewer_personality_interviewer ON interviewer_personality(interviewer_id);

-- ============================================
-- USER RESUMES TABLE
-- ============================================
CREATE TABLE user_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  raw_text TEXT,
  parsed_data JSONB,
  skills TEXT[],
  experience_years INTEGER,
  target_role TEXT,
  target_company_type TEXT,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user's resumes
CREATE INDEX idx_user_resumes_user ON user_resumes(user_id);
CREATE INDEX idx_user_resumes_uploaded ON user_resumes(uploaded_at DESC);

-- ============================================
-- INTERVIEW SESSIONS TABLE
-- ============================================
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interviewer_id UUID NOT NULL REFERENCES interviewers(id) ON DELETE CASCADE,
  interview_type interview_type NOT NULL,
  target_role TEXT,
  target_company TEXT,
  difficulty INTEGER NOT NULL DEFAULT 5 CHECK (difficulty >= 1 AND difficulty <= 10),
  status session_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- Indexes for session queries
CREATE INDEX idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_sessions_user_status ON interview_sessions(user_id, status);
CREATE INDEX idx_sessions_started ON interview_sessions(started_at DESC);
CREATE INDEX idx_sessions_interviewer ON interview_sessions(interviewer_id);

-- ============================================
-- INTERVIEW MESSAGES TABLE
-- ============================================
CREATE TABLE interview_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  audio_url TEXT,
  response_time_seconds INTEGER,
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for message retrieval
CREATE INDEX idx_messages_session ON interview_messages(session_id);
CREATE INDEX idx_messages_session_created ON interview_messages(session_id, created_at);

-- ============================================
-- SESSION SCORES TABLE
-- ============================================
CREATE TABLE session_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE UNIQUE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  clarity_score INTEGER CHECK (clarity_score >= 0 AND clarity_score <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  technical_depth INTEGER CHECK (technical_depth >= 0 AND technical_depth <= 100),
  star_usage_score INTEGER CHECK (star_usage_score >= 0 AND star_usage_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  strengths TEXT[],
  improvements TEXT[],
  ai_feedback TEXT,
  interviewer_impression TEXT,
  key_moments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for score lookups
CREATE INDEX idx_scores_session ON session_scores(session_id);

-- ============================================
-- USER PROGRESS TABLE
-- ============================================
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  total_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  avg_score INTEGER,
  badges JSONB DEFAULT '[]'::jsonb,
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX idx_progress_user ON user_progress(user_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviewer_personality ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Interviewers policies
CREATE POLICY "Users can view own interviewers"
  ON interviewers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own interviewers"
  ON interviewers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interviewers"
  ON interviewers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interviewers"
  ON interviewers FOR DELETE
  USING (auth.uid() = user_id);

-- Interviewer personality policies
CREATE POLICY "Users can view own interviewer personalities"
  ON interviewer_personality FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviewers
      WHERE interviewers.id = interviewer_personality.interviewer_id
      AND interviewers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own interviewer personalities"
  ON interviewer_personality FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interviewers
      WHERE interviewers.id = interviewer_personality.interviewer_id
      AND interviewers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own interviewer personalities"
  ON interviewer_personality FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interviewers
      WHERE interviewers.id = interviewer_personality.interviewer_id
      AND interviewers.user_id = auth.uid()
    )
  );

-- User resumes policies
CREATE POLICY "Users can view own resumes"
  ON user_resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resumes"
  ON user_resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON user_resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON user_resumes FOR DELETE
  USING (auth.uid() = user_id);

-- Interview sessions policies
CREATE POLICY "Users can view own sessions"
  ON interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions"
  ON interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Interview messages policies
CREATE POLICY "Users can view own session messages"
  ON interview_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = interview_messages.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in own sessions"
  ON interview_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = interview_messages.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- Session scores policies
CREATE POLICY "Users can view own session scores"
  ON session_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = session_scores.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create scores for own sessions"
  ON session_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interview_sessions
      WHERE interview_sessions.id = session_scores.session_id
      AND interview_sessions.user_id = auth.uid()
    )
  );

-- User progress policies
CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress"
  ON user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO user_progress (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Function to update interviewer session count
CREATE OR REPLACE FUNCTION update_interviewer_session_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE interviewers
    SET total_sessions = total_sessions + 1
    WHERE id = NEW.interviewer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for interviewer session count
CREATE TRIGGER on_session_created
  AFTER INSERT ON interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_interviewer_session_count();

-- Function to update user progress after session completion
CREATE OR REPLACE FUNCTION update_user_progress_on_session_complete()
RETURNS TRIGGER AS $$
DECLARE
  session_duration_hours NUMERIC;
  new_avg_score INTEGER;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate duration in hours
    session_duration_hours := COALESCE(NEW.duration_seconds, 0) / 3600.0;
    
    -- Calculate new average score
    SELECT AVG(ss.overall_score)::INTEGER INTO new_avg_score
    FROM interview_sessions isess
    JOIN session_scores ss ON ss.session_id = isess.id
    WHERE isess.user_id = NEW.user_id
    AND ss.overall_score IS NOT NULL;
    
    -- Update progress
    UPDATE user_progress
    SET 
      total_sessions = total_sessions + 1,
      total_hours = total_hours + session_duration_hours,
      avg_score = new_avg_score,
      last_session_at = NOW(),
      current_streak = CASE 
        WHEN last_session_at IS NULL THEN 1
        WHEN DATE(last_session_at) = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
        WHEN DATE(last_session_at) = CURRENT_DATE THEN current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(
        longest_streak,
        CASE 
          WHEN last_session_at IS NULL THEN 1
          WHEN DATE(last_session_at) = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
          WHEN DATE(last_session_at) = CURRENT_DATE THEN current_streak
          ELSE 1
        END
      )
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for progress updates
CREATE TRIGGER on_session_completed
  AFTER UPDATE ON interview_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_progress_on_session_complete();

-- Function to reset monthly interview count (call via cron)
CREATE OR REPLACE FUNCTION reset_monthly_interviews()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET monthly_interviews_used = 0
  WHERE subscription_tier = 'free';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS (run in Supabase Dashboard)
-- ============================================
-- Note: Execute these in Supabase Dashboard > Storage
-- 
-- 1. Create bucket 'resumes' (private)
-- 2. Create bucket 'session-recordings' (private)
--
-- Storage policies will be configured in the dashboard
