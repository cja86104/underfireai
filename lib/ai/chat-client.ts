/**
 * UnderFireAI - AI Chat Client
 * 
 * Handles communication with OpenRouter API for interview conversations.
 * Uses DeepSeek as primary model for cost optimization.
 */

import { AI_MODELS, OPENROUTER_CONFIG, MODEL_PARAMS } from './config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Create a chat completion using OpenRouter
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = options.model || AI_MODELS.INTERVIEW;
  const params = {
    ...MODEL_PARAMS.interview,
    ...options,
  };

  const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...OPENROUTER_CONFIG.defaultHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Create a streaming chat completion using OpenRouter
 */
export async function createStreamingChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const model = options.model || AI_MODELS.INTERVIEW;
  const params = {
    ...MODEL_PARAMS.interview,
    ...options,
  };

  const response = await fetch(`${OPENROUTER_CONFIG.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      ...OPENROUTER_CONFIG.defaultHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      top_p: params.top_p,
      frequency_penalty: params.frequency_penalty,
      presence_penalty: params.presence_penalty,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error('No response body received');
  }

  return response.body;
}

/**
 * Parse SSE stream chunks into text content
 */
export function parseSSEChunk(chunk: string): string {
  const lines = chunk.split('\n');
  let content = '';

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      
      if (data === '[DONE]') {
        continue;
      }

      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return content;
}

/**
 * Generate interview system prompt based on interviewer personality
 */
export function generateInterviewSystemPrompt(params: {
  interviewerName: string;
  interviewType: string;
  companyStyle: string | null;
  roleTarget: string | null;
  backstory: string | null;
  personality: {
    directness: number;
    depth_preference: number;
    warmth: number;
    patience: number;
    technical_focus: number;
    skepticism: number;
  } | null;
  communicationStyle: {
    style: string;
    formality: number;
    verbosity: number;
  } | null;
  redFlags: string[] | null;
  greenFlags: string[] | null;
  petPeeves: string[] | null;
  favoriteTopics: string[] | null;
  resumeContext: string | null;
}): string {
  const {
    interviewerName,
    interviewType,
    companyStyle,
    roleTarget,
    backstory,
    personality,
    communicationStyle,
    redFlags,
    greenFlags,
    petPeeves,
    favoriteTopics,
    resumeContext,
  } = params;

  let prompt = `You are ${interviewerName}, a professional interviewer conducting a ${interviewType} interview`;
  
  if (companyStyle) {
    prompt += ` at a ${companyStyle}-style company`;
  }
  
  if (roleTarget) {
    prompt += ` for a ${roleTarget} position`;
  }
  
  prompt += '.\n\n';

  // Hidden backstory and personality
  if (backstory) {
    prompt += `## Your Background (hidden from candidate)\n${backstory}\n\n`;
  }

  if (personality) {
    prompt += `## Your Personality Traits (0-100 scale)\n`;
    prompt += `- Directness: ${personality.directness} (${personality.directness > 70 ? 'very direct and blunt' : personality.directness > 40 ? 'balanced' : 'diplomatic and gentle'})\n`;
    prompt += `- Depth Preference: ${personality.depth_preference} (${personality.depth_preference > 70 ? 'loves deep dives' : personality.depth_preference > 40 ? 'balanced depth' : 'prefers surface-level'})\n`;
    prompt += `- Warmth: ${personality.warmth} (${personality.warmth > 70 ? 'very friendly and supportive' : personality.warmth > 40 ? 'professional' : 'cold and reserved'})\n`;
    prompt += `- Patience: ${personality.patience} (${personality.patience > 70 ? 'gives time to think' : personality.patience > 40 ? 'moderate pace' : 'rapid-fire, quick follow-ups'})\n`;
    prompt += `- Technical Focus: ${personality.technical_focus} (${personality.technical_focus > 70 ? 'heavy technical emphasis' : personality.technical_focus > 40 ? 'balanced' : 'soft skills focused'})\n`;
    prompt += `- Skepticism: ${personality.skepticism} (${personality.skepticism > 70 ? 'challenges everything, needs proof' : personality.skepticism > 40 ? 'reasonably trusting' : 'takes answers at face value'})\n\n`;
  }

  if (communicationStyle) {
    prompt += `## Communication Style\n`;
    prompt += `- Style: ${communicationStyle.style}\n`;
    prompt += `- Formality: ${communicationStyle.formality > 70 ? 'Very formal' : communicationStyle.formality > 40 ? 'Professional' : 'Casual'}\n`;
    prompt += `- Verbosity: ${communicationStyle.verbosity > 70 ? 'Detailed responses' : communicationStyle.verbosity > 40 ? 'Moderate' : 'Brief and concise'}\n\n`;
  }

  if (redFlags && redFlags.length > 0) {
    prompt += `## Red Flags (what makes you skeptical)\n`;
    prompt += redFlags.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (greenFlags && greenFlags.length > 0) {
    prompt += `## Green Flags (what impresses you)\n`;
    prompt += greenFlags.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (petPeeves && petPeeves.length > 0) {
    prompt += `## Pet Peeves (answers you dislike)\n`;
    prompt += petPeeves.map(p => `- ${p}`).join('\n') + '\n\n';
  }

  if (favoriteTopics && favoriteTopics.length > 0) {
    prompt += `## Favorite Topics (you like to dig into these)\n`;
    prompt += favoriteTopics.map(t => `- ${t}`).join('\n') + '\n\n';
  }

  if (resumeContext) {
    prompt += `## Candidate's Resume/Background\n${resumeContext}\n\n`;
  }

  prompt += `## Instructions
1. Stay in character throughout the interview
2. Ask one question at a time
3. Follow up based on the candidate's responses
4. Your mood and tone should shift based on answer quality
5. If you see red flags, become more skeptical and probe deeper
6. If you see green flags, show appropriate appreciation but maintain professionalism
7. Never break character or reveal your hidden personality traits
8. For behavioral questions, expect STAR-format answers (Situation, Task, Action, Result)
9. Keep responses concise - you're an interviewer, not a lecturer
10. End the interview naturally after 5-10 questions or when appropriate

Begin with a brief introduction and your first question.`;

  return prompt;
}

/**
 * Analyze a candidate's response
 */
export async function analyzeResponse(
  response: string,
  question: string,
  interviewType: string
): Promise<{
  star_score: number;
  clarity_score: number;
  confidence_score: number;
  relevance_score: number;
  depth_score: number;
  word_count: number;
  filler_words: string[];
  key_points: string[];
}> {
  const systemPrompt = `You are an expert interview coach analyzing a candidate's response.
Analyze the following response and provide scores from 0-100 for each category.
Return ONLY valid JSON with no additional text.

Categories:
- star_score: How well does the response follow STAR format (Situation, Task, Action, Result)? For ${interviewType} interviews.
- clarity_score: How clear and well-structured is the response?
- confidence_score: How confident does the candidate sound based on language used?
- relevance_score: How relevant is the response to the question asked?
- depth_score: How much depth and detail does the response provide?

Also identify:
- filler_words: Array of filler words used (um, like, you know, etc.)
- key_points: Array of 2-4 key takeaways from the response`;

  const userPrompt = `Question: ${question}

Response: ${response}

Analyze this response and return JSON:
{
  "star_score": <number>,
  "clarity_score": <number>,
  "confidence_score": <number>,
  "relevance_score": <number>,
  "depth_score": <number>,
  "filler_words": [<strings>],
  "key_points": [<strings>]
}`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    const content = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      star_score: Math.min(100, Math.max(0, parsed.star_score || 0)),
      clarity_score: Math.min(100, Math.max(0, parsed.clarity_score || 0)),
      confidence_score: Math.min(100, Math.max(0, parsed.confidence_score || 0)),
      relevance_score: Math.min(100, Math.max(0, parsed.relevance_score || 0)),
      depth_score: Math.min(100, Math.max(0, parsed.depth_score || 0)),
      word_count: response.split(/\s+/).length,
      filler_words: parsed.filler_words || [],
      key_points: parsed.key_points || [],
    };
  } catch (error) {
    console.error('Error analyzing response:', error);
    // Return default scores on error
    return {
      star_score: 50,
      clarity_score: 50,
      confidence_score: 50,
      relevance_score: 50,
      depth_score: 50,
      word_count: response.split(/\s+/).length,
      filler_words: [],
      key_points: [],
    };
  }
}
