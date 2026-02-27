/**
 * UnderFireAI - Resume Alignment Analyzer
 *
 * Compares resume claims against actual interview performance
 * to identify discrepancies and generate improvement suggestions.
 */

import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import type { ResponseAnalysis } from '@/types/database';

// ===========================================
// TYPES
// ===========================================

export interface AlignmentDiscrepancy {
  claim: string;
  evidence: string;
  severity: 'high' | 'medium' | 'low';
  suggestion: string;
}

export interface AlignmentConfirmation {
  claim: string;
  evidence: string;
}

export interface ResumeSuggestion {
  type: 'add' | 'modify' | 'remove';
  currentText: string | null;
  suggestedText: string;
  reason: string;
  sourceQuote?: string;
}

export interface AlignmentAnalysis {
  alignmentScore: number;
  discrepancies: AlignmentDiscrepancy[];
  confirmations: AlignmentConfirmation[];
  suggestions: ResumeSuggestion[];
}

interface InterviewMessage {
  role: 'interviewer' | 'candidate';
  content: string;
  analysis?: ResponseAnalysis | null;
}

interface InterviewScores {
  overall_score: number;
  clarity_score: number;
  confidence_score: number;
  technical_depth: number;
  star_usage_score: number;
  communication_score: number;
}

interface ParsedAlignmentResponse {
  alignmentScore?: number;
  discrepancies?: unknown[];
  confirmations?: unknown[];
  suggestions?: unknown[];
}

// ===========================================
// MAIN FUNCTION
// ===========================================

/**
 * Analyze alignment between resume and interview performance
 */
export async function analyzeResumeAlignment(
  resumeText: string,
  resumeSkills: string[],
  messages: InterviewMessage[],
  scores: InterviewScores,
  interviewType: string,
  targetRole?: string | null
): Promise<AlignmentAnalysis> {
  // Build transcript summary focusing on candidate responses
  const candidateResponses = messages
    .filter((m) => m.role === 'candidate')
    .map((m, i) => {
      const analysis = m.analysis;
      const scoreNote = analysis
        ? ` [Clarity: ${analysis.clarity_score}, Depth: ${analysis.depth_score}, STAR: ${analysis.star_score}]`
        : '';
      return `Response ${i + 1}${scoreNote}:\n${m.content}`;
    })
    .join('\n\n');

  // Extract key claims from resume (bullet points, skills, experience)
  const resumeBullets = extractResumeBullets(resumeText);

  const prompt = `You are an expert interview coach analyzing resume-interview alignment.

RESUME CONTENT:
${resumeText.slice(0, 4000)}

KEY RESUME CLAIMS:
${resumeBullets.slice(0, 20).map((b, i) => `${i + 1}. ${b}`).join('\n')}

LISTED SKILLS: ${resumeSkills.slice(0, 30).join(', ')}

INTERVIEW TYPE: ${interviewType}
${targetRole ? `TARGET ROLE: ${targetRole}` : ''}

INTERVIEW PERFORMANCE SCORES:
- Overall: ${scores.overall_score}%
- Clarity: ${scores.clarity_score}%
- Confidence: ${scores.confidence_score}%
- Technical Depth: ${scores.technical_depth}%
- STAR Usage: ${scores.star_usage_score}%
- Communication: ${scores.communication_score}%

CANDIDATE'S INTERVIEW RESPONSES:
${candidateResponses.slice(0, 6000)}

Analyze the alignment between what the resume claims and how the candidate actually performed.

Look for:
1. DISCREPANCIES: Claims on resume not supported by interview performance
   - Technical skills claimed but struggled with related questions
   - Leadership claims but vague on team management details
   - Years of experience but shallow depth on topics

2. CONFIRMATIONS: Resume claims backed up by strong interview evidence
   - Skills demonstrated clearly
   - Stories that proved experience claims

3. SUGGESTIONS: How to improve the resume based on interview performance
   - Things they said well that aren't on resume
   - Claims that need more specificity
   - Overselling that should be toned down

Return JSON:
{
  "alignmentScore": 0-100 (100 = perfect alignment, resume matches demonstrated abilities),
  "discrepancies": [
    {
      "claim": "Exact text or paraphrase from resume",
      "evidence": "What happened in the interview that contradicts this",
      "severity": "high|medium|low",
      "suggestion": "SPECIFIC action - see rules below"
    }
  ],
  "confirmations": [
    {
      "claim": "Resume claim that was validated",
      "evidence": "What they said/demonstrated that proved it"
    }
  ],
  "suggestions": [
    {
      "type": "add|modify|remove",
      "currentText": "Current resume text (null for 'add')",
      "suggestedText": "Improved or new text",
      "reason": "Why this change helps",
      "sourceQuote": "Quote from interview that supports this"
    }
  ]
}

CRITICAL RULES FOR SUGGESTIONS:
1. NEVER say "prepare a STAR response" - this is useless generic advice
2. NEVER say "practice explaining" or "be prepared to discuss" - they already know this
3. Instead, give SPECIFIC RESUME EDITS like:
   - "Change 'Led team of 5' to 'Led team of 5 engineers, delivering 3 features in Q2 2024'"
   - "Remove 'Expert in React' - demonstrated intermediate knowledge; change to 'Proficient in React'"
   - "Add bullet: 'Reduced API response time by 40% using Redis caching' (mentioned in interview but not on resume)"
4. Each suggestion must be a CONCRETE TEXT CHANGE they can copy-paste into their resume
5. Reference SPECIFIC things they said in the interview, not vague advice

BAD suggestion: "Prepare a STAR response about your Kirra project"
GOOD suggestion: "Add to Kirra Companion bullet: 'Implemented persistent memory system using vector embeddings, reducing context lookup time by 60%' - you explained this well but it's missing from resume"

BAD suggestion: "Be more specific about your leadership experience"  
GOOD suggestion: "Change 'Managed development team' to 'Managed 4-person development team across 2 time zones, shipping weekly releases for 8 months'"

Focus on the most impactful changes. Give them TEXT they can use, not advice about what to practice.
Return ONLY valid JSON.`;

  try {
    const completion = await createChatCompletion(
      [
        {
          role: 'system',
          content:
            'You are an expert interview coach analyzing resume-interview alignment. Return only valid JSON.',
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

    const parsed = JSON.parse(content) as ParsedAlignmentResponse;

    return {
      alignmentScore: validateScore(parsed.alignmentScore),
      discrepancies: validateDiscrepancies(parsed.discrepancies),
      confirmations: validateConfirmations(parsed.confirmations),
      suggestions: validateSuggestions(parsed.suggestions),
    };
  } catch (error) {
    console.error('Error analyzing resume alignment:', error);
    // Return basic analysis on error
    return generateBasicAlignment(scores);
  }
}

// ===========================================
// HELPERS
// ===========================================

/**
 * Extract bullet points and key claims from resume text
 */
function extractResumeBullets(text: string): string[] {
  const bullets: string[] = [];

  // Match common bullet patterns
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty or very short lines
    if (trimmed.length < 10) continue;

    // Match bullet points (-, *, •, numbers)
    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''));
    }
    // Match lines that look like achievements (start with verb)
    else if (
      /^(Led|Managed|Developed|Built|Created|Implemented|Designed|Increased|Reduced|Improved|Delivered|Launched)/i.test(
        trimmed
      )
    ) {
      bullets.push(trimmed);
    }
  }

  return bullets;
}

