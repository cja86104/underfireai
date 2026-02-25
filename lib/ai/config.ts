/**
 * UnderFireAI - AI Configuration
 * 
 * Uses OpenRouter for cost-effective AI routing.
 * Primary model: DeepSeek for interviews (cost optimized)
 * Fallback: Claude for complex analysis
 */

// Model identifiers for OpenRouter
export const AI_MODELS = {
  // Primary interview model - cost optimized
  INTERVIEW: 'deepseek/deepseek-chat',
  
  // Analysis model - for scoring and detailed feedback
  ANALYSIS: 'deepseek/deepseek-chat',
  
  // Fallback for complex reasoning
  FALLBACK: 'anthropic/claude-3-haiku-20240307',
  
  // Resume parsing - needs good extraction
  RESUME_PARSE: 'deepseek/deepseek-chat',
} as const;

// OpenRouter API configuration
export const OPENROUTER_CONFIG = {
  baseUrl: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://underfireai.com',
    'X-Title': 'UnderFireAI',
  },
} as const;

// Model parameters for different use cases
export const MODEL_PARAMS = {
  interview: {
    temperature: 0.8,
    max_tokens: 1024,
    top_p: 0.95,
    frequency_penalty: 0.3,
    presence_penalty: 0.3,
  },
  analysis: {
    temperature: 0.3,
    max_tokens: 2048,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
  },
  resumeParse: {
    temperature: 0.1,
    max_tokens: 4096,
    top_p: 0.9,
    frequency_penalty: 0,
    presence_penalty: 0,
  },
} as const;

// Interview type configurations
export const INTERVIEW_CONFIGS = {
  behavioral: {
    questionCount: { min: 5, max: 8 },
    followUpProbability: 0.7,
    starEmphasis: true,
    timePerQuestion: 180, // seconds
  },
  technical: {
    questionCount: { min: 4, max: 6 },
    followUpProbability: 0.8,
    starEmphasis: false,
    timePerQuestion: 300,
  },
  case: {
    questionCount: { min: 2, max: 4 },
    followUpProbability: 0.9,
    starEmphasis: false,
    timePerQuestion: 600,
  },
  hr: {
    questionCount: { min: 6, max: 10 },
    followUpProbability: 0.5,
    starEmphasis: false,
    timePerQuestion: 120,
  },
  panel: {
    questionCount: { min: 6, max: 10 },
    followUpProbability: 0.6,
    starEmphasis: true,
    timePerQuestion: 180,
  },
  phone_screen: {
    questionCount: { min: 4, max: 6 },
    followUpProbability: 0.4,
    starEmphasis: false,
    timePerQuestion: 120,
  },
} as const;

// Company style adjustments
export const COMPANY_STYLE_MODIFIERS = {
  faang: {
    formalityBoost: 0,
    technicalDepthBoost: 20,
    behavioralEmphasis: true,
    cultureQuestions: true,
  },
  startup: {
    formalityBoost: -20,
    technicalDepthBoost: 10,
    behavioralEmphasis: false,
    cultureQuestions: true,
  },
  consulting: {
    formalityBoost: 30,
    technicalDepthBoost: 0,
    behavioralEmphasis: true,
    cultureQuestions: false,
  },
  enterprise: {
    formalityBoost: 20,
    technicalDepthBoost: 10,
    behavioralEmphasis: true,
    cultureQuestions: false,
  },
  agency: {
    formalityBoost: -10,
    technicalDepthBoost: 15,
    behavioralEmphasis: false,
    cultureQuestions: true,
  },
  government: {
    formalityBoost: 40,
    technicalDepthBoost: 0,
    behavioralEmphasis: true,
    cultureQuestions: false,
  },
} as const;

// TTS Voice options (Cartesia Sonic 3)
// Provider: Cartesia - 40ms time-to-first-audio, streaming support
// NOTE: Voice IDs are sourced from lib/tts/cartesia-tts.ts (authoritative)
export const TTS_VOICES = {
  male: [
    { id: 'kiefer', name: 'Kiefer', description: 'Professional, direct', cartesiaId: '228fca29-3a0a-435c-8728-5cb483251068' },
    { id: 'kyle', name: 'Kyle', description: 'Dynamic, energetic', cartesiaId: 'c961b81c-a935-4c17-bfb3-ba2239de8c2f' },
    { id: 'leo', name: 'Leo', description: 'Deep, authoritative', cartesiaId: '0834f3df-e650-4766-a20c-5a93a43aa6e3' },
  ],
  female: [
    { id: 'katie', name: 'Katie', description: 'Professional, clear', cartesiaId: 'f786b574-daa5-4673-aa0c-cbe3e8534c02' },
    { id: 'tessa', name: 'Tessa', description: 'Warm, engaging', cartesiaId: '6ccbfb76-1fc6-48f7-b71d-91ac6298247b' },
    { id: 'maya', name: 'Maya', description: 'Friendly, approachable', cartesiaId: 'cbaf8084-f009-4838-a096-07ee2e6612b1' },
  ],
} as const;

// Scoring weights by interview type
export const SCORING_WEIGHTS = {
  overall: {
    clarity: 0.20,
    confidence: 0.15,
    relevance: 0.25,
    depth: 0.20,
    star_usage: 0.10,
    communication: 0.10,
  },
  behavioral: {
    clarity: 0.15,
    confidence: 0.10,
    relevance: 0.20,
    depth: 0.15,
    star_usage: 0.25,
    communication: 0.15,
  },
  technical: {
    clarity: 0.15,
    confidence: 0.10,
    relevance: 0.20,
    depth: 0.35,
    star_usage: 0.05,
    communication: 0.15,
  },
  case: {
    clarity: 0.20,
    confidence: 0.15,
    relevance: 0.25,
    depth: 0.30,
    star_usage: 0.00, // Case interviews don't use STAR
    communication: 0.10,
  },
  hr: {
    clarity: 0.15,
    confidence: 0.20,
    relevance: 0.20,
    depth: 0.10,
    star_usage: 0.15,
    communication: 0.20,
  },
  panel: {
    clarity: 0.15,
    confidence: 0.15,
    relevance: 0.20,
    depth: 0.15,
    star_usage: 0.20,
    communication: 0.15,
  },
  phone_screen: {
    clarity: 0.20,
    confidence: 0.15,
    relevance: 0.25,
    depth: 0.15,
    star_usage: 0.10,
    communication: 0.15,
  },
} as const;

// Rate limits by tier
export const RATE_LIMITS = {
  free: {
    monthlyInterviews: 3,
    voiceModeEnabled: false,
    maxSessionMinutes: 30,
  },
  pro: {
    monthlyInterviews: Infinity,
    voiceModeEnabled: true,
    maxSessionMinutes: 60,
  },
  premium: {
    monthlyInterviews: Infinity,
    voiceModeEnabled: true,
    maxSessionMinutes: 90,
  },
} as const;

// Export types
export type AIModel = keyof typeof AI_MODELS;
export type InterviewType = keyof typeof INTERVIEW_CONFIGS;
export type CompanyStyle = keyof typeof COMPANY_STYLE_MODIFIERS;
export type SubscriptionTier = keyof typeof RATE_LIMITS;
