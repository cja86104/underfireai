/**
 * UnderFireAI - Feedback Generator
 *
 * Generates comprehensive feedback for interview sessions.
 */

import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import type { InterviewMessage, ResponseAnalysis } from '@/types/database';
import type { DetailedFeedback, FeedbackSection, Recommendation } from '@/types/scoring';

export interface FeedbackGeneratorInput {
  messages: InterviewMessage[];
  interviewType: string;
  targetRole?: string | null;
  difficulty: number;
  scores: {
    overall: number;
    clarity: number;
    confidence: number;
    technical: number;
    star: number;
    communication: number;
  };
}

export interface GeneratedFeedback {
  strengths: string[];
  improvements: string[];
  interviewerImpression: string;
  aiFeedback: string;
  keyMoments: { type: string; description: string }[];
  recommendations: Recommendation[];
  detailedFeedback: DetailedFeedback;
}

/** Parsed JSON structure from AI feedback response */
interface ParsedFeedbackResponse {
  strengths?: unknown;
  improvements?: unknown;
  interviewer_impression?: string;
  ai_feedback?: string;
  key_moments?: unknown;
  recommendations?: unknown;
  detailed_feedback?: unknown;
}

/**
 * Generate comprehensive feedback for a completed interview
 */
export async function generateSessionFeedback(
  input: FeedbackGeneratorInput
): Promise<GeneratedFeedback> {
  const { messages, interviewType, targetRole, difficulty, scores } = input;

  // Build transcript
  const transcript = messages
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const prompt = `You are an expert interview coach. Analyze this interview transcript and provide comprehensive feedback.

Interview Type: ${interviewType}
${targetRole ? `Target Role: ${targetRole}` : ''}
Difficulty: ${difficulty}/10

TRANSCRIPT:
${transcript}

CALCULATED SCORES:
- Overall: ${scores.overall}%
- Clarity: ${scores.clarity}%
- Confidence: ${scores.confidence}%
- Technical Depth: ${scores.technical}%
- STAR Usage: ${scores.star}%
- Communication: ${scores.communication}%

Provide a JSON response with:
{
  "strengths": ["3-5 specific strengths with examples from the interview"],
  "improvements": ["3-5 specific areas for improvement with actionable advice"],
  "interviewer_impression": "2-3 sentences on how the interviewer likely perceived the candidate",
  "ai_feedback": "3-4 sentences of overall assessment with specific, actionable advice",
  "key_moments": [
    {"type": "strong|weak|turning_point", "description": "specific moment description"}
  ],
  "recommendations": [
    {
      "category": "category name",
      "priority": "high|medium|low",
      "recommendation": "specific recommendation",
      "practiceExercise": "optional exercise to improve"
    }
  ],
  "detailed_feedback": {
    "opening": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]},
    "bodyAnswers": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]},
    "technicalResponses": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]},
    "behavioralResponses": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]},
    "closing": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]},
    "overallPresentation": {"score": 0-100, "summary": "...", "highlights": [...], "improvements": [...]}
  }
}

Be specific and reference actual content from the interview. Focus on actionable feedback.
Return ONLY valid JSON, no markdown.`;

  try {
    const aiMessages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are an expert interview coach providing detailed, actionable feedback. Return only valid JSON.',
      },
      { role: 'user', content: prompt },
    ];

    const completion = await createChatCompletion(aiMessages, {
      model: AI_MODELS.ANALYSIS,
      ...MODEL_PARAMS.analysis,
      max_tokens: 4096,
    });

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed = JSON.parse(content) as ParsedFeedbackResponse;

    return {
      strengths: validateStringArray(parsed.strengths, getDefaultStrengths()),
      improvements: validateStringArray(parsed.improvements, getDefaultImprovements()),
      interviewerImpression: typeof parsed.interviewer_impression === 'string'
        ? parsed.interviewer_impression
        : getDefaultImpression(),
      aiFeedback: typeof parsed.ai_feedback === 'string'
        ? parsed.ai_feedback
        : getDefaultAIFeedback(),
      keyMoments: validateKeyMoments(parsed.key_moments),
      recommendations: validateRecommendations(parsed.recommendations),
      detailedFeedback: validateDetailedFeedback(parsed.detailed_feedback),
    };
  } catch (error) {
    console.error('Error generating feedback:', error);
    return getDefaultFeedback();
  }
}

/**
 * Generate quick feedback for a single response
 */
export function generateQuickFeedback(
  _response: string,
  _question: string,
  analysis: ResponseAnalysis
): string[] {
  const feedback: string[] = [];

  if (analysis.star_score < 50) {
    feedback.push('Try using the STAR format: describe the Situation, your Task, the Actions you took, and the Results.');
  }

  if (analysis.clarity_score < 50) {
    feedback.push('Structure your answer more clearly with a beginning, middle, and end.');
  }

  if (analysis.confidence_score < 50) {
    feedback.push('Use more confident language - avoid phrases like "I think" or "maybe".');
  }

  if (analysis.relevance_score < 60) {
    feedback.push('Make sure to directly address the question being asked.');
  }

  if (analysis.depth_score < 50) {
    feedback.push('Add more specific details, numbers, or concrete examples.');
  }

  if (analysis.filler_words && analysis.filler_words.length > 3) {
    feedback.push(`Reduce filler words like "${analysis.filler_words.slice(0, 2).join('", "')}".`);
  }

  if (analysis.word_count < 50) {
    feedback.push('Your response was brief. Consider elaborating with more context and examples.');
  }

  if (analysis.word_count > 300) {
    feedback.push('Your response was lengthy. Try to be more concise while keeping key points.');
  }

  return feedback.slice(0, 3);
}