function validateScore(score: unknown): number {
  if (typeof score === 'number' && score >= 0 && score <= 100) {
    return Math.round(score);
  }
  return 50; // Default middle score
}

function validateDiscrepancies(arr: unknown): AlignmentDiscrepancy[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).claim === 'string' &&
        typeof (item as Record<string, unknown>).evidence === 'string'
    )
    .map((item) => ({
      claim: String(item.claim),
      evidence: String(item.evidence),
      severity: validateSeverity(item.severity),
      suggestion: typeof item.suggestion === 'string' ? item.suggestion : '',
    }))
    .slice(0, 10);
}

function validateConfirmations(arr: unknown): AlignmentConfirmation[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).claim === 'string' &&
        typeof (item as Record<string, unknown>).evidence === 'string'
    )
    .map((item) => ({
      claim: String(item.claim),
      evidence: String(item.evidence),
    }))
    .slice(0, 10);
}

function validateSuggestions(arr: unknown): ResumeSuggestion[] {
  if (!Array.isArray(arr)) return [];

  return arr
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).suggestedText === 'string'
    )
    .map((item) => ({
      type: validateSuggestionType(item.type),
      currentText:
        typeof item.currentText === 'string' ? item.currentText : null,
      suggestedText: String(item.suggestedText),
      reason: typeof item.reason === 'string' ? item.reason : '',
      sourceQuote:
        typeof item.sourceQuote === 'string' ? item.sourceQuote : undefined,
    }))
    .slice(0, 10);
}

function validateSeverity(
  severity: unknown
): 'high' | 'medium' | 'low' {
  if (severity === 'high' || severity === 'medium' || severity === 'low') {
    return severity;
  }
  return 'medium';
}

function validateSuggestionType(type: unknown): 'add' | 'modify' | 'remove' {
  if (type === 'add' || type === 'modify' || type === 'remove') {
    return type;
  }
  return 'modify';
}

/**
 * Generate basic alignment analysis when AI fails
 */
function generateBasicAlignment(scores: InterviewScores): AlignmentAnalysis {
  const avgScore =
    (scores.clarity_score +
      scores.confidence_score +
      scores.technical_depth +
      scores.communication_score) /
    4;

  const discrepancies: AlignmentDiscrepancy[] = [];
  const suggestions: ResumeSuggestion[] = [];

  if (scores.technical_depth < 60) {
    discrepancies.push({
      claim: 'Technical skills listed on resume',
      evidence:
        'Technical depth score was below expectations in the interview',
      severity: 'medium',
      suggestion:
        'Practice explaining technical concepts in more depth, or consider adjusting resume claims to match demonstrated level',
    });
  }

  if (scores.star_usage_score < 50) {
    suggestions.push({
      type: 'modify',
      currentText: null,
      suggestedText:
        'Add specific metrics and outcomes to your experience bullets',
      reason:
        'Low STAR usage suggests your resume may lack quantifiable achievements',
    });
  }

  return {
    alignmentScore: Math.round(avgScore),
    discrepancies,
    confirmations: [],
    suggestions,
  };
}
