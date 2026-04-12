/**
 * UnderFireAI - AI Chat Client
 * 
 * Handles communication with OpenRouter API for interview conversations.
 * Uses DeepSeek as primary model for cost optimization.
 */

import { AI_MODELS, OPENROUTER_CONFIG, MODEL_PARAMS, COMPANY_STYLE_MODIFIERS } from './config';

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

/** API error response structure */
interface APIErrorResponse {
  error?: {
    message?: string;
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

  const model = options.model ?? AI_MODELS.INTERVIEW;
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
    const errorData = await response.json().catch(() => ({})) as APIErrorResponse;
    throw new Error(
      `OpenRouter API error: ${response.status} - ${errorData.error?.message ?? response.statusText}`
    );
  }

  return response.json() as Promise<ChatCompletionResponse>;
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

  const model = options.model ?? AI_MODELS.INTERVIEW;
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
    const errorData = await response.json().catch(() => ({})) as APIErrorResponse;
    throw new Error(
      `OpenRouter API error: ${response.status} - ${errorData.error?.message ?? response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error('No response body received');
  }

  return response.body;
}

/** SSE stream chunk structure */
interface SSEStreamChunk {
  choices?: {
    delta?: {
      content?: string;
    };
  }[];
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
        const parsed = JSON.parse(data) as SSEStreamChunk;
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
  targetCompany: string | null;
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
  currentMood?: { current: string; intensity: number; triggers: string[] } | null;
  hasResume?: boolean;
  /** Premium: Additional context for resume-targeted practice */
  resumeTargetingContext?: string | null;
}): string {
  const {
    interviewerName,
    interviewType,
    companyStyle,
    targetCompany,
    roleTarget,
    backstory,
    personality,
    communicationStyle,
    redFlags,
    greenFlags,
    petPeeves,
    favoriteTopics,
    resumeContext,
    currentMood,
    hasResume,
    resumeTargetingContext,
  } = params;

  let prompt = `You are ${interviewerName}, a professional interviewer conducting a ${interviewType} interview`;

  if (targetCompany) {
    prompt += ` at ${targetCompany}`;
  } else if (companyStyle) {
    prompt += ` at a ${companyStyle}-style company`;
  }

  if (roleTarget) {
    prompt += ` for a ${roleTarget} position`;
  }

  prompt += '.\n\n';

  // Company style behavioral instructions
  if (companyStyle) {
    prompt += buildChatCompanyContextSection(companyStyle, targetCompany);
  }

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

  if (currentMood) {
    prompt += `## Current Mood (hidden from candidate)\n`;
    prompt += `You are currently feeling: ${currentMood.current} (intensity: ${currentMood.intensity}/100)\n`;
    if (currentMood.triggers.length > 0) {
      prompt += `Recent things that affected your mood: ${currentMood.triggers.join(', ')}\n`;
    }
    prompt += `Adjust your tone and follow-up style based on this mood.\n\n`;
  }

  if (resumeContext) {
    prompt += `## Candidate's Resume/Background\n${resumeContext}\n\n`;
  }

  // Premium: Resume-targeted practice mode
  if (resumeTargetingContext) {
    prompt += resumeTargetingContext;
  }

  const openingInstruction = hasResume
    ? `Begin with a targeted opening question based on the candidate's resume. Do NOT ask them to introduce themselves or walk you through their background — you already have that information. Reference something specific from their experience to open the conversation.`
    : `Begin with a brief introduction of yourself and your first question.`;

