/**
 * UnderFireAI Scoring Types
 * Types for the response analysis and session scoring system
 */

// ============================================
// RESPONSE ANALYSIS
// ============================================
export interface ResponseAnalysisInput {
  question: string;
  questionType: string;
  questionCategory: string;
  answer: string;
  responseTimeSeconds: number;
  interviewContext: {
    role: string;
    company?: string;
    interviewType: string;
  };
}

export interface ResponseAnalysisResult {
  scores: ResponseScores;
  starAnalysis: STARAnalysis;
  contentAnalysis: ContentAnalysis;
  communicationAnalysis: CommunicationAnalysis;
  suggestions: string[];
}

export interface ResponseScores {
  overall: number;        // 0-100
  star: number;           // 0-100
  clarity: number;        // 0-100
  confidence: number;     // 0-100
  relevance: number;      // 0-100
  depth: number;          // 0-100
}

// ============================================
// STAR FORMAT ANALYSIS
// ============================================
export interface STARAnalysis {
  detected: boolean;
  completeness: STARCompleteness;
  components: STARComponents;
  feedback: string;
}

export interface STARCompleteness {
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  score: number; // 0-100 based on how complete
}

export interface STARComponents {
  situation?: {
    text: string;
    quality: 'weak' | 'adequate' | 'strong';
    feedback: string;
  };
  task?: {
    text: string;
    quality: 'weak' | 'adequate' | 'strong';
    feedback: string;
  };
  action?: {
    text: string;
    quality: 'weak' | 'adequate' | 'strong';
    specificity: number; // 0-100
    feedback: string;
  };
  result?: {
    text: string;
    quality: 'weak' | 'adequate' | 'strong';
    quantified: boolean;
    feedback: string;
  };
}

// ============================================
// CONTENT ANALYSIS
// ============================================
export interface ContentAnalysis {
  keyPoints: KeyPoint[];
  missingElements: string[];
  strengthAreas: string[];
  weaknessAreas: string[];
  technicalAccuracy?: TechnicalAccuracy;
}

export interface KeyPoint {
  point: string;
  relevance: 'high' | 'medium' | 'low';
  impact: 'positive' | 'neutral' | 'negative';
}

export interface TechnicalAccuracy {
  score: number;
  correctConcepts: string[];
  incorrectConcepts: string[];
  missingConcepts: string[];
}

// ============================================
// COMMUNICATION ANALYSIS
// ============================================
export interface CommunicationAnalysis {
  wordCount: number;
  estimatedDuration: number;
  pace: 'too_short' | 'concise' | 'appropriate' | 'verbose' | 'too_long';
  structure: 'unstructured' | 'partially_structured' | 'well_structured';
  fillerWords: FillerWordAnalysis;
  confidenceIndicators: ConfidenceAnalysis;
  clarityScore: number;
}

export interface FillerWordAnalysis {
  count: number;
  words: { word: string; count: number }[];
  percentage: number;
  severity: 'none' | 'minor' | 'moderate' | 'severe';
}

export interface ConfidenceAnalysis {
  score: number;
  positiveIndicators: string[];
  negativeIndicators: string[];
  hedgingPhrases: string[];
}

// ============================================
// SESSION SCORING
// ============================================
export interface SessionScoringInput {
  sessionId: string;
  messages: SessionMessage[];
  interviewType: string;
  difficulty: number;
  targetRole: string;
  interviewerArchetype: string;
}

export interface SessionMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  analysis?: ResponseAnalysisResult;
  responseTimeSeconds?: number;
}

export interface SessionScoringResult {
  overallScore: number;
  categoryScores: CategoryScores;
  strengths: string[];
  improvements: string[];
  keyMoments: ScoringKeyMoment[];
  interviewerImpression: string;
  detailedFeedback: DetailedFeedback;
  recommendations: Recommendation[];
}

export interface CategoryScores {
  communication: number;
  technicalDepth: number;
  behavioralExamples: number;
  cultureFit: number;
  problemSolving: number;
  starUsage: number;
  confidence: number;
  relevance: number;
}

export interface ScoringKeyMoment {
  timestamp: number;
  messageIndex: number;
  type: 'strong' | 'weak' | 'turning_point' | 'recovery' | 'missed_opportunity';
  description: string;
  impact: number; // -10 to +10
  quote?: string;
}

export interface DetailedFeedback {
  opening: FeedbackSection;
  bodyAnswers: FeedbackSection;
  technicalResponses: FeedbackSection;
  behavioralResponses: FeedbackSection;
  closing: FeedbackSection;
  overallPresentation: FeedbackSection;
}

export interface FeedbackSection {
  score: number;
  summary: string;
  highlights: string[];
  improvements: string[];
}

export interface Recommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  practiceExercise?: string;
}

// ============================================
// SCORE BENCHMARKS
// ============================================
export interface ScoreBenchmark {
  score: number;
  label: string;
  description: string;
  color: string;
}

