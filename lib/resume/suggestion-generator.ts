/**
 * UnderFireAI - Resume Suggestion Generator
 *
 * Generates post-interview resume improvements based on
 * what candidates said well during their practice sessions.
 */

import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import type { ResponseAnalysis } from '@/types/database';

// ===========================================
// TYPES
// ===========================================

export interface ResumeSuggestion {
  id: string;
  type: 'add' | 'modify' | 'remove' | 'reorder';
  priority: 'high' | 'medium' | 'low';
  section: ResumeSection;
  currentText: string | null;
  suggestedText: string;
  reason: string;
  sourceQuote: string | null;
  sessionId: string;
}

export type ResumeSection =
  | 'summary'
  | 'experience'
  | 'skills'
  | 'education'
  | 'projects'
  | 'achievements'
  | 'other';

export interface SuggestionBatch {
  suggestions: ResumeSuggestion[];
  summary: string;
  topPriority: string[];
  sessionsAnalyzed: number;
}

interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  analysis?: ResponseAnalysis | null;
}

interface SessionData {
  sessionId: string;
  messages: InterviewMessage[];
  interviewType: string;
  targetRole?: string | null;
  scores: {
    overall_score: number;
    clarity_score: number;
    star_usage_score: number;
    technical_depth: number;
  };
}

