-- ============================================
-- RESUME COACHING FEATURE
-- Adds resume insights and job description analysis
-- ============================================

-- ============================================
-- RESUME INSIGHTS TABLE
-- Stores alignment analysis, vulnerability scans, and suggestions
-- ============================================
CREATE TABLE resume_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES user_resumes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE SET NULL,

  -- Insight type
  insight_type TEXT NOT NULL CHECK (insight_type IN ('alignment', 'vulnerability', 'suggestion', 'gap_analysis')),

  -- Alignment analysis (post-interview)
  alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
  discrepancies JSONB DEFAULT '[]'::jsonb,
  confirmations JSONB DEFAULT '[]'::jsonb,

  -- Vulnerability scan
  vulnerabilities JSONB DEFAULT '[]'::jsonb,
  vulnerability_score INTEGER CHECK (vulnerability_score >= 0 AND vulnerability_score <= 100),

  -- Suggestions
  resume_suggestions JSONB DEFAULT '[]'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for resume insights
CREATE INDEX idx_resume_insights_user ON resume_insights(user_id);
CREATE INDEX idx_resume_insights_resume ON resume_insights(resume_id);
CREATE INDEX idx_resume_insights_session ON resume_insights(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_resume_insights_type ON resume_insights(user_id, insight_type);
CREATE INDEX idx_resume_insights_created ON resume_insights(created_at DESC);

-- ============================================
-- JOB DESCRIPTIONS TABLE
-- Stores parsed job descriptions for gap analysis
-- ============================================
CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Raw input
  raw_text TEXT NOT NULL,
  source_url TEXT,
  company_name TEXT,
  role_title TEXT,

  -- Parsed requirements
  required_skills TEXT[] DEFAULT '{}',
  preferred_skills TEXT[] DEFAULT '{}',
  experience_requirements JSONB,
  education_requirements JSONB,
  responsibilities TEXT[] DEFAULT '{}',

  -- Gap analysis results (linked to resume at analysis time)
  resume_id UUID REFERENCES user_resumes(id) ON DELETE SET NULL,
  match_percentage INTEGER CHECK (match_percentage >= 0 AND match_percentage <= 100),
  matched_skills TEXT[] DEFAULT '{}',
  missing_required TEXT[] DEFAULT '{}',
  missing_preferred TEXT[] DEFAULT '{}',
  additional_skills TEXT[] DEFAULT '{}',
  narrative_gaps JSONB DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

-- Indexes for job descriptions
CREATE INDEX idx_job_descriptions_user ON job_descriptions(user_id);
CREATE INDEX idx_job_descriptions_created ON job_descriptions(created_at DESC);
CREATE INDEX idx_job_descriptions_resume ON job_descriptions(resume_id) WHERE resume_id IS NOT NULL;

-- ============================================
-- EXTEND SESSION_SCORES TABLE
-- Track resume alignment generation
-- ============================================
ALTER TABLE session_scores
  ADD COLUMN IF NOT EXISTS resume_alignment_generated BOOLEAN DEFAULT FALSE;

ALTER TABLE session_scores
  ADD COLUMN IF NOT EXISTS resume_insight_id UUID REFERENCES resume_insights(id) ON DELETE SET NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE resume_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;

-- Resume insights policies
CREATE POLICY "Users can view own resume insights"
  ON resume_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own resume insights"
  ON resume_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resume insights"
  ON resume_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resume insights"
  ON resume_insights FOR DELETE
  USING (auth.uid() = user_id);

-- Job descriptions policies
CREATE POLICY "Users can view own job descriptions"
  ON job_descriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own job descriptions"
  ON job_descriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own job descriptions"
  ON job_descriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own job descriptions"
  ON job_descriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTION: Get user's active resume
-- ============================================
CREATE OR REPLACE FUNCTION get_active_resume(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_resume_id UUID;
BEGIN
  SELECT id INTO v_resume_id
  FROM user_resumes
  WHERE user_id = p_user_id
  ORDER BY uploaded_at DESC
  LIMIT 1;

  RETURN v_resume_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Count user's JD analyses this month
-- ============================================
CREATE OR REPLACE FUNCTION count_monthly_jd_analyses(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM job_descriptions
  WHERE user_id = p_user_id
    AND analyzed_at IS NOT NULL
    AND analyzed_at >= date_trunc('month', CURRENT_TIMESTAMP);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
