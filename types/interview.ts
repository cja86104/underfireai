/**
 * UnderFireAI Interview Types
 * Types for the interview engine and session management
 */

import type { 
  InterviewType, 
  CompanyStyle, 
  MessageRole,
  ResponseAnalysis,
  InterviewerMood,
  PersonalityBase 
} from './database';

// ============================================
// INTERVIEW SESSION TYPES
// ============================================
export interface InterviewConfig {
  interviewType: InterviewType;
  companyStyle?: CompanyStyle;
  targetRole: string;
  targetCompany?: string;
  difficulty: number; // 1-10
  voiceEnabled: boolean;
  timerEnabled: boolean;
  timerSeconds?: number; // Response time limit
}

export interface InterviewState {
  sessionId: string;
  status: 'preparing' | 'active' | 'paused' | 'scoring' | 'complete';
  currentQuestionIndex: number;
  totalQuestions: number;
  elapsedSeconds: number;
  responseStartTime: number | null;
  interviewerMood: InterviewerMood;
}

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  content: string;
  followUpTo?: string; // ID of parent question
  expectedTopics?: string[];
  difficulty: number;
  category: QuestionCategory;
}

export type QuestionType = 
  | 'opening'
  | 'behavioral'
  | 'technical'
  | 'situational'
  | 'follow_up'
  | 'curveball'
  | 'closing';

export type QuestionCategory =
  | 'leadership'
  | 'teamwork'
  | 'problem_solving'
  | 'communication'
  | 'technical_skills'
  | 'culture_fit'
  | 'conflict_resolution'
  | 'achievement'
  | 'failure'
  | 'motivation';

// ============================================
// MESSAGE TYPES
// ============================================
export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  audioUrl?: string;
  analysis?: ResponseAnalysis;
  isStreaming?: boolean;
}

export interface StreamingMessage {
  id: string;
  role: MessageRole;
  content: string;
  isComplete: boolean;
}

// ============================================
// INTERVIEW CONTEXT
// ============================================
export interface InterviewContext {
  // User info
  userName: string;
  resumeData?: ResumeContext;
  
  // Interview setup
  config: InterviewConfig;
  
  // Interviewer info
  interviewerId: string;
  interviewerName: string;
  interviewerBackstory: string;
  personalityBase: PersonalityBase;
  
  // Session state
  questionHistory: InterviewQuestion[];
  answerHistory: AnswerSummary[];
  currentMood: InterviewerMood;
}

export interface ResumeContext {
  skills: string[];
  experienceYears: number;
  recentRole?: string;
  recentCompany?: string;
  highlights: string[];
}

export interface AnswerSummary {
  questionId: string;
  keyPoints: string[];
  starUsed: boolean;
  confidence: 'low' | 'medium' | 'high';
  responseTimeSeconds: number;
}

// ============================================
// AI RESPONSE TYPES
// ============================================
export interface InterviewerResponse {
  content: string;
  mood: InterviewerMood;
  nextQuestion?: InterviewQuestion;
  isFollowUp: boolean;
  internalThoughts?: string; // For debugging/logging
}

export interface GeneratedQuestion {
  question: string;
  type: QuestionType;
  category: QuestionCategory;
  reasoning: string;
  expectedAnswerPoints: string[];
}

// ============================================
// VOICE TYPES
// ============================================
export interface VoiceSettings {
  enabled: boolean;
  voiceId: string;
  speed: number; // 0.5 - 2.0
  autoPlay: boolean;
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number;
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
}

// ============================================
// TIMER TYPES
// ============================================
export interface TimerConfig {
  enabled: boolean;
  warningThreshold: number; // Seconds before warning
  maxSeconds: number;
  showCountdown: boolean;
}

export interface TimerState {
  seconds: number;
  isRunning: boolean;
  isWarning: boolean;
  isExpired: boolean;
}

// ============================================
// REAL-TIME ANALYSIS
// ============================================
export interface LiveAnalysis {
  wordCount: number;
  estimatedDuration: number;
  fillerWordCount: number;
  structureDetected: 'none' | 'partial_star' | 'full_star';
  confidenceIndicators: ConfidenceIndicator[];
}

export interface ConfidenceIndicator {
  type: 'positive' | 'negative';
  indicator: string;
  count: number;
}

// ============================================
// SESSION EVENTS
// ============================================
export type InterviewEvent =
  | { type: 'session_started'; timestamp: number }
  | { type: 'question_asked'; questionId: string; timestamp: number }
  | { type: 'response_started'; timestamp: number }
  | { type: 'response_submitted'; responseTime: number; timestamp: number }
  | { type: 'mood_shift'; from: string; to: string; trigger: string; timestamp: number }
  | { type: 'session_paused'; timestamp: number }
  | { type: 'session_resumed'; timestamp: number }
  | { type: 'session_ended'; reason: 'completed' | 'abandoned' | 'error'; timestamp: number };
