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
  INTERVIEWER_ARCHETYPES,
  TTS_VOICES,
  SCORING_WEIGHTS,
  RATE_LIMITS,
  type AIModel,
  type InterviewType,
  type CompanyStyle,
  type InterviewerArchetype,
  type SubscriptionTier,
} from './config';

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
