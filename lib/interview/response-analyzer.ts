/**
 * UnderFireAI - Response Analyzer
 *
 * Analyzes candidate responses for STAR format, clarity, confidence, and more.
 */

import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import type { ResponseAnalysis } from '@/types/database';
import type {
  ResponseAnalysisResult,
  STARAnalysis,
  ContentAnalysis,
  CommunicationAnalysis,
  ResponseScores,
} from '@/types/scoring';

export interface AnalyzerParams {
  response: string;
  question: string;
  interviewType: string;
  responseTimeSeconds?: number;
}

/** Parsed JSON structure from quick analysis */
interface QuickAnalysisParsed {
  star_score?: number;
  clarity_score?: number;
  confidence_score?: number;
  relevance_score?: number;
  depth_score?: number;
  filler_words?: string[];
  key_points?: string[];
}

/**
 * Analyze a candidate's response comprehensively
 */
export async function analyzeResponseFull(params: AnalyzerParams): Promise<ResponseAnalysisResult> {
  const { response, question, interviewType, responseTimeSeconds } = params;

  // Run analyses in parallel
  const [starAnalysis, contentAnalysis, communicationAnalysis] = await Promise.all([
    analyzeSTARFormat(response, question),
    analyzeContent(response, question, interviewType),
    analyzeCommunication(response, responseTimeSeconds),
  ]);

  // Calculate scores
  const scores = calculateScores(starAnalysis, contentAnalysis, communicationAnalysis);

  // Generate suggestions
  const suggestions = generateSuggestions(starAnalysis, contentAnalysis, communicationAnalysis);

  return {
    scores,
    starAnalysis,
    contentAnalysis,
    communicationAnalysis,
    suggestions,
  };
}

/**
 * Quick analysis for real-time feedback (used in chat route)
 */