  prompt += `## Output Format — CRITICAL
Your response must contain ONLY the words you speak out loud as an interviewer.

NEVER output any of the following:
- Stage directions or body language descriptions (e.g. "Leaning in...", "Nodding...")
- Internal thoughts, intentions, or decision trees (e.g. "If they answer X, I will ask Y...")
- Parenthetical notes or asides wrapped in asterisks
- Labels or headers (e.g. "Opening Question:", "Follow-up:", "Closing Statement:")
- Markdown formatting — no bold, no italics, no bullet points
- Meta-commentary about the interview or your strategy
- Any text that would not literally be spoken aloud in the room

Your entire response is exactly what you say to the candidate — nothing more, nothing hidden, nothing narrated. Speak naturally. Do not narrate.

## Interviewer Instructions
1. Stay in character throughout the interview
2. Ask one question at a time
3. Follow up based on the candidate's responses
4. Let your mood and personality traits shape your tone naturally — do not describe them
5. If you detect red flags, become more skeptical and probe deeper through your questions
6. If you detect green flags, show appropriate appreciation but maintain professionalism
7. Never break character or reveal your hidden personality traits
8. For behavioral questions, expect STAR-format answers (Situation, Task, Action, Result)
9. Keep responses concise — you are an interviewer conducting a real interview, not a lecturer
10. End the interview naturally after 5-10 questions or when appropriate

${openingInstruction}`;

  return prompt;
}

/**
 * Build company context section for the live interview system prompt.
 * Uses COMPANY_STYLE_MODIFIERS to produce real behavioral instructions.
 * Kept separate from interviewer-prompts.ts to avoid a circular dependency
 * (lib/interview/* already imports from lib/ai/*).
 */
