/**
 * UnderFireAI - AI Module Exports
 */

// Configuration
export {
  AI_MODELS,
  OPENROUTER_CONFIG,
  MODEL_PARAMS,
  INTERVIEW_CONFIGS,
  COMPANY_STYLE_MODIFIERS,
  TTS_VOICES,
  SCORING_WEIGHTS,
  RATE_LIMITS,
  type AIModel,
  type InterviewType,
  type CompanyStyle,
  type SubscriptionTier,
} from './config';

// Re-export canonical interviewer types from types/interviewer
export {
  INTERVIEWER_ARCHETYPES,
  type InterviewerArchetype,
} from '@/types/interviewer';

// Chat Client
export {
  createChatCompletion,
  createStreamingChatCompletion,
  parseSSEChunk,
  generateInterviewSystemPrompt,
  analyzeResponse,
  type ChatMessage,
  type ChatCompletionOptions,
  type ChatCompletionResponse,
} from './chat-client';
