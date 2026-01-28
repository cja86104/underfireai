# 🔥 UnderFireAI - Complete Blueprint

**Domain:** underfireai.com  
**Tagline:** "Train Under Fire. So the real thing feels easy."  
**Tech Stack:** Next.js 15, Supabase, Anthropic/DeepSeek, OpenAI TTS, Segmind  

---

## 📋 Executive Summary

UnderFireAI is an AI-powered interview coaching platform that uses **hidden interviewer personalities** to create realistic, unpredictable mock interviews. Users don't know if they're getting a tough skeptic or a friendly ally - just like real interviews.

**Core Differentiator:** Kirra's "blind date" backstory system applied to interview prep.

---

## 🔄 KIRRA SYSTEMS → UNDERFIREAI MAPPING

### ✅ DIRECTLY REUSABLE (Copy & Rename)

| Kirra System | UnderFireAI Equivalent | Files | Effort |
|--------------|------------------------|-------|--------|
| `lib/ai/chat-client.ts` | AI Interview Engine | 1 | Copy |
| `lib/ai/config.ts` | AI Config | 1 | Copy |
| `lib/tts/openai-tts.ts` | Voice Interview TTS | 1 | Copy |
| `lib/supabase/*` | Supabase setup | 4 | Copy |
| `components/ui/*` | UI Components | 14 | Copy |
| `components/chat/ChatWindow.tsx` | Interview Session UI | 1 | Modify |
| `components/chat/ChatInput.tsx` | Response Input | 1 | Modify |
| `components/chat/MessageBubble.tsx` | Q&A Display | 1 | Modify |
| `components/chat/VoiceConversationMode.tsx` | Voice Interview Mode | 1 | Modify |
| `components/chat/AudioPlayer.tsx` | TTS Playback | 1 | Copy |
| `components/chat/TypingIndicator.tsx` | Interviewer "thinking" | 1 | Copy |
| `app/api/voices/*` | Voice Selection API | 2 | Copy |
| `app/api/stripe/*` | Stripe Integration | 3 | Copy |
| `app/(auth)/*` | Auth Pages | 4 | Copy |
| `middleware.ts` | Auth Middleware | 1 | Copy |

**Subtotal: ~37 files directly reusable**

---

### 🔧 ADAPT & MODIFY (60-70% reusable)

| Kirra System | UnderFireAI Equivalent | Changes Needed |
|--------------|------------------------|----------------|
| `companions` table | `interviewers` table | Rename fields, add interview-specific columns |
| `companion_dna` table | `interviewer_personality` table | Adapt traits to interview styles |
| `backstory` field | `interviewer_background` field | Same concept, different content |
| `relationship_type` | `interview_type` | romantic/friend → behavioral/technical/panel |
| `lib/companion/memory-extraction.ts` | `lib/interview/resume-extraction.ts` | Extract user skills/experience instead |
| `generate-backstory/route.ts` | `generate-interviewer/route.ts` | Prompts change, structure stays |
| `generate-scene/route.ts` | `generate-environment/route.ts` | Office scenes instead of romantic |
| `chat/route.ts` | `interview/route.ts` | Core chat logic, different system prompts |
| `needs-system.ts` | `performance-metrics.ts` | Track confidence/clarity instead of needs |
| `mood-analysis.ts` | `response-analysis.ts` | Analyze interview answers |

**Subtotal: ~15 files need moderate adaptation**

---

### 🆕 BUILD FROM SCRATCH