function buildChatCompanyContextSection(companyStyle: string, targetCompany: string | null): string {
  type KnownStyle = keyof typeof COMPANY_STYLE_MODIFIERS;
  const isKnownStyle = (s: string): s is KnownStyle => s in COMPANY_STYLE_MODIFIERS;

  if (!isKnownStyle(companyStyle)) return '';

  const modifier = COMPANY_STYLE_MODIFIERS[companyStyle];
  const companyLabel = targetCompany ?? `a ${companyStyle}-style company`;

  const formalityLevel =
    modifier.formalityBoost >= 30 ? 'very formal and structured'
    : modifier.formalityBoost >= 10 ? 'professional and polished'
    : modifier.formalityBoost <= -10 ? 'relaxed and conversational'
    : 'balanced and professional';

  const depthGuidance =
    modifier.technicalDepthBoost >= 20
      ? 'Probe deeply on technical decisions, system design, and engineering trade-offs. Expect candidates to go beyond surface answers.'
      : modifier.technicalDepthBoost >= 10
      ? 'Balance technical and non-technical questions. Ask follow-ups on implementation specifics when relevant.'
      : 'Focus less on technical depth. Prioritize communication, process, and soft-skill indicators.';

  let section = `## Company Context\n`;
  section += `You represent ${companyLabel}.\n`;
  section += `Your interviewing tone is ${formalityLevel}.\n`;
  section += `${depthGuidance}\n`;

  if (modifier.behavioralEmphasis) {
    section += `This company places strong emphasis on behavioral evidence. Push candidates for specific, real examples — generic or hypothetical answers are not acceptable here.\n`;
  }

  if (modifier.cultureQuestions) {
    section += `Culture and values fit is a priority at this company. Weave in questions about working style, team dynamics, and what motivates the candidate.\n`;
  }

  const styleGuidance: Record<KnownStyle, string> = {
    faang: `You operate at a top-tier tech company where the bar is extremely high. You expect candidates to demonstrate structured thinking (STAR, frameworks), deep technical knowledge, and leadership principles. Vague answers will be challenged. Look for scope, impact, and scale in their examples.`,
    startup: `You work at a fast-moving startup. You value scrappiness, ownership, and adaptability over polish. Candidates who have worn multiple hats are appealing. Look for bias toward action and comfort with ambiguity.`,
    consulting: `You represent a consulting firm. You expect polished communication, structured problem-solving frameworks, and evidence of client-facing skills. Candidates should demonstrate they can simplify complexity for a non-technical audience.`,
    enterprise: `You are from a large enterprise organization. Process, stakeholder management, and cross-functional collaboration are key. Look for candidates who understand change management and how to get things done in complex organizations.`,
    agency: `You work at a creative or digital agency. You value creative thinking, speed, and client service. Look for candidates who balance creativity with delivery discipline and can manage multiple projects simultaneously.`,
    government: `You represent a government or public sector organization. Compliance, process adherence, and public accountability matter. Candidates should demonstrate attention to detail, documentation skills, and an understanding of regulatory or policy constraints.`,
  };

  section += `\n${styleGuidance[companyStyle]}\n\n`;
  return section;
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
  coaching_note: string | null;
}> {
  const systemPrompt = `You are an expert interview coach analyzing a single candidate response.
Score each dimension 0-100 and write one specific coaching note.
Return ONLY valid JSON with no additional text.

Scoring dimensions:
- star_score: How well does the response follow STAR format (Situation, Task, Action, Result)? For ${interviewType} interviews.
- clarity_score: How clear and well-structured is the response?
- confidence_score: How confident does the candidate sound based on language used?
- relevance_score: How relevant is the response to the question asked?
- depth_score: How much depth and detail does the response provide?

Also identify:
- filler_words: Array of filler words used (um, like, you know, so, basically, etc.)
- key_points: Array of 2-4 key takeaways from what the candidate actually said
- coaching_note: Follow these rules exactly:
  1. Find the single lowest-scoring dimension. That is your ONLY focus.
  2. Quote or closely paraphrase a specific phrase the candidate actually used — something they literally said.
  3. Explain in one sentence why that specific phrase weakened their answer for that dimension.
  4. Give one concrete, specific fix — not a general technique, but what they should have said instead.
  5. NEVER write generic advice like "use the STAR method", "be more specific", or "quantify your achievements" without tying it directly to a specific phrase they used and explaining exactly where they lost points.
  6. If all scores are 70 or above, return null — the answer was strong.
  Your note must be 2-3 sentences maximum. It must feel like a coach who was in the room, not a rubric.`;

  const userPrompt = `Question asked: "${question}"

Candidate's response: "${response}"

Analyze and return JSON:
{
  "star_score": <0-100>,
  "clarity_score": <0-100>,
  "confidence_score": <0-100>,
  "relevance_score": <0-100>,
  "depth_score": <0-100>,
  "filler_words": [<strings>],
  "key_points": [<strings>],
  "coaching_note": <specific string referencing their actual words, or null>
}`;

  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
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

      const rawContent = completion.choices[0]?.message?.content ?? '{}';
      console.log(`[Analysis] Raw response (attempt ${attempt}):`, rawContent.substring(0, 200));
      
      // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
      const content = rawContent
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      const parsed = JSON.parse(content) as Record<string, unknown>;

      const result = {
        star_score: Math.min(100, Math.max(0, (parsed.star_score as number) ?? 0)),
        clarity_score: Math.min(100, Math.max(0, (parsed.clarity_score as number) ?? 0)),
        confidence_score: Math.min(100, Math.max(0, (parsed.confidence_score as number) ?? 0)),
        relevance_score: Math.min(100, Math.max(0, (parsed.relevance_score as number) ?? 0)),
        depth_score: Math.min(100, Math.max(0, (parsed.depth_score as number) ?? 0)),
        word_count: response.split(/\s+/).length,
        filler_words: (parsed.filler_words as string[]) ?? [],
        key_points: (parsed.key_points as string[]) ?? [],
        coaching_note: typeof parsed.coaching_note === 'string' ? parsed.coaching_note.trim() || null : null,
      };
      
      console.log(`[Analysis] Parsed scores:`, { star: result.star_score, clarity: result.clarity_score, confidence: result.confidence_score });
      return result;
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Analysis] Error (attempt ${attempt}/${maxRetries}):`, errorMsg);
      
      // Retry on rate limit or server errors
      if (attempt < maxRetries && (errorMsg.includes('429') || errorMsg.includes('5'))) {
        const waitMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Analysis] Retrying in ${waitMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
        continue;
      }
    }
  }
  
  // All retries failed
  console.error('[Analysis] All retries failed, returning default 50s');
  return {
    star_score: 50,
    clarity_score: 50,
    confidence_score: 50,
    relevance_score: 50,
    depth_score: 50,
    word_count: response.split(/\s+/).length,
    filler_words: [],
    key_points: [],
    coaching_note: null,
  };
}
