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
  
  // Analysis model - Mistral Small 4 (March 2026 release).
  // Replaces mistral-small-3.1-24b-instruct (March 2025), which began
  // returning malformed/truncated JSON in production around April 24 2026
  // — every analysis call was hitting the silent-50s fallback in
  // analyzeResponse(). Same provider family, same pricing tier
  // ($0.15/$0.60 per 1M tokens), drop-in compatible with existing prompts.
  ANALYSIS: 'mistralai/mistral-small-2603',
  
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

// TTS Voice options (OpenAI tts-1)
// Provider: OpenAI — no monthly character cap, pure pay-per-use
// NOTE: Voice resolution is handled in lib/tts/openai-tts.ts (authoritative)
export const TTS_VOICES = {
  male: [
    { id: 'kiefer', name: 'Kiefer', description: 'Professional, direct', openAIId: 'onyx' },
    { id: 'kyle', name: 'Kyle', description: 'Dynamic, energetic', openAIId: 'echo' },
    { id: 'leo', name: 'Leo', description: 'Deep, authoritative', openAIId: 'fable' },
  ],
  female: [
    { id: 'katie', name: 'Katie', description: 'Professional, clear', openAIId: 'alloy' },
    { id: 'tessa', name: 'Tessa', description: 'Warm, engaging', openAIId: 'nova' },
    { id: 'maya', name: 'Maya', description: 'Friendly, approachable', openAIId: 'shimmer' },
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

// Export types
export type AIModel = keyof typeof AI_MODELS;
export type InterviewType = keyof typeof INTERVIEW_CONFIGS;
export type CompanyStyle = keyof typeof COMPANY_STYLE_MODIFIERS;
// SubscriptionTier is now the authoritative type from @/types/database
// (keyed off the Postgres enum), not a local keyof typeof RATE_LIMITS. The
// previous RATE_LIMITS object encoded the pre-credit free/pro/premium
// subscription model and was removed with the credit-pack migration — every
// consumer now imports SubscriptionTier from @/types/database directly.