export async function analyzeResponseQuick(
  response: string,
  question: string,
  interviewType: string
): Promise<ResponseAnalysis> {
  const prompt = `Analyze this interview response and return scores from 0-100.

Question: ${question}
Response: ${response}
Interview Type: ${interviewType}

Return ONLY valid JSON:
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
        { role: 'system', content: 'You analyze interview responses. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed = JSON.parse(content) as QuickAnalysisParsed;

    return {
      star_score: clamp(parsed.star_score ?? 50),
      clarity_score: clamp(parsed.clarity_score ?? 50),
      confidence_score: clamp(parsed.confidence_score ?? 50),
      relevance_score: clamp(parsed.relevance_score ?? 50),
      depth_score: clamp(parsed.depth_score ?? 50),
      word_count: response.split(/\s+/).length,
      filler_words: parsed.filler_words ?? [],
      key_points: parsed.key_points ?? [],
    };
  } catch (error) {
    console.error('Error in quick analysis:', error);
    return getDefaultAnalysis(response);
  }
}

async function analyzeSTARFormat(response: string, question: string): Promise<STARAnalysis> {
  const prompt = `Analyze if this response follows the STAR format (Situation, Task, Action, Result).

Question: ${question}
Response: ${response}

Return JSON:
{
  "detected": true/false,
  "completeness": {
    "situation": true/false,
    "task": true/false,
    "action": true/false,
    "result": true/false,
    "score": 0-100
  },
  "components": {
    "situation": { "text": "extracted text or empty", "quality": "weak|adequate|strong", "feedback": "brief feedback" },
    "task": { "text": "...", "quality": "...", "feedback": "..." },
    "action": { "text": "...", "quality": "...", "specificity": 0-100, "feedback": "..." },
    "result": { "text": "...", "quality": "...", "quantified": true/false, "feedback": "..." }
  },
  "feedback": "Overall STAR feedback"
}`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You analyze STAR format usage. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    return JSON.parse(content) as STARAnalysis;
  } catch (error) {
    console.error('Error analyzing STAR:', error);
    return {
      detected: false,
      completeness: { situation: false, task: false, action: false, result: false, score: 0 },
      components: {},
      feedback: 'Unable to analyze STAR format',
    };
  }
}

async function analyzeContent(
  response: string,
  question: string,
  interviewType: string
): Promise<ContentAnalysis> {
  const prompt = `Analyze the content quality of this interview response.

Question: ${question}
Response: ${response}
Interview Type: ${interviewType}

Return JSON:
{
  "keyPoints": [
    { "point": "key point text", "relevance": "high|medium|low", "impact": "positive|neutral|negative" }
  ],
  "missingElements": ["what should have been mentioned"],
  "strengthAreas": ["areas where response was strong"],
  "weaknessAreas": ["areas needing improvement"]
}`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You analyze interview content. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    return JSON.parse(content) as ContentAnalysis;
  } catch (error) {
    console.error('Error analyzing content:', error);
    return {
      keyPoints: [],
      missingElements: [],
      strengthAreas: [],
      weaknessAreas: [],
    };
  }
}

// This function is intentionally async to work with Promise.all in analyzeResponseFull
// eslint-disable-next-line @typescript-eslint/require-await
async function analyzeCommunication(
  response: string,
  _responseTimeSeconds?: number
): Promise<CommunicationAnalysis> {
  const words = response.split(/\s+/);
  const wordCount = words.length;
  const estimatedDuration = wordCount / 2.5; // ~150 words per minute

  // Detect filler words
  const fillerPatterns = [
    'um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally',
    'so yeah', 'i mean', 'kind of', 'sort of', 'right', 'okay so',
  ];

  const fillerCounts: Record<string, number> = {};
  const lowerResponse = response.toLowerCase();

  for (const filler of fillerPatterns) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerResponse.match(regex);
    if (matches && matches.length > 0) {
      fillerCounts[filler] = matches.length;
    }
  }

  const totalFillers = Object.values(fillerCounts).reduce((a, b) => a + b, 0);
  const fillerPercentage = (totalFillers / wordCount) * 100;

  // Determine pace
  let pace: CommunicationAnalysis['pace'] = 'appropriate';
  if (wordCount < 30) pace = 'too_short';
  else if (wordCount < 75) pace = 'concise';
  else if (wordCount > 300) pace = 'too_long';
  else if (wordCount > 200) pace = 'verbose';

  // Determine structure
  let structure: CommunicationAnalysis['structure'] = 'partially_structured';
  const hasTransitions = /first|second|then|finally|additionally|moreover|however/i.test(response);
  const hasParagraphs = response.includes('\n') || response.split('. ').length > 3;
  if (hasTransitions && hasParagraphs) structure = 'well_structured';
  else if (!hasTransitions && !hasParagraphs) structure = 'unstructured';

  // Confidence indicators
  const positiveIndicators: string[] = [];
  const negativeIndicators: string[] = [];
  const hedgingPhrases: string[] = [];

  if (/I led|I drove|I implemented|I achieved/i.test(response)) {
    positiveIndicators.push('Uses strong action verbs');
  }
  if (/successfully|effectively|significantly/i.test(response)) {
    positiveIndicators.push('Uses confident qualifiers');
  }
  if (/I think|maybe|probably|I guess/i.test(response)) {
    negativeIndicators.push('Uses uncertain language');
    hedgingPhrases.push(...(response.match(/I think|maybe|probably|I guess/gi) ?? []));
  }
  if (/I believe|I am confident|I know/i.test(response)) {
    positiveIndicators.push('Expresses conviction');
  }

  const confidenceScore = Math.max(
    0,
    Math.min(100, 70 + positiveIndicators.length * 10 - negativeIndicators.length * 15)
  );

  return {
    wordCount,
    estimatedDuration,
    pace,
    structure,
    fillerWords: {
      count: totalFillers,
      words: Object.entries(fillerCounts).map(([word, count]) => ({ word, count })),
      percentage: Math.round(fillerPercentage * 10) / 10,
      severity: fillerPercentage < 1 ? 'none' : fillerPercentage < 3 ? 'minor' : fillerPercentage < 5 ? 'moderate' : 'severe',
    },
    confidenceIndicators: {
      score: confidenceScore,
      positiveIndicators,
      negativeIndicators,
      hedgingPhrases,
    },
    clarityScore: structure === 'well_structured' ? 85 : structure === 'partially_structured' ? 65 : 45,
  };
}

function calculateScores(
  star: STARAnalysis,
  content: ContentAnalysis,
  communication: CommunicationAnalysis
): ResponseScores {
  const starScore = star.completeness?.score || 0;
  const clarityScore = communication.clarityScore;
  const confidenceScore = communication.confidenceIndicators.score;

  const relevance = content.keyPoints.filter(kp => kp.relevance === 'high').length * 25 +
    content.keyPoints.filter(kp => kp.relevance === 'medium').length * 15;
  const relevanceScore = Math.min(100, relevance + 30);

  const depthScore = Math.min(100,
    (content.strengthAreas.length * 20) +
    (star.components?.action?.specificity ?? 50)
  ) / 2 + 25;

  const overall = Math.round(
    starScore * 0.25 +
    clarityScore * 0.20 +
    confidenceScore * 0.15 +
    relevanceScore * 0.25 +
    depthScore * 0.15
  );

  return {
    overall,
    star: starScore,
    clarity: clarityScore,
    confidence: confidenceScore,
    relevance: relevanceScore,
    depth: depthScore,
  };
}

function generateSuggestions(
  star: STARAnalysis,
  content: ContentAnalysis,
  communication: CommunicationAnalysis
): string[] {
  const suggestions: string[] = [];

  if (!star.detected || (star.completeness?.score || 0) < 50) {
    suggestions.push('Structure your answer using STAR format: Situation, Task, Action, Result');
  }

  if (!star.completeness?.result) {
    suggestions.push('Include quantifiable results or outcomes');
  }

  if (communication.pace === 'too_short') {
    suggestions.push('Provide more detail and specific examples');
  }

  if (communication.pace === 'too_long') {
    suggestions.push('Be more concise - focus on the most impactful points');
  }

  if (communication.fillerWords.severity === 'moderate' || communication.fillerWords.severity === 'severe') {
    suggestions.push('Reduce filler words like "um", "like", "you know"');
  }

  if (communication.confidenceIndicators.negativeIndicators.length > 0) {
    suggestions.push('Use more confident language - avoid "I think" or "maybe"');
  }

  if (content.missingElements.length > 0) {
    suggestions.push(`Consider addressing: ${content.missingElements.slice(0, 2).join(', ')}`);
  }

  return suggestions.slice(0, 5);
}

function getDefaultAnalysis(response: string): ResponseAnalysis {
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

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