/**
 * Generate improvement plan based on multiple sessions
 */
export function generateImprovementPlan(
  sessionFeedbacks: GeneratedFeedback[]
): Recommendation[] {
  const allRecommendations: Recommendation[] = [];
  const categoryCount: Record<string, number> = {};

  // Collect all recommendations and count categories
  for (const feedback of sessionFeedbacks) {
    for (const rec of feedback.recommendations) {
      categoryCount[rec.category] = (categoryCount[rec.category] || 0) + 1;
      allRecommendations.push(rec);
    }
  }

  // Sort by frequency and priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return allRecommendations
    .sort((a, b) => {
      const freqDiff = (categoryCount[b.category] || 0) - (categoryCount[a.category] || 0);
      if (freqDiff !== 0) return freqDiff;
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 5);
}

// Validation helpers
function validateStringArray(arr: unknown, fallback: string[]): string[] {
  if (!Array.isArray(arr)) return fallback;
  const valid = arr.filter((s): s is string => typeof s === 'string' && s.length > 0);
  return valid.length > 0 ? valid.slice(0, 10) : fallback;
}

function validateKeyMoments(moments: unknown): { type: string; description: string }[] {
  if (!Array.isArray(moments)) return [];
  return moments
    .filter(
      (m): m is { type: string; description: string } =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as Record<string, unknown>).type === 'string' &&
        typeof (m as Record<string, unknown>).description === 'string'
    )
    .slice(0, 10);
}

function validateRecommendations(recs: unknown): Recommendation[] {
  if (!Array.isArray(recs)) return getDefaultRecommendations();
  return recs
    .filter(
      (r): r is Recommendation =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Record<string, unknown>).category === 'string' &&
        typeof (r as Record<string, unknown>).recommendation === 'string'
    )
    .map((r) => ({
      category: r.category,
      priority: ['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'medium',
      recommendation: r.recommendation,
      practiceExercise: typeof r.practiceExercise === 'string' ? r.practiceExercise : undefined,
    }))
    .slice(0, 5);
}

function validateDetailedFeedback(feedback: unknown): DetailedFeedback {
  const defaultSection: FeedbackSection = {
    score: 50,
    summary: 'No detailed analysis available',
    highlights: [],
    improvements: [],
  };

  if (typeof feedback !== 'object' || feedback === null) {
    return {
      opening: defaultSection,
      bodyAnswers: defaultSection,
      technicalResponses: defaultSection,
      behavioralResponses: defaultSection,
      closing: defaultSection,
      overallPresentation: defaultSection,
    };
  }

  const fb = feedback as Record<string, unknown>;

  const validateSection = (section: unknown): FeedbackSection => {
    if (typeof section !== 'object' || section === null) return defaultSection;
    const s = section as Record<string, unknown>;
    return {
      score: typeof s.score === 'number' ? Math.min(100, Math.max(0, s.score)) : 50,
      summary: typeof s.summary === 'string' ? s.summary : defaultSection.summary,
      highlights: Array.isArray(s.highlights)
        ? s.highlights.filter((h): h is string => typeof h === 'string')
        : [],
      improvements: Array.isArray(s.improvements)
        ? s.improvements.filter((i): i is string => typeof i === 'string')
        : [],
    };
  };

  return {
    opening: validateSection(fb.opening),
    bodyAnswers: validateSection(fb.bodyAnswers),
    technicalResponses: validateSection(fb.technicalResponses),
    behavioralResponses: validateSection(fb.behavioralResponses),
    closing: validateSection(fb.closing),
    overallPresentation: validateSection(fb.overallPresentation),
  };
}

// Default values
function getDefaultStrengths(): string[] {
  return [
    'Engaged with the interviewer professionally',
    'Attempted to provide relevant examples',
    'Maintained composure throughout the interview',
  ];
}

function getDefaultImprovements(): string[] {
  return [
    'Use the STAR format more consistently for behavioral questions',
    'Provide more specific, quantifiable results',
    'Be more concise while maintaining key details',
  ];
}

function getDefaultImpression(): string {
  return 'The candidate showed potential but could strengthen their responses with more specific examples and structured answers.';
}

function getDefaultAIFeedback(): string {
  return 'Focus on structuring your answers using the STAR method and providing measurable outcomes from your experiences. Practice articulating your achievements with specific numbers and results.';
}

function getDefaultRecommendations(): Recommendation[] {
  return [
    {
      category: 'Structure',
      priority: 'high',
      recommendation: 'Practice using STAR format for all behavioral questions',
      practiceExercise: 'Write out 5 STAR stories from your experience',
    },
    {
      category: 'Specificity',
      priority: 'medium',
      recommendation: 'Include more numbers and metrics in your answers',
    },
  ];
}

function getDefaultFeedback(): GeneratedFeedback {
  return {
    strengths: getDefaultStrengths(),
    improvements: getDefaultImprovements(),
    interviewerImpression: getDefaultImpression(),
    aiFeedback: getDefaultAIFeedback(),
    keyMoments: [],
    recommendations: getDefaultRecommendations(),
    detailedFeedback: {
      opening: { score: 50, summary: 'Standard opening', highlights: [], improvements: [] },
      bodyAnswers: { score: 50, summary: 'Mixed quality responses', highlights: [], improvements: [] },
      technicalResponses: { score: 50, summary: 'Adequate technical discussion', highlights: [], improvements: [] },
      behavioralResponses: { score: 50, summary: 'Room for improvement', highlights: [], improvements: [] },
      closing: { score: 50, summary: 'Standard closing', highlights: [], improvements: [] },
      overallPresentation: { score: 50, summary: 'Professional demeanor', highlights: [], improvements: [] },
    },
  };
}