| Feature | Description | Priority |
|---------|-------------|----------|
| **Resume Upload & Parser** | PDF/text resume → structured data | P0 |
| **Interview Type System** | Behavioral, Technical, Case, HR, Panel | P0 |
| **Question Bank** | AI-generated + curated questions by role | P0 |
| **STAR Response Analyzer** | Detect Situation/Task/Action/Result structure | P0 |
| **Performance Scoring** | Rate clarity, confidence, technical depth | P0 |
| **Session Recording** | Save full interview for replay | P1 |
| **Feedback Dashboard** | Strengths/weaknesses over time | P1 |
| **Interview History** | Past sessions with scores | P1 |
| **Company Profiles** | FAANG-style, startup, consulting, etc. | P1 |
| **Role Templates** | SWE, PM, Designer, Sales, etc. | P1 |
| **Difficulty Levels** | Junior → Senior → Executive | P2 |
| **Time Pressure Mode** | Countdown timer for responses | P2 |
| **Streaks & Badges** | Gamification | P2 |

---

## 🗄️ DATABASE SCHEMA

### From Kirra (Adapted)

```sql
-- INTERVIEWER (adapted from companions)
CREATE TABLE interviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  avatar_url TEXT,
  interview_type interview_type NOT NULL, -- behavioral, technical, case, hr, panel
  company_style company_style, -- faang, startup, consulting, enterprise
  role_focus TEXT, -- SWE, PM, Design, etc.
  backstory TEXT, -- Hidden personality/background
  personality_base JSONB, -- Big Five adapted
  difficulty_level INTEGER DEFAULT 5, -- 1-10
  current_mood JSONB, -- skeptical, friendly, neutral, tough
  voice_config JSONB,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEWER DNA (adapted from companion_dna)
CREATE TABLE interviewer_personality (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interviewer_id UUID REFERENCES interviewers(id) UNIQUE,
  communication_style JSONB, -- direct, probing, supportive, challenging
  question_patterns JSONB, -- follow-up tendencies, depth preference
  red_flags JSONB, -- what triggers skepticism
  green_flags JSONB, -- what impresses this interviewer
  pet_peeves TEXT[], -- answers they hate
  favorite_topics TEXT[], -- topics they dig into
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Tables

```sql
-- USER RESUME (new)
CREATE TABLE user_resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  raw_text TEXT,
  parsed_data JSONB, -- structured extraction
  skills TEXT[],
  experience_years INTEGER,
  target_role TEXT,
  target_company_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTERVIEW SESSIONS (adapted from conversations)
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  interviewer_id UUID REFERENCES interviewers(id),
  interview_type interview_type,
  target_role TEXT,
  target_company TEXT,
  difficulty INTEGER,
  status session_status, -- in_progress, completed, abandoned
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- INTERVIEW MESSAGES (adapted from messages)
CREATE TABLE interview_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES interview_sessions(id),
  role message_role, -- interviewer, candidate
  content TEXT,
  audio_url TEXT,
  response_time_seconds INTEGER, -- how long user took
  analysis JSONB, -- STAR detection, confidence score, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SESSION SCORES (new)
