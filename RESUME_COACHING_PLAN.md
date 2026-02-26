# Resume Coaching Feature Plan

## Overview

Transform UnderFireAI from "interview practice" into "interview + resume coaching" by deeply integrating resume analysis with interview performance. This creates a unique feedback loop that no other tool offers: **your interviews inform your resume, and your resume informs your interviews**.

Available to all paid tiers (Pro and Premium).

---

## Core Features

### 1. Resume ↔ Interview Alignment Analysis

**What it does**: After each interview, compare what the resume claims vs. how the candidate actually performed.

**Examples**:
- "Resume claims '5 years React experience' but struggled to explain useCallback vs useMemo"
- "Resume mentions 'led team of 8' but provided vague answers about conflict resolution"
- "Strong technical depth shown on system design - consider adding more architecture projects to resume"

**Data flow**:
```
[User Resume] + [Interview Transcript] + [Message Analyses]
    → AI Alignment Analysis
    → Discrepancies + Confirmations + Suggestions
```

**Value**: Exposes resume "weak spots" that interviewers will probe.

---

### 2. Resume Vulnerability Scanner

**What it does**: Proactively scan resume for claims an interviewer would challenge, and generate the exact questions they'd ask.

**Examples**:
- Vague bullet: "Improved system performance" → Question: "What specific metrics did you improve and by how much?"
- Buzzword stacking: "Leveraged AI/ML to drive innovation" → Question: "Walk me through the ML model you built. What was the training data?"
- Missing context: "Managed $2M budget" → Question: "What was your actual decision-making authority? Who approved expenditures?"

**Output**:
- List of vulnerable claims with severity (High/Medium/Low)
- Generated probing questions for each
- "Practice This" button → launches targeted interview session

---

### 3. Post-Interview Resume Suggestions

**What it does**: After completing interviews, generate specific resume improvements based on actual performance.

**Examples**:
- "You articulated your system design decisions clearly - add a bullet about designing the payment microservice"
- "Your leadership story about the offshore team was compelling - quantify the team size and timeline"
- "You mentioned cost savings of 40% but it's not on your resume - add it to your AWS experience"

**Value**: Captures the "best version" of the candidate that emerged during practice.

---

### 4. Job Description Gap Analysis ("Reverse Engineering")

**What it does**: Paste a job description, get instant gap analysis against resume, and generate targeted practice.

**Examples**:
- JD requires: "Experience with Kubernetes" → Resume: Not mentioned → Gap identified
- JD requires: "Led cross-functional teams" → Resume: "Team lead" → Partial match, needs strengthening
- JD requires: "Series B+ startup experience" → Resume: Fortune 500 only → Narrative gap

**Output**:
- Match percentage with breakdown
- Missing required skills (critical)
- Missing preferred skills (nice-to-have)
- Skills on resume not in JD (differentiation opportunities)
- "Generate Practice Session" → interviews targeting the gaps

---

## Database Schema

### New Table: `resume_insights`

```sql
CREATE TABLE resume_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES user_resumes(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE SET NULL,

  -- Alignment analysis (post-interview)
  alignment_score INTEGER CHECK (alignment_score >= 0 AND alignment_score <= 100),
  discrepancies JSONB,  -- [{claim, evidence, severity, suggestion}]
  confirmations JSONB,  -- [{claim, evidence}]

  -- Vulnerability scan
  vulnerabilities JSONB, -- [{claim, severity, probing_questions[], suggested_fix}]
  vulnerability_score INTEGER,

  -- Suggestions
  resume_suggestions JSONB, -- [{type, current_text, suggested_text, source_quote}]

  insight_type TEXT NOT NULL, -- 'alignment', 'vulnerability', 'suggestion', 'gap_analysis'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resume_insights_user ON resume_insights(user_id);
CREATE INDEX idx_resume_insights_resume ON resume_insights(resume_id);
CREATE INDEX idx_resume_insights_session ON resume_insights(session_id);
```

### New Table: `job_descriptions`

```sql
CREATE TABLE job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Raw input
  raw_text TEXT NOT NULL,
  source_url TEXT,
  company_name TEXT,
  role_title TEXT,

  -- Parsed data
  required_skills TEXT[],
  preferred_skills TEXT[],
  experience_requirements JSONB, -- {min_years, max_years, specific_domains[]}
  education_requirements JSONB,
  responsibilities TEXT[],

  -- Gap analysis results (against active resume)
  resume_id UUID REFERENCES user_resumes(id),
  match_percentage INTEGER,
  matched_skills TEXT[],
  missing_required TEXT[],
  missing_preferred TEXT[],
  additional_skills TEXT[], -- On resume but not in JD
  narrative_gaps JSONB, -- [{area, gap_description, coaching_tip}]

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

CREATE INDEX idx_job_descriptions_user ON job_descriptions(user_id);
```

### Extend `session_scores` table

