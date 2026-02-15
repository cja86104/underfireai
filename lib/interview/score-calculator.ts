/**
 * UnderFireAI - Score Calculator
 *
 * Calculates session scores from individual response analyses.
 */

import { SCORING_WEIGHTS } from '@/lib/ai/config';
import type { ResponseAnalysis } from '@/types/database';
import type { CategoryScores, ScoringKeyMoment } from '@/types/scoring';

export interface ScoreCalculatorInput {
  analyses: ResponseAnalysis[];
  interviewType: string;
  difficulty: number;
  messages?: {
    role: 'interviewer' | 'candidate';
    content: string;
    analysis?: ResponseAnalysis | null;
  }[];
}

export interface CalculatedScores {
  overall: number;
  clarity: number;
  confidence: number;
  technical: number;
  star: number;
  communication: number;
  relevance: number;
}

/**
 * Calculate scores from an array of response analyses
 */
export function calculateSessionScores(input: ScoreCalculatorInput): CalculatedScores {
  const { analyses, interviewType, difficulty } = input;

  if (analyses.length === 0) {
    return {
      overall: 0,
      clarity: 0,
      confidence: 0,
      technical: 0,
      star: 0,
      communication: 0,
      relevance: 0,
    };
  }

  // Calculate averages
  const sum = analyses.reduce(
    (acc, a) => ({
      clarity: acc.clarity + (a.clarity_score || 0),
      confidence: acc.confidence + (a.confidence_score || 0),
      depth: acc.depth + (a.depth_score || 0),
      star: acc.star + (a.star_score || 0),
      relevance: acc.relevance + (a.relevance_score || 0),
    }),
    { clarity: 0, confidence: 0, depth: 0, star: 0, relevance: 0 }
  );

  const count = analyses.length;
  const avgClarity = sum.clarity / count;
  const avgConfidence = sum.confidence / count;
  const avgDepth = sum.depth / count;
  const avgStar = sum.star / count;
  const avgRelevance = sum.relevance / count;
  const avgCommunication = (avgClarity + avgRelevance) / 2;

  // Get weights for interview type
  const weights = SCORING_WEIGHTS[interviewType as keyof typeof SCORING_WEIGHTS] || SCORING_WEIGHTS.overall;

  // Calculate weighted overall
  const weightedOverall =
    avgClarity * weights.clarity +
    avgConfidence * weights.confidence +
    avgDepth * weights.depth +
    avgStar * weights.star_usage +
    avgRelevance * weights.relevance +
    avgCommunication * weights.communication;

  // Apply difficulty bonus: harder interviews get slight boost
  const difficultyBonus = (difficulty - 5) * 2;
  const adjustedOverall = clamp(weightedOverall + difficultyBonus);

  return {
    overall: adjustedOverall,
    clarity: Math.round(avgClarity),
    confidence: Math.round(avgConfidence),
    technical: Math.round(avgDepth),
    star: Math.round(avgStar),
    communication: Math.round(avgCommunication),
    relevance: Math.round(avgRelevance),
  };
}

/**
 * Identify key moments in the interview
 */