interface ParsedSuggestionsResponse {
  suggestions?: unknown[];
  summary?: string;
  topPriority?: unknown[];
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Generate resume suggestions from one or more interview sessions
 */
export async function generateResumeSuggestions(
  resumeText: string,
  sessions: SessionData[]
): Promise<SuggestionBatch> {
  if (sessions.length === 0) {
    return {
      suggestions: [],
      summary: 'No sessions to analyze',
      topPriority: [],
      sessionsAnalyzed: 0,
    };
  }

  // Build excerpts from high-scoring candidate responses
  const strongResponses = extractStrongResponses(sessions);
  const weakAreas = extractWeakAreas(sessions);

  const prompt = `You are an expert resume coach. Based on interview practice sessions, suggest improvements to this resume.

CURRENT RESUME:
${resumeText.slice(0, 4000)}

STRONG MOMENTS FROM INTERVIEWS (use these to improve resume):
${strongResponses.slice(0, 3000)}

WEAK AREAS IDENTIFIED (address these on resume):
${weakAreas.slice(0, 1500)}

INTERVIEW CONTEXT:
- Sessions analyzed: ${sessions.length}
- Interview types: ${[...new Set(sessions.map((s) => s.interviewType))].join(', ')}
- Average score: ${Math.round(sessions.reduce((a, s) => a + s.scores.overall_score, 0) / sessions.length)}%

Generate specific resume improvements based on what the candidate said well in interviews but may not have on their resume.

Focus on:
1. QUANTIFIABLE ACHIEVEMENTS mentioned verbally but not on resume
2. STRONG STORIES that should be highlighted
3. SKILLS DEMONSTRATED but not listed
4. WEAK AREAS that need strengthening with better phrasing

Return JSON:
{
  "suggestions": [
    {
      "type": "add|modify|remove|reorder",
      "priority": "high|medium|low",
      "section": "summary|experience|skills|education|projects|achievements|other",
      "currentText": "Current resume text (null for 'add')",
      "suggestedText": "New or improved text",
      "reason": "Why this improves the resume",
      "sourceQuote": "Quote from interview that supports this (null if not applicable)"
    }
  ],
  "summary": "2-3 sentence summary of key improvements",
  "topPriority": ["Top 3 most impactful changes to make"]
}

Be specific - use exact quotes and numbers from the interviews.
Return ONLY valid JSON.`;

  try {
    const completion = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            'You are an expert resume coach generating improvements based on interview performance. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed = JSON.parse(content) as ParsedSuggestionsResponse;

    const suggestions = validateSuggestions(parsed.suggestions, sessions);

    return {
      suggestions,
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary
          : `Generated ${suggestions.length} suggestions from ${sessions.length} interview session(s).`,
      topPriority: validateStringArray(parsed.topPriority).slice(0, 3),
      sessionsAnalyzed: sessions.length,
    };
  } catch (error) {
    console.error('Error generating resume suggestions:', error);
    return generateBasicSuggestions(sessions);
  }
}

/**
 * Generate suggestions from a single session (convenience wrapper)
 */
export async function generateSessionSuggestions(
  resumeText: string,
  sessionId: string,
  messages: InterviewMessage[],
  interviewType: string,
  scores: SessionData['scores'],
  targetRole?: string | null
): Promise<ResumeSuggestion[]> {
  const batch = await generateResumeSuggestions(resumeText, [
    {
      sessionId,
      messages,
      interviewType,
      targetRole,
      scores,
    },
  ]);

  return batch.suggestions;
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Extract strong responses from sessions for suggestion generation
 */
function extractStrongResponses(sessions: SessionData[]): string {
  const strong: string[] = [];

  for (const session of sessions) {
    const candidateMessages = session.messages.filter(
      (m) => m.role === 'candidate' && m.analysis
    );

    for (const msg of candidateMessages) {
      const analysis = msg.analysis;
      if (!analysis) continue;

      // High clarity or high STAR usage indicates articulate responses
      if ((analysis.clarity_score ?? 0) >= 75 || (analysis.star_score ?? 0) >= 70) {
        strong.push(
          `[Session: ${session.interviewType}${session.targetRole ? ` for ${session.targetRole}` : ''}]\n` +
            `Response (Clarity: ${analysis.clarity_score}, STAR: ${analysis.star_score}):\n` +
            `"${msg.content.slice(0, 500)}${msg.content.length > 500 ? '...' : ''}"`
        );
      }
    }
  }

  return strong.join('\n\n');
}

/**
 * Extract weak areas that need improvement
 */
function extractWeakAreas(sessions: SessionData[]): string {
  const weak: string[] = [];

  for (const session of sessions) {
    // Session-level weaknesses
    if (session.scores.star_usage_score < 50) {
      weak.push(
        `- ${session.interviewType} interview: Low STAR usage (${session.scores.star_usage_score}%) - needs better structured stories`
      );
    }
    if (session.scores.technical_depth < 50) {
      weak.push(
        `- ${session.interviewType} interview: Low technical depth (${session.scores.technical_depth}%) - claims may need backing`
      );
    }

    // Message-level weaknesses
    const candidateMessages = session.messages.filter(
      (m) => m.role === 'candidate' && m.analysis
    );

    for (const msg of candidateMessages) {
      const analysis = msg.analysis;
      if (!analysis) continue;

      if ((analysis.clarity_score ?? 100) < 40) {
        weak.push(
          `- Unclear response: "${msg.content.slice(0, 100)}..." (Clarity: ${analysis.clarity_score})`
        );
      }
    }
  }

  return weak.slice(0, 10).join('\n');
}

function validateSuggestions(
  arr: unknown,
  sessions: SessionData[]
): ResumeSuggestion[] {
  if (!Array.isArray(arr)) return [];

  const defaultSessionId = sessions[0]?.sessionId || 'unknown';

  return arr
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).suggestedText === 'string'
    )
    .map((item, index) => ({
      id: `suggestion-${Date.now()}-${index}`,
      type: validateSuggestionType(item.type),
      priority: validatePriority(item.priority),
      section: validateSection(item.section),
      currentText:
        typeof item.currentText === 'string' ? item.currentText : null,
      suggestedText: String(item.suggestedText),
      reason: typeof item.reason === 'string' ? item.reason : '',
      sourceQuote:
        typeof item.sourceQuote === 'string' ? item.sourceQuote : null,
      sessionId: defaultSessionId,
    }))
    .slice(0, 15);
}