export const SCORE_BENCHMARKS: ScoreBenchmark[] = [
  { score: 90, label: 'Exceptional', description: 'Top-tier candidate performance', color: '#22c55e' },
  { score: 80, label: 'Strong', description: 'Would likely advance to next round', color: '#84cc16' },
  { score: 70, label: 'Good', description: 'Solid performance with minor gaps', color: '#eab308' },
  { score: 60, label: 'Average', description: 'Met basic expectations', color: '#f97316' },
  { score: 50, label: 'Below Average', description: 'Needs significant improvement', color: '#ef4444' },
  { score: 0, label: 'Needs Work', description: 'Fundamental gaps to address', color: '#dc2626' },
];

export function getScoreBenchmark(score: number): ScoreBenchmark {
  for (const benchmark of SCORE_BENCHMARKS) {
    if (score >= benchmark.score) {
      return benchmark;
    }
  }
  return SCORE_BENCHMARKS[SCORE_BENCHMARKS.length - 1];
}

// ============================================
// PROGRESS TRACKING
// ============================================
export interface ProgressSnapshot {
  date: string;
  sessionCount: number;
  averageScore: number;
  categoryAverages: CategoryScores;
  streakDays: number;
}

export interface ProgressTrend {
  metric: keyof CategoryScores | 'overall';
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  periodDays: number;
}

export interface SkillGap {
  skill: string;
  currentLevel: number;
  targetLevel: number;
  priority: 'high' | 'medium' | 'low';
  suggestedPractice: string[];
}

// ============================================
// BADGES & ACHIEVEMENTS
// ============================================
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  requirement: BadgeRequirement;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export type BadgeCategory = 
  | 'sessions'
  | 'scores'
  | 'streaks'
  | 'improvement'
  | 'mastery'
  | 'special';

export type BadgeRequirement =
  | { type: 'session_count'; count: number }
  | { type: 'score_threshold'; score: number; category?: keyof CategoryScores }
  | { type: 'streak_days'; days: number }
  | { type: 'improvement'; percent: number; period_days: number }
  | { type: 'perfect_star'; count: number }
  | { type: 'category_mastery'; category: keyof CategoryScores; score: number }
  | { type: 'special'; condition: string };

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_interview',
    name: 'First Steps',
    description: 'Complete your first interview',
    icon: '🎯',
    category: 'sessions',
    requirement: { type: 'session_count', count: 1 },
    rarity: 'common',
  },
  {
    id: 'ten_sessions',
    name: 'Dedicated',
    description: 'Complete 10 interviews',
    icon: '💪',
    category: 'sessions',
    requirement: { type: 'session_count', count: 10 },
    rarity: 'uncommon',
  },
  {
    id: 'fifty_sessions',
    name: 'Interview Veteran',
    description: 'Complete 50 interviews',
    icon: '🏆',
    category: 'sessions',
    requirement: { type: 'session_count', count: 50 },
    rarity: 'rare',
  },
  {
    id: 'star_master',
    name: 'STAR Master',
    description: 'Get perfect STAR scores in 5 responses',
    icon: '⭐',
    category: 'mastery',
    requirement: { type: 'perfect_star', count: 5 },
    rarity: 'rare',
  },
  {
    id: 'week_streak',
    name: 'Consistent',
    description: 'Practice for 7 days in a row',
    icon: '🔥',
    category: 'streaks',
    requirement: { type: 'streak_days', days: 7 },
    rarity: 'uncommon',
  },
  {
    id: 'month_streak',
    name: 'Unstoppable',
    description: 'Practice for 30 days in a row',
    icon: '🌟',
    category: 'streaks',
    requirement: { type: 'streak_days', days: 30 },
    rarity: 'epic',
  },
  {
    id: 'high_scorer',
    name: 'High Achiever',
    description: 'Score 90+ in an interview',
    icon: '🎖️',
    category: 'scores',
    requirement: { type: 'score_threshold', score: 90 },
    rarity: 'rare',
  },
  {
    id: 'rapid_improvement',
    name: 'Quick Learner',
    description: 'Improve your average score by 20% in a week',
    icon: '📈',
    category: 'improvement',
    requirement: { type: 'improvement', percent: 20, period_days: 7 },
    rarity: 'uncommon',
  },
  {
    id: 'communication_master',
    name: 'Silver Tongue',
    description: 'Score 95+ in communication',
    icon: '🗣️',
    category: 'mastery',
    requirement: { type: 'category_mastery', category: 'communication', score: 95 },
    rarity: 'epic',
  },
  {
    id: 'technical_wizard',
    name: 'Technical Wizard',
    description: 'Score 95+ in technical depth',
    icon: '🧙',
    category: 'mastery',
    requirement: { type: 'category_mastery', category: 'technicalDepth', score: 95 },
    rarity: 'epic',
  },
];