CREATE TABLE session_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES interview_sessions(id) UNIQUE,
  overall_score INTEGER, -- 1-100
  clarity_score INTEGER,
  confidence_score INTEGER,
  technical_depth INTEGER,
  star_usage_score INTEGER,
  communication_score INTEGER,
  strengths TEXT[],
  improvements TEXT[],
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER PROGRESS (new)
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  total_sessions INTEGER DEFAULT 0,
  total_hours NUMERIC(6,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  avg_score INTEGER,
  badges JSONB DEFAULT '[]',
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENUMS
CREATE TYPE interview_type AS ENUM (
  'behavioral', 'technical', 'case', 'hr', 'panel', 'phone_screen'
);

CREATE TYPE company_style AS ENUM (
  'faang', 'startup', 'consulting', 'enterprise', 'agency', 'government'
);

CREATE TYPE session_status AS ENUM (
  'in_progress', 'completed', 'abandoned', 'paused'
);
```

---

## 📁 PROJECT STRUCTURE

```
underfireai/
├── app/
│   ├── (auth)/                    # 🔄 FROM KIRRA
│   │   ├── login/
│   │   ├── register/
│   │   └── callback/
│   ├── (dashboard)/
│   │   ├── dashboard/             # 🆕 Progress overview
│   │   ├── interview/             
│   │   │   ├── new/               # 🆕 Start new session
│   │   │   └── [sessionId]/       # 🔧 ADAPT chat window
│   │   ├── history/               # 🆕 Past sessions
│   │   ├── resume/                # 🆕 Upload/manage resume
│   │   ├── interviewers/          # 🔧 ADAPT companion browser
│   │   ├── progress/              # 🆕 Analytics dashboard
│   │   └── settings/              # 🔄 FROM KIRRA
│   ├── api/
│   │   ├── auth/                  # 🔄 FROM KIRRA
│   │   ├── interview/
│   │   │   ├── [id]/
│   │   │   │   ├── chat/          # 🔧 ADAPT companion chat
│   │   │   │   ├── speak/         # 🔄 FROM KIRRA
│   │   │   │   ├── analyze/       # 🆕 Analyze response
│   │   │   │   └── score/         # 🆕 Score session
│   │   │   ├── generate-interviewer/ # 🔧 ADAPT generate-backstory
│   │   │   └── generate-scene/    # 🔧 ADAPT (office environments)
│   │   ├── resume/
│   │   │   ├── upload/            # 🆕 Parse resume
│   │   │   └── extract/           # 🆕 Extract skills
│   │   ├── progress/              # 🆕 User stats
│   │   ├── voices/                # 🔄 FROM KIRRA
│   │   └── stripe/                # 🔄 FROM KIRRA
│   └── layout.tsx
├── components/
│   ├── ui/                        # 🔄 FROM KIRRA (14 files)
│   ├── interview/
│   │   ├── InterviewWindow.tsx    # 🔧 ADAPT ChatWindow
│   │   ├── QuestionDisplay.tsx    # 🔧 ADAPT MessageBubble
│   │   ├── ResponseInput.tsx      # 🔧 ADAPT ChatInput
│   │   ├── VoiceMode.tsx          # 🔧 ADAPT VoiceConversationMode
│   │   ├── TimerDisplay.tsx       # 🆕 Response countdown
│   │   ├── ScoreCard.tsx          # 🆕 Post-session score
│   │   └── FeedbackPanel.tsx      # 🆕 AI feedback display
│   ├── interviewer/
│   │   ├── InterviewerCard.tsx    # 🔧 ADAPT companion card
│   │   ├── BackgroundGenerator.tsx # 🔧 ADAPT BackstoryGenerator
│   │   └── PersonalityConfig.tsx  # 🔧 ADAPT personality sliders
│   ├── resume/
│   │   ├── ResumeUpload.tsx       # 🆕
│   │   ├── ResumePreview.tsx      # 🆕
│   │   └── SkillsEditor.tsx       # 🆕
│   ├── progress/
│   │   ├── StreakDisplay.tsx      # 🆕
│   │   ├── ScoreChart.tsx         # 🆕
│   │   └── BadgeGrid.tsx          # 🆕
│   └── layout/                    # 🔄 FROM KIRRA
├── lib/
│   ├── ai/                        # 🔄 FROM KIRRA
│   │   ├── chat-client.ts
│   │   └── config.ts
│   ├── interview/
│   │   ├── question-generator.ts  # 🆕 Generate questions
│   │   ├── response-analyzer.ts   # 🆕 STAR detection
│   │   ├── score-calculator.ts    # 🆕 Calculate scores
│   │   ├── interviewer-prompts.ts # 🆕 System prompts
│   │   └── feedback-generator.ts  # 🆕 Generate feedback
│   ├── resume/
│   │   ├── parser.ts              # 🆕 PDF/text parsing
│   │   └── skill-extractor.ts     # 🆕 AI skill extraction
│   ├── tts/                       # 🔄 FROM KIRRA
│   │   └── openai-tts.ts
│   ├── supabase/                  # 🔄 FROM KIRRA
│   └── utils/                     # 🔄 FROM KIRRA
├── types/
│   ├── database.ts                # 🔧 ADAPT for interview tables
│   ├── interview.ts               # 🆕 Interview types
│   ├── interviewer.ts             # 🆕 Interviewer types
│   └── scoring.ts                 # 🆕 Scoring types
└── supabase/
    └── migrations/                # 🔧 New schema

---

Legend:
🔄 = Copy directly from Kirra
🔧 = Adapt/modify from Kirra (60-80% reusable)
🆕 = Build from scratch
```

---

## 🎭 INTERVIEWER ARCHETYPES

These are the "hidden backstories" that create unpredictability:

### The Skeptic
- **Personality:** Doubts everything, wants proof
- **Behavior:** "That's interesting, but can you give me a specific example?"
- **Red flags:** Vague answers, no metrics
- **Mood shifts:** Impressed by data, numbers, specifics

### The Griller
- **Personality:** Deep technical dives
- **Behavior:** "Let's go deeper on that architecture decision..."
- **Red flags:** Surface-level technical knowledge
- **Mood shifts:** Loves when you admit what you don't know

### The Friendly
- **Personality:** Warm, supportive
- **Behavior:** Creates comfort, then surprises with hard questions
- **Red flags:** Arrogance, dismissiveness
- **Mood shifts:** Responds to humility and authenticity

### The Silent Judge
- **Personality:** Minimal feedback, poker face
- **Behavior:** Short responses, long pauses
- **Red flags:** Need for validation
- **Mood shifts:** Internal - you won't know until the end

### The Rapid Fire
- **Personality:** Fast-paced, time pressure
- **Behavior:** Quick follow-ups, interruptions
- **Red flags:** Long-winded answers
- **Mood shifts:** Appreciates concise, structured responses

### The Culture Fit
- **Personality:** Values-focused, team dynamics
- **Behavior:** "Tell me about a time you disagreed with your team..."
- **Red flags:** Blame-shifting, lone wolf mentality
- **Mood shifts:** Loves collaboration stories

---

## 🔄 ADAPTATION DETAILS

### Chat Route Adaptation

**Kirra:** `app/api/companion/[id]/chat/route.ts`
**UnderFire:** `app/api/interview/[id]/chat/route.ts`

Key changes:
1. System prompt becomes interview-focused
2. Memory injection → Resume/skills injection
3. Mood evolution → Interviewer impression tracking
4. Backstory context → Interviewer archetype behavior
5. Add: Question selection logic
6. Add: Response analysis inline
7. Add: Time tracking per response

### Scene Generation Adaptation

**Kirra:** Romantic bedroom, coffee shop, etc.
**UnderFire:** Office environments only

| Interview Type | Scene |
|----------------|-------|
| FAANG | Modern tech office, whiteboard, glass walls |
| Startup | Casual open office, standing desks, snacks |
| Consulting | Formal conference room, mahogany, city view |
| Enterprise | Corporate boardroom, large table |
| Phone Screen | Split screen: your home office + their office |

### Personality Adaptation

**Kirra Big Five:**
- Openness
- Conscientiousness  
- Extraversion
- Agreeableness
- Neuroticism

**UnderFire Interview Traits:**
- Directness (0-100): How blunt vs. diplomatic
- Depth Preference (0-100): Surface vs. deep dives
- Warmth (0-100): Cold vs. friendly
- Patience (0-100): Quick follow-ups vs. letting you think
- Technical Focus (0-100): Soft skills vs. hard skills
- Skepticism (0-100): Trusting vs. needs proof

---

## 📊 SCORING SYSTEM

### Per-Response Analysis
```typescript
interface ResponseAnalysis {
  starScore: number;      // 0-100: Did they use STAR format?
  clarityScore: number;   // 0-100: Was it clear and structured?
  confidenceScore: number; // 0-100: Voice/text confidence markers
  relevanceScore: number;  // 0-100: Did it answer the question?
  depthScore: number;      // 0-100: Sufficient detail?
  responseTime: number;    // Seconds to respond
  wordCount: number;
  fillerWords: string[];   // "um", "like", "you know"
}
```

### Session Summary
```typescript
interface SessionScore {
  overallScore: number;    // 0-100 weighted average
  categoryScores: {
    communication: number;
    technicalDepth: number;
    behavioralExamples: number;
    cultureFit: number;
    problemSolving: number;
  };
  strengths: string[];
  improvements: string[];
  interviewerImpression: string; // AI-generated "how the interviewer felt"
  keyMoments: {
    timestamp: number;
    type: 'strong' | 'weak' | 'turning_point';
    description: string;
  }[];
}
```

---

## 🚀 BUILD ORDER (Phases)

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Next.js 15, Supabase, Tailwind)
- [ ] Copy Kirra UI components
- [ ] Copy auth system
- [ ] Copy Stripe integration
- [ ] Database schema migration
- [ ] Basic layouts and navigation

### Phase 2: Core Interview Engine (Week 2)
- [ ] Interviewer table + personality system
- [ ] Adapt chat route for interviews
- [ ] System prompts for each archetype
- [ ] Basic interview flow (start → questions → end)
- [ ] Session recording to database

### Phase 3: Voice & Backstory (Week 3)
- [ ] Copy TTS system
- [ ] Adapt voice conversation mode
- [ ] Backstory generator for interviewers
- [ ] Dynamic personality injection
- [ ] Interviewer "mood" shifts based on answers

### Phase 4: Resume Integration (Week 4)
- [ ] Resume upload component
- [ ] PDF/text parsing
- [ ] AI skill extraction
- [ ] Resume injection into interviews
- [ ] "Tell me about [specific resume item]" generation

### Phase 5: Scoring & Feedback (Week 5)
- [ ] Response analysis engine
- [ ] STAR detection
- [ ] Confidence scoring
- [ ] Session summary generation
- [ ] Feedback dashboard

### Phase 6: Scene Generation & Polish (Week 6)
- [ ] Adapt scene generator for office environments
- [ ] Progress tracking system
- [ ] Streaks and badges
- [ ] Interview history browser
- [ ] Mobile responsiveness

### Phase 7: Advanced Features (Week 7+)
- [ ] Panel interviews (multiple AI interviewers)
- [ ] Technical coding interviews
- [ ] Case study interviews
- [ ] Company-specific prep (FAANG profiles)
- [ ] Session replay/review mode

---

## 💰 PRICING TIERS

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 3 interviews/month, basic feedback |
| **Pro** | $19/mo | Unlimited interviews, voice mode, full analytics |
| **Premium** | $39/mo | All above + resume coaching, company profiles, priority support |

---

## 🔧 ENVIRONMENT VARIABLES

```env
# From Kirra (same)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=
SEGMIND_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# New for UnderFireAI
NEXT_PUBLIC_APP_NAME=UnderFireAI
NEXT_PUBLIC_APP_URL=https://underfireai.com
```

---

## 📈 SUCCESS METRICS

- Sessions per user per week
- Average session score improvement over time
- Completion rate (finished vs abandoned)
- Voice mode adoption rate
- Free → Paid conversion
- User retention (30/60/90 day)

---

## 🎯 THE MAGIC (From Kirra)

The key insight from Kirra that makes this special:

> **"You don't know who's interviewing you until you're in it."**

Just like Kirra's "blind date" with companions, users will:
1. Start an interview
2. Discover the interviewer's personality through interaction
3. Adapt their approach in real-time
4. Get genuinely surprised by tough questions
5. Feel the pressure of a REAL interview

**The backstory you never read becomes the interviewer you never expected.**

---

## 📝 HANDOFF NOTES

When starting a new chat:
1. Share this document
2. Reference Kirra codebase for "🔄" and "🔧" items
3. Start with Phase 1 foundation
4. Follow production standards (no mocks, full code, cache_control)
5. Use the same text-slate-900 pattern for inputs
6. All AI routes need cache_control: { type: 'ephemeral' }

---

**Ready to build UnderFireAI.** 🔥
