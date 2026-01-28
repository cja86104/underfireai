/**
 * UnderFireAI Database Types
 * Auto-generated structure for Supabase type safety
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enums
export type InterviewType = 'behavioral' | 'technical' | 'case' | 'hr' | 'panel' | 'phone_screen';
export type CompanyStyle = 'faang' | 'startup' | 'consulting' | 'enterprise' | 'agency' | 'government';
export type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'paused';
export type MessageRole = 'interviewer' | 'candidate';
export type SubscriptionTier = 'free' | 'pro' | 'premium';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      interviewers: {
        Row: Interviewer;
        Insert: InterviewerInsert;
        Update: InterviewerUpdate;
      };
      interviewer_personality: {
        Row: InterviewerPersonality;
        Insert: InterviewerPersonalityInsert;
        Update: InterviewerPersonalityUpdate;
      };
      user_resumes: {
        Row: UserResume;
        Insert: UserResumeInsert;
        Update: UserResumeUpdate;
      };
      interview_sessions: {
        Row: InterviewSession;
        Insert: InterviewSessionInsert;
        Update: InterviewSessionUpdate;
      };
      interview_messages: {
        Row: InterviewMessage;
        Insert: InterviewMessageInsert;
        Update: InterviewMessageUpdate;
      };
      session_scores: {
        Row: SessionScore;
        Insert: SessionScoreInsert;
        Update: SessionScoreUpdate;
      };
      user_progress: {
        Row: UserProgress;
        Insert: UserProgressInsert;
        Update: UserProgressUpdate;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      interview_type: InterviewType;
      company_style: CompanyStyle;
      session_status: SessionStatus;
      message_role: MessageRole;
      subscription_tier: SubscriptionTier;
      subscription_status: SubscriptionStatus;
    };
  };
}

// ============================================
// PROFILES
// ============================================
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  monthly_interviews_used: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  subscription_period_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  monthly_interviews_used?: number;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdate {
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  subscription_period_end?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  monthly_interviews_used?: number;
  onboarding_completed?: boolean;
  updated_at?: string;
}

// ============================================
// INTERVIEWERS
// ============================================
export interface Interviewer {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  interview_type: InterviewType;
  company_style: CompanyStyle | null;
  role_focus: string | null;
  backstory: string | null;
  personality_base: PersonalityBase | null;
  difficulty_level: number;
  current_mood: InterviewerMood | null;
  voice_config: VoiceConfig | null;
  total_sessions: number;
  created_at: string;
}

export interface InterviewerInsert {
  id?: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
  interview_type: InterviewType;
  company_style?: CompanyStyle | null;
  role_focus?: string | null;
  backstory?: string | null;
  personality_base?: PersonalityBase | null;
  difficulty_level?: number;
  current_mood?: InterviewerMood | null;
  voice_config?: VoiceConfig | null;
  total_sessions?: number;
  created_at?: string;
}

export interface InterviewerUpdate {
  name?: string;
  avatar_url?: string | null;
  interview_type?: InterviewType;
  company_style?: CompanyStyle | null;
  role_focus?: string | null;
  backstory?: string | null;
  personality_base?: PersonalityBase | null;
  difficulty_level?: number;
  current_mood?: InterviewerMood | null;
  voice_config?: VoiceConfig | null;
  total_sessions?: number;
}

// ============================================
// INTERVIEWER PERSONALITY
// ============================================
export interface InterviewerPersonality {
  id: string;
  interviewer_id: string;
  communication_style: CommunicationStyle | null;
  question_patterns: QuestionPatterns | null;
  red_flags: string[] | null;
  green_flags: string[] | null;
  pet_peeves: string[] | null;
  favorite_topics: string[] | null;
  created_at: string;
}

export interface InterviewerPersonalityInsert {
  id?: string;
  interviewer_id: string;
  communication_style?: CommunicationStyle | null;
  question_patterns?: QuestionPatterns | null;
  red_flags?: string[] | null;
  green_flags?: string[] | null;
  pet_peeves?: string[] | null;
  favorite_topics?: string[] | null;
  created_at?: string;
}

export interface InterviewerPersonalityUpdate {
  communication_style?: CommunicationStyle | null;
  question_patterns?: QuestionPatterns | null;
  red_flags?: string[] | null;
  green_flags?: string[] | null;
  pet_peeves?: string[] | null;
  favorite_topics?: string[] | null;
}

// ============================================
// USER RESUMES
// ============================================
export interface UserResume {
  id: string;
  user_id: string;
  raw_text: string | null;
  parsed_data: ParsedResumeData | null;
  skills: string[] | null;
  experience_years: number | null;
  target_role: string | null;
  target_company_type: string | null;
  file_url: string | null;
  uploaded_at: string;
}

export interface UserResumeInsert {
  id?: string;
  user_id: string;
  raw_text?: string | null;
  parsed_data?: ParsedResumeData | null;
  skills?: string[] | null;
  experience_years?: number | null;
  target_role?: string | null;
  target_company_type?: string | null;
  file_url?: string | null;
  uploaded_at?: string;
}

export interface UserResumeUpdate {
  raw_text?: string | null;
  parsed_data?: ParsedResumeData | null;
  skills?: string[] | null;
  experience_years?: number | null;
  target_role?: string | null;
  target_company_type?: string | null;
  file_url?: string | null;
}

// ============================================
// INTERVIEW SESSIONS
// ============================================
export interface InterviewSession {
  id: string;
  user_id: string;
  interviewer_id: string;
  interview_type: InterviewType;
  target_role: string | null;
  target_company: string | null;
  difficulty: number;
  status: SessionStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface InterviewSessionInsert {
  id?: string;
  user_id: string;
  interviewer_id: string;
  interview_type: InterviewType;
  target_role?: string | null;
  target_company?: string | null;
  difficulty?: number;
  status?: SessionStatus;
  started_at?: string;
  ended_at?: string | null;
  duration_seconds?: number | null;
}

export interface InterviewSessionUpdate {
  interview_type?: InterviewType;
  target_role?: string | null;
  target_company?: string | null;
  difficulty?: number;
  status?: SessionStatus;
  ended_at?: string | null;
  duration_seconds?: number | null;
}

// ============================================
// INTERVIEW MESSAGES
// ============================================
export interface InterviewMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  audio_url: string | null;
  response_time_seconds: number | null;
  analysis: ResponseAnalysis | null;
  created_at: string;
}

export interface InterviewMessageInsert {
  id?: string;
  session_id: string;
  role: MessageRole;
  content: string;
  audio_url?: string | null;
  response_time_seconds?: number | null;
  analysis?: ResponseAnalysis | null;
  created_at?: string;
}

export interface InterviewMessageUpdate {
  content?: string;
  audio_url?: string | null;
  response_time_seconds?: number | null;
  analysis?: ResponseAnalysis | null;
}

// ============================================
// SESSION SCORES
// ============================================
export interface SessionScore {
  id: string;
  session_id: string;
  overall_score: number | null;
  clarity_score: number | null;
  confidence_score: number | null;
  technical_depth: number | null;
  star_usage_score: number | null;
  communication_score: number | null;
  strengths: string[] | null;
  improvements: string[] | null;
  ai_feedback: string | null;
  interviewer_impression: string | null;
  key_moments: KeyMoment[] | null;
  created_at: string;
}

export interface SessionScoreInsert {
  id?: string;
  session_id: string;
  overall_score?: number | null;
  clarity_score?: number | null;
  confidence_score?: number | null;
  technical_depth?: number | null;
  star_usage_score?: number | null;
  communication_score?: number | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  ai_feedback?: string | null;
  interviewer_impression?: string | null;
  key_moments?: KeyMoment[] | null;
  created_at?: string;
}

export interface SessionScoreUpdate {
  overall_score?: number | null;
  clarity_score?: number | null;
  confidence_score?: number | null;
  technical_depth?: number | null;
  star_usage_score?: number | null;
  communication_score?: number | null;
  strengths?: string[] | null;
  improvements?: string[] | null;
  ai_feedback?: string | null;
  interviewer_impression?: string | null;
  key_moments?: KeyMoment[] | null;
}

// ============================================
// USER PROGRESS
// ============================================
export interface UserProgress {
  id: string;
  user_id: string;
  total_sessions: number;
  total_hours: number;
  current_streak: number;
  longest_streak: number;
  avg_score: number | null;
  badges: Badge[] | null;
  last_session_at: string | null;
  created_at: string;
}

export interface UserProgressInsert {
  id?: string;
  user_id: string;
  total_sessions?: number;
  total_hours?: number;
  current_streak?: number;
  longest_streak?: number;
  avg_score?: number | null;
  badges?: Badge[] | null;
  last_session_at?: string | null;
  created_at?: string;
}

export interface UserProgressUpdate {
  total_sessions?: number;
  total_hours?: number;
  current_streak?: number;
  longest_streak?: number;
  avg_score?: number | null;
  badges?: Badge[] | null;
  last_session_at?: string | null;
}

// ============================================
// JSON TYPES
// ============================================
export interface PersonalityBase {
  directness: number;      // 0-100: How blunt vs. diplomatic
  depth_preference: number; // 0-100: Surface vs. deep dives
  warmth: number;          // 0-100: Cold vs. friendly
  patience: number;        // 0-100: Quick follow-ups vs. letting you think
  technical_focus: number; // 0-100: Soft skills vs. hard skills
  skepticism: number;      // 0-100: Trusting vs. needs proof
}

export interface InterviewerMood {
  current: 'impressed' | 'neutral' | 'skeptical' | 'critical' | 'engaged';
  intensity: number; // 0-100
  triggers: string[];
}

export interface VoiceConfig {
  voice_id: string;
  speed: number;
  pitch: number;
}

export interface CommunicationStyle {
  style: 'direct' | 'probing' | 'supportive' | 'challenging';
  formality: number; // 0-100
  verbosity: number; // 0-100
}

export interface QuestionPatterns {
  follow_up_tendency: number; // 0-100
  depth_preference: number;   // 0-100
  curveball_frequency: number; // 0-100
}

export interface ParsedResumeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string[];
  certifications?: string[];
}

export interface WorkExperience {
  company: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
  highlights: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  graduation_date: string;
}

export interface ResponseAnalysis {
  star_score: number;
  clarity_score: number;
  confidence_score: number;
  relevance_score: number;
  depth_score: number;
  response_time: number;
  word_count: number;
  filler_words: string[];
  key_points: string[];
}

export interface KeyMoment {
  timestamp: number;
  type: 'strong' | 'weak' | 'turning_point';
  description: string;
  message_id?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

// ============================================
// JOINED TYPES
// ============================================
export interface InterviewerWithPersonality extends Interviewer {
  interviewer_personality: InterviewerPersonality | null;
}

export interface SessionWithDetails extends InterviewSession {
  interviewers: Pick<Interviewer, 'id' | 'name' | 'avatar_url' | 'interview_type'>;
  session_scores: SessionScore | null;
}

export interface SessionWithMessages extends InterviewSession {
  interview_messages: InterviewMessage[];
}