```sql
ALTER TABLE session_scores ADD COLUMN IF NOT EXISTS
  resume_alignment_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE session_scores ADD COLUMN IF NOT EXISTS
  resume_insight_id UUID REFERENCES resume_insights(id);
```

---

## API Endpoints

### Resume Analysis Endpoints

```
POST /api/resume/analyze-alignment
  Body: { sessionId: string }
  Returns: { alignmentScore, discrepancies[], confirmations[], suggestions[] }

POST /api/resume/scan-vulnerabilities
  Body: { resumeId?: string } (defaults to active resume)
  Returns: { vulnerabilityScore, vulnerabilities[], practiceTopics[] }

POST /api/resume/suggestions
  Body: { sessionIds: string[] } (analyze multiple sessions)
  Returns: { suggestions[], improvedBullets[] }
```

### Job Description Endpoints

```
POST /api/job-description/parse
  Body: { rawText: string, sourceUrl?: string }
  Returns: { id, company, role, requiredSkills[], preferredSkills[] }

POST /api/job-description/:id/analyze
  Body: { resumeId?: string }
  Returns: { matchPercentage, gaps, recommendations[] }

POST /api/job-description/:id/generate-practice
  Body: { focusAreas?: string[] }
  Returns: { sessionConfig } (ready to start interview)
```

---

## UI Components

### 1. ResumeAlignmentPanel
**Location**: Interview Results page (new tab)
**Shows**:
- Overall alignment score (ring visualization)
- Discrepancies list with severity badges
- Confirmations list (things you proved)
- "Improve Resume" suggestions with copy buttons

### 2. VulnerabilityScannerCard
**Location**: Dashboard + Resume page
**Shows**:
- Vulnerability score (lower = better)
- Top 3 vulnerable claims with expand
- "Practice Defending" button per vulnerability
- Full scan expandable

### 3. JobDescriptionAnalyzer
**Location**: New page `/dashboard/job-analysis`
**Shows**:
- Paste JD textarea
- Live parsing preview
- Gap analysis results
- "Generate Practice Interview" button
- Save JD for tracking

### 4. ResumeSuggestionsDrawer
**Location**: Triggered from results or dashboard
**Shows**:
- Before/After text comparisons
- Source quotes from interviews
- "Apply to Resume" functionality (if we add editor)
- Export suggestions as markdown

### 5. ResumeHealthScore
**Location**: Dashboard sidebar
**Shows**:
- Composite score from:
  - Alignment across sessions
  - Vulnerability score
  - Completeness (skills coverage)
- Trend over time
- Quick actions

---

## Integration Points

### 1. Interview Setup Enhancement
```typescript
// When starting interview, optionally target resume weak spots
interface EnhancedSessionConfig {
  // existing fields...

  // New: Resume-informed targeting
  targetResumeWeakSpots?: boolean;  // Focus on vulnerable claims
  targetJobDescription?: string;     // JD ID to practice for

  // System prompt enhancement
  resumeContext?: {
    vulnerabilities: string[];
    gapsToProbe: string[];
  };
}
```

### 2. Scoring Route Enhancement
```typescript
// In /api/interview/[sessionId]/score/route.ts
// After generating scores, trigger alignment analysis

if (user.subscriptionTier !== 'free') {
  const resume = await getActiveResume(user.id);
  if (resume) {
    const alignment = await generateAlignmentAnalysis(
      resume,
      messages,
      scores
    );
    await saveResumeInsight(alignment);
  }
}
```

### 3. Interview Prompt Enhancement
```typescript
// When resume vulnerabilities are targeted
const systemPrompt = `
${basePrompt}

CANDIDATE RESUME CONTEXT:
The candidate claims: "${vulnerability.claim}"
This is potentially weak because: ${vulnerability.reason}

Your task: Probe this claim with follow-up questions.
Ask for specific metrics, timelines, and examples.
Don't accept vague answers - push for details.
`;
```

---

## AI Prompts

### Alignment Analysis Prompt
```
You are an expert interview coach analyzing resume-interview alignment.

RESUME CLAIMS:
${resumeBullets}

INTERVIEW PERFORMANCE:
${transcriptSummary}

SCORES:
- Technical Depth: ${scores.technical_depth}%
- Communication: ${scores.communication_score}%
- STAR Usage: ${scores.star_usage_score}%

Analyze alignment between resume claims and demonstrated abilities.

Return JSON:
{
  "alignmentScore": 0-100,
  "discrepancies": [
    {
      "claim": "Resume text...",
      "evidence": "What happened in interview...",
      "severity": "high|medium|low",
      "suggestion": "How to improve..."
    }
  ],
  "confirmations": [
    {
      "claim": "Resume text...",
      "evidence": "Strong example from interview..."
    }
  ],
  "suggestions": [
    {
      "type": "add|modify|remove",
      "currentText": "...",
      "suggestedText": "...",
      "reason": "..."
    }
  ]
}
```