export function identifyKeyMoments(
  messages: {
    role: 'interviewer' | 'candidate';
    content: string;
    analysis?: ResponseAnalysis | null;
  }[]
): ScoringKeyMoment[] {
  const moments: ScoringKeyMoment[] = [];
  let prevScore: number | null = null;

  messages.forEach((msg, index) => {
    if (msg.role !== 'candidate' || !msg.analysis) return;

    const analysis = msg.analysis;
    const avgScore = (
      (analysis.star_score || 0) +
      (analysis.clarity_score || 0) +
      (analysis.confidence_score || 0) +
      (analysis.relevance_score || 0) +
      (analysis.depth_score || 0)
    ) / 5;

    // Strong moment (score > 80)
    if (avgScore >= 80) {
      moments.push({
        timestamp: index,
        messageIndex: index,
        type: 'strong',
        description: 'Excellent response with clear structure and depth',
        impact: Math.round((avgScore - 70) / 3),
        quote: msg.content.slice(0, 100) + (msg.content.length > 100 ? '...' : ''),
      });
    }

    // Weak moment (score < 40)
    if (avgScore < 40) {
      moments.push({
        timestamp: index,
        messageIndex: index,
        type: 'weak',
        description: 'Response lacked clarity or specificity',
        impact: -Math.round((50 - avgScore) / 5),
      });
    }

    // Turning point (significant score change)
    if (prevScore !== null) {
      const change = avgScore - prevScore;
      if (change > 20) {
        moments.push({
          timestamp: index,
          messageIndex: index,
          type: 'turning_point',
          description: 'Significant improvement in response quality',
          impact: Math.round(change / 5),
        });
      } else if (change < -20) {
        moments.push({
          timestamp: index,
          messageIndex: index,
          type: 'turning_point',
          description: 'Drop in response quality',
          impact: Math.round(change / 5),
        });
      }
    }

    prevScore = avgScore;
  });

  return moments.slice(0, 10); // Limit to 10 key moments
}

/**
 * Calculate category scores for detailed breakdown
 */
export function calculateCategoryScores(
  analyses: ResponseAnalysis[],
  _interviewType: string
): CategoryScores {
  if (analyses.length === 0) {
    return {
      communication: 0,
      technicalDepth: 0,
      behavioralExamples: 0,
      cultureFit: 0,
      problemSolving: 0,
      starUsage: 0,
      confidence: 0,
      relevance: 0,
    };
  }

  const count = analyses.length;

  // Base calculations
  const avgClarity = analyses.reduce((s, a) => s + (a.clarity_score || 0), 0) / count;
  const avgConfidence = analyses.reduce((s, a) => s + (a.confidence_score || 0), 0) / count;
  const avgDepth = analyses.reduce((s, a) => s + (a.depth_score || 0), 0) / count;
  const avgStar = analyses.reduce((s, a) => s + (a.star_score || 0), 0) / count;
  const avgRelevance = analyses.reduce((s, a) => s + (a.relevance_score || 0), 0) / count;

  // Derived scores
  const communication = Math.round((avgClarity + avgRelevance) / 2);
  const technicalDepth = Math.round(avgDepth);
  const behavioralExamples = Math.round(avgStar);
  const cultureFit = Math.round((avgConfidence + avgClarity) / 2);
  const problemSolving = Math.round((avgDepth + avgRelevance) / 2);

  return {
    communication,
    technicalDepth,
    behavioralExamples,
    cultureFit,
    problemSolving,
    starUsage: Math.round(avgStar),
    confidence: Math.round(avgConfidence),
    relevance: Math.round(avgRelevance),
  };
}

/**
 * Get score label and color
 */
export function getScoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Exceptional', color: '#22c55e' };
  if (score >= 80) return { label: 'Strong', color: '#84cc16' };
  if (score >= 70) return { label: 'Good', color: '#eab308' };
  if (score >= 60) return { label: 'Average', color: '#f97316' };
  if (score >= 50) return { label: 'Below Average', color: '#ef4444' };
  return { label: 'Needs Work', color: '#dc2626' };
}

/**
 * Calculate improvement between sessions
 */
export function calculateImprovement(
  currentScores: CalculatedScores,
  previousScores: CalculatedScores
): {
  overall: number;
  byCategory: Record<string, number>;
  trend: 'improving' | 'stable' | 'declining';
} {
  const overallChange = currentScores.overall - previousScores.overall;

  const byCategory = {
    clarity: currentScores.clarity - previousScores.clarity,
    confidence: currentScores.confidence - previousScores.confidence,
    technical: currentScores.technical - previousScores.technical,
    star: currentScores.star - previousScores.star,
    communication: currentScores.communication - previousScores.communication,
  };

  const trend = overallChange > 5 ? 'improving' : overallChange < -5 ? 'declining' : 'stable';

  return {
    overall: overallChange,
    byCategory,
    trend,
  };
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
