/**
 * UnderFireAI — 3D HUD Type Definitions
 *
 * This file defines the data contracts used exclusively by the live 3D interviewer
 * HUD. It intentionally bridges (rather than replaces) the existing ResponseAnalysis
 * type from types/database.ts so the HUD can be adopted incrementally.
 *
 * Mapping:
 *   ResponseAnalysis (database / API) → HudTurnAnalysis (HUD display layer)
 *
 * The mapper function `responseAnalysisToHudTurn` lives here so it is always
 * co-located with the types it transforms.
 */

import type { ResponseAnalysis } from '@/types/database';

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO LEVEL DATA
// Passed via ref (never via React state) from VoiceMode → 3D scene per frame.
// ─────────────────────────────────────────────────────────────────────────────

export interface AudioLevelData {
  /** Root-mean-square volume, 0–1. Drives halo pulse intensity. */
  rms: number;
  /** Peak frequency bin value, 0–1. Drives particle burst. */
  peak: number;
  /**
   * 20 frequency bands normalized 0–1, matching VoiceMode's BAR_COUNT constant.
   * Index 0 = lowest frequency, index 19 = highest.
   */
  frequencies: readonly number[];
  /** True while the microphone stream is active and capturing data. */
  isActive: boolean;
}

export const AUDIO_LEVEL_DEFAULT: AudioLevelData = {
  rms: 0,
  peak: 0,
  frequencies: Array<number>(20).fill(0),
  isActive: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// METRIC SCORES
// Each metric carries its current value plus an optional trend vs. previous turn.
// ─────────────────────────────────────────────────────────────────────────────

export type MetricTrend = 'up' | 'down' | 'flat';

export interface HudMetricScore {
  /** Normalised score, 0–100. */
  value: number;
  /** Direction vs. the previous answer; undefined on the first turn. */
  trend?: MetricTrend;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAR BREAKDOWN
// Per-component text + quality score for the 4-segment STAR ring.
// The underlying analyzeResponse() currently returns only star_score (aggregate).
// Per-component fields are optional and will be populated once the backend
// evaluation prompt is extended in Phase 3.
// ─────────────────────────────────────────────────────────────────────────────

export interface HudStarPart {
  /** Short extracted text snippet from the candidate's answer. */
  text: string;
  /** Quality / presence score for this component, 0–100. */
  score: number;
}

export interface HudStarBreakdown {
  situation: HudStarPart;
  task: HudStarPart;
  action: HudStarPart;
  result: HudStarPart;
  /** Aggregate STAR score (matches existing star_score). */
  overallScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// PER-TURN ANALYSIS
// One record per candidate answer.  Populated by the chat API response.
// ─────────────────────────────────────────────────────────────────────────────

export interface HudTurnAnalysis {
  /** Matches the database message ID of the candidate's message. */
  turnId: string;
  /** 1-based turn number within the session. */
  turnIndex: number;

  // Core metric scores
  clarity: HudMetricScore;
  structure: HudMetricScore;
  impact: HudMetricScore;
  confidence: HudMetricScore;
  /** Only meaningful for technical interview types. */
  technicalDepth?: HudMetricScore;

  // Communication stats (displayed on side panels)
  answerDurationSeconds: number;
  wordCount: number;
  /** Words-per-minute, estimated from word count and response time. */
  speakingPaceWpm: number;

  // STAR ring data
  star: HudStarBreakdown;

  /** Weighted overall score for this turn, 0–100. */
  overallScore: number;

  /** ISO timestamp — used for chart x-axis ordering. */
  recordedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION METRICS
// Rolling averages + mood score across all turns in the session.
// ─────────────────────────────────────────────────────────────────────────────

export interface HudSessionAverages {
  clarity: number;
  structure: number;
  impact: number;
  confidence: number;
  technicalDepth?: number;
  overall: number;
}

export interface HudSessionMetrics {
  /** All turns in chronological order — drives the history line chart. */
  turns: HudTurnAnalysis[];
  averages: HudSessionAverages;
  /**
   * Interviewer satisfaction score, range -1 (unsatisfied) to +1 (very satisfied).
   * Computed as: (averageOverallScore - 50) / 50
   * • -1.0 → average score of 0
   * •  0.0 → average score of 50
   * • +1.0 → average score of 100
   */
  moodScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAPPER
// Converts the existing ResponseAnalysis (from the chat API / database) into
// a HudTurnAnalysis.  Called in InterviewChat after each answer is processed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines metric trend by comparing the new value to the previous turn's value.
 * Returns undefined when there is no previous turn to compare against.
 */
function deriveTrend(
  current: number,
  previous: number | undefined,
): MetricTrend | undefined {
  if (previous === undefined) return undefined;
  if (current > previous + 3) return 'up';
  if (current < previous - 3) return 'down';
  return 'flat';
}

/**
 * Builds a minimal STAR breakdown from an aggregate star_score.
 * All four components receive an equal share of the aggregate score until the
 * backend evaluation prompt is extended to return per-component data.
 */
function buildDefaultStarBreakdown(starScore: number): HudStarBreakdown {
  const componentScore = Math.round(starScore);
  return {
    situation: { text: '', score: componentScore },
    task: { text: '', score: componentScore },
    action: { text: '', score: componentScore },
    result: { text: '', score: componentScore },
    overallScore: starScore,
  };
}

/**
 * Computes a weighted overall score from a ResponseAnalysis record.
 * Weights reflect the relative importance of each dimension for interview coaching.
 */
function computeOverallScore(analysis: ResponseAnalysis): number {
  const { star_score, clarity_score, confidence_score, relevance_score, depth_score } = analysis;
  const weighted =
    star_score * 0.25 +
    clarity_score * 0.20 +
    confidence_score * 0.20 +
    relevance_score * 0.20 +
    depth_score * 0.15;
  return Math.round(Math.min(100, Math.max(0, weighted)));
}

/**
 * Converts a flat ResponseAnalysis (database shape) into a HudTurnAnalysis.
 *
 * @param analysis    The ResponseAnalysis returned by the chat API.
 * @param turnId      The database ID of the candidate's message.
 * @param turnIndex   1-based position of this turn in the session.
 * @param responseTimeSecs  How long the candidate took to respond (seconds).
 * @param previous    The HudTurnAnalysis from the preceding turn, for trend calculation.
 */
export function responseAnalysisToHudTurn(
  analysis: ResponseAnalysis,
  turnId: string,
  turnIndex: number,
  responseTimeSecs: number,
  previous?: HudTurnAnalysis,
): HudTurnAnalysis {
  const wpm =
    responseTimeSecs > 0
      ? Math.round((analysis.word_count / responseTimeSecs) * 60)
      : 0;

  // Map flat scores onto the HUD metric shape.
  // relevance_score is the closest proxy for "impact" until a dedicated field exists.
  // star_score drives structure since STAR adherence measures structural quality.
  const clarity: HudMetricScore = {
    value: analysis.clarity_score,
    trend: deriveTrend(analysis.clarity_score, previous?.clarity.value),
  };
  const structure: HudMetricScore = {
    value: analysis.star_score,
    trend: deriveTrend(analysis.star_score, previous?.structure.value),
  };
  const impact: HudMetricScore = {
    value: analysis.relevance_score,
    trend: deriveTrend(analysis.relevance_score, previous?.impact.value),
  };
  const confidence: HudMetricScore = {
    value: analysis.confidence_score,
    trend: deriveTrend(analysis.confidence_score, previous?.confidence.value),
  };
  const technicalDepth: HudMetricScore = {
    value: analysis.depth_score,
    trend: deriveTrend(analysis.depth_score, previous?.technicalDepth?.value),
  };

  return {
    turnId,
    turnIndex,
    clarity,
    structure,
    impact,
    confidence,
    technicalDepth,
    answerDurationSeconds: responseTimeSecs,
    wordCount: analysis.word_count,
    speakingPaceWpm: wpm,
    star: buildDefaultStarBreakdown(analysis.star_score),
    overallScore: computeOverallScore(analysis),
    recordedAt: new Date().toISOString(),
  };
}

/**
 * Recomputes HudSessionMetrics from the full turn history.
 * Called whenever a new turn is added to the session store.
 */
export function computeSessionMetrics(turns: HudTurnAnalysis[]): HudSessionMetrics {
  if (turns.length === 0) {
    return {
      turns: [],
      averages: {
        clarity: 0,
        structure: 0,
        impact: 0,
        confidence: 0,
        technicalDepth: 0,
        overall: 0,
      },
      moodScore: 0,
    };
  }

  const sum = turns.reduce(
    (acc, t) => ({
      clarity: acc.clarity + t.clarity.value,
      structure: acc.structure + t.structure.value,
      impact: acc.impact + t.impact.value,
      confidence: acc.confidence + t.confidence.value,
      technicalDepth: acc.technicalDepth + (t.technicalDepth?.value ?? 0),
      overall: acc.overall + t.overallScore,
    }),
    { clarity: 0, structure: 0, impact: 0, confidence: 0, technicalDepth: 0, overall: 0 },
  );

  const n = turns.length;
  const averages: HudSessionAverages = {
    clarity: Math.round(sum.clarity / n),
    structure: Math.round(sum.structure / n),
    impact: Math.round(sum.impact / n),
    confidence: Math.round(sum.confidence / n),
    technicalDepth: Math.round(sum.technicalDepth / n),
    overall: Math.round(sum.overall / n),
  };

  // moodScore: -1 at avg 0, 0 at avg 50, +1 at avg 100
  const moodScore = Math.min(1, Math.max(-1, (averages.overall - 50) / 50));

  return { turns, averages, moodScore };
}