function validateSuggestionType(
  type: unknown
): 'add' | 'modify' | 'remove' | 'reorder' {
  if (
    type === 'add' ||
    type === 'modify' ||
    type === 'remove' ||
    type === 'reorder'
  ) {
    return type;
  }
  return 'modify';
}

function validatePriority(priority: unknown): 'high' | 'medium' | 'low' {
  if (priority === 'high' || priority === 'medium' || priority === 'low') {
    return priority;
  }
  return 'medium';
}

function validateSection(section: unknown): ResumeSection {
  const validSections: ResumeSection[] = [
    'summary',
    'experience',
    'skills',
    'education',
    'projects',
    'achievements',
    'other',
  ];

  if (
    typeof section === 'string' &&
    validSections.includes(section as ResumeSection)
  ) {
    return section as ResumeSection;
  }
  return 'experience';
}

function validateStringArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === 'string');
}

/**
 * Generate basic suggestions when AI fails
 */
function generateBasicSuggestions(sessions: SessionData[]): SuggestionBatch {
  const suggestions: ResumeSuggestion[] = [];

  // Check for common patterns across sessions
  const avgStarScore =
    sessions.reduce((a, s) => a + s.scores.star_usage_score, 0) / sessions.length;
  const avgTechDepth =
    sessions.reduce((a, s) => a + s.scores.technical_depth, 0) / sessions.length;

  if (avgStarScore < 60) {
    suggestions.push({
      id: `suggestion-${Date.now()}-0`,
      type: 'modify',
      priority: 'high',
      section: 'experience',
      currentText: null,
      suggestedText:
        'Add specific metrics and outcomes to your experience bullets using the STAR format',
      reason: `Your average STAR usage score was ${Math.round(avgStarScore)}%, suggesting your resume bullets may lack quantifiable results`,
      sourceQuote: null,
      sessionId: sessions[0]?.sessionId || 'unknown',
    });
  }

  if (avgTechDepth < 60) {
    suggestions.push({
      id: `suggestion-${Date.now()}-1`,
      type: 'modify',
      priority: 'medium',
      section: 'skills',
      currentText: null,
      suggestedText:
        'Consider organizing skills by proficiency level and adding context for how each was used',
      reason: `Your technical depth scores averaged ${Math.round(avgTechDepth)}%, indicating room to better demonstrate expertise`,
      sourceQuote: null,
      sessionId: sessions[0]?.sessionId || 'unknown',
    });
  }

  return {
    suggestions,
    summary: `Based on ${sessions.length} interview session(s), your resume could benefit from more specific, quantifiable achievements.`,
    topPriority: [
      'Add metrics to achievement statements',
      'Structure experience bullets with clear outcomes',
    ],
    sessionsAnalyzed: sessions.length,
  };
}

// ===========================================
// AGGREGATION
// ===========================================

/**
 * Aggregate suggestions from multiple sessions, removing duplicates
 */
export function aggregateSuggestions(
  batches: SuggestionBatch[]
): SuggestionBatch {
  const allSuggestions: ResumeSuggestion[] = [];
  const seenTexts = new Set<string>();

  for (const batch of batches) {
    for (const suggestion of batch.suggestions) {
      // Dedupe by suggested text similarity
      const normalized = suggestion.suggestedText.toLowerCase().slice(0, 50);
      if (!seenTexts.has(normalized)) {
        seenTexts.add(normalized);
        allSuggestions.push(suggestion);
      }
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  allSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    suggestions: allSuggestions.slice(0, 20),
    summary: `Aggregated ${allSuggestions.length} unique suggestions from ${batches.reduce((a, b) => a + b.sessionsAnalyzed, 0)} sessions.`,
    topPriority: allSuggestions
      .filter((s) => s.priority === 'high')
      .slice(0, 3)
      .map((s) => s.reason),
    sessionsAnalyzed: batches.reduce((a, b) => a + b.sessionsAnalyzed, 0),
  };
}