### Vulnerability Scanner Prompt
```
You are a skeptical interviewer reviewing a resume for weak points.

RESUME:
${resumeText}

TARGET ROLE: ${targetRole}

Identify claims that:
1. Lack specificity (no metrics, vague impact)
2. Use buzzwords without substance
3. Claim expertise that's hard to verify
4. Have logical gaps (timelines, scope)
5. Overstate responsibility or impact

Return JSON:
{
  "vulnerabilities": [
    {
      "claim": "The exact text from resume",
      "severity": "high|medium|low",
      "reason": "Why this is vulnerable",
      "probingQuestions": [
        "Specific question an interviewer would ask",
        "Follow-up if they give vague answer"
      ],
      "suggestedFix": "How to strengthen this claim"
    }
  ],
  "overallScore": 0-100 (100 = very vulnerable)
}
```

---

## Implementation Phases

### Phase 1: Foundation (Database + Core Analysis)
1. Create database migration for new tables
2. Implement `resume_insights` service
3. Build alignment analysis AI pipeline
4. Add vulnerability scanner AI pipeline
5. Create basic API endpoints

### Phase 2: UI Integration
1. Add ResumeAlignmentPanel to results page
2. Build VulnerabilityScannerCard for dashboard
3. Create ResumeSuggestionsDrawer
4. Add ResumeHealthScore widget

### Phase 3: Job Description Analysis
1. Build JD parser
2. Create gap analysis logic
3. Build JobDescriptionAnalyzer page
4. Implement practice session generation from gaps

### Phase 4: Deep Integration
1. Enhance interview setup with resume targeting
2. Modify AI prompts to probe vulnerabilities
3. Add cross-session suggestion aggregation
4. Build progress tracking over time

---

## Feature Gating

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Basic Interview Practice | Yes (limited) | Yes | Yes |
| Resume Upload | Yes | Yes | Yes |
| Alignment Analysis | No | Yes | Yes |
| Vulnerability Scanner | No | Yes | Yes |
| Post-Interview Suggestions | No | Yes | Yes |
| JD Gap Analysis | No | Limited (3/mo) | Unlimited |
| Resume-Targeted Practice | No | No | Yes |
| Progress Tracking | No | Yes | Yes |

---

## Success Metrics

1. **Engagement**: % of paid users who upload resume
2. **Value**: Alignment score improvement over time
3. **Retention**: Users who use resume features have higher retention
4. **Conversion**: Free users who see "resume insights locked" convert at higher rate

---

## Technical Notes

### Existing Infrastructure to Leverage
- `extractSkills()` in `lib/resume/skill-extractor.ts` - categorizes skills
- `analyzeSkillsForRole()` - already does gap analysis for skills
- `matchSkillsToRequirements()` - matches skills to requirements
- `generateInterviewTopics()` - creates topics from skills
- Message analysis with `ResponseAnalysis` type - has per-message scores
- Scoring weights in `AI_MODELS.ANALYSIS` - for interview evaluation

### New AI Model Requirements
- Alignment analysis: Use `AI_MODELS.ANALYSIS` (GPT-4)
- Vulnerability scanning: Use `AI_MODELS.ANALYSIS` (GPT-4)
- JD parsing: Use `AI_MODELS.RESUME_PARSE` (GPT-3.5, fast)

### Performance Considerations
- Run vulnerability scan async (background job)
- Cache JD parsing results
- Alignment analysis runs post-score (already async)
- Aggregate suggestions across sessions lazily

---

## Files to Create/Modify

### New Files
```
lib/resume/alignment-analyzer.ts      - Core alignment logic
lib/resume/vulnerability-scanner.ts   - Vulnerability detection
lib/resume/suggestion-generator.ts    - Post-interview suggestions
lib/job-description/parser.ts         - JD parsing
lib/job-description/gap-analyzer.ts   - Gap analysis

app/api/resume/analyze-alignment/route.ts
app/api/resume/scan-vulnerabilities/route.ts
app/api/resume/suggestions/route.ts
app/api/job-description/route.ts
app/api/job-description/[id]/analyze/route.ts
app/api/job-description/[id]/generate-practice/route.ts

components/resume/alignment-panel.tsx
components/resume/vulnerability-card.tsx
components/resume/suggestions-drawer.tsx
components/resume/health-score.tsx
components/job-description/analyzer.tsx
components/job-description/gap-results.tsx

app/(dashboard)/job-analysis/page.tsx

supabase/migrations/20250301000000_resume_coaching.sql
```

### Modified Files
```
app/api/interview/[sessionId]/score/route.ts  - Trigger alignment analysis
app/(dashboard)/interview/[sessionId]/results/page.tsx - Add alignment tab
components/dashboard/sidebar.tsx - Add job analysis link
lib/interview/prompt-builder.ts - Add resume context to prompts
```
