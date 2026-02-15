/**
 * UnderFireAI - Mood Engine
 *
 * Detects mood triggers from candidate response analysis
 * and calculates mood updates for the interviewer.
 */

import type { MoodTrigger } from '@/types/interviewer';
import type { InterviewerMood } from '@/types/database';

interface ResponseAnalysis {
  star_score: number;
  clarity_score: number;
  confidence_score: number;
  relevance_score: number;
  depth_score: number;
  word_count: number;
  filler_words: string[];
  key_points: string[];
}

interface DetectTriggersParams {
  analysis: ResponseAnalysis;
  redFlags: string[];
  greenFlags: string[];
  petPeeves: string[];
  favoriteTopics: string[];
  candidateMessage: string;
}

interface TriggerResult {
  trigger: MoodTrigger;
  description: string;
  delta: number;
}

const TRIGGER_DELTAS: Record<MoodTrigger, number> = {
  strong_answer: 12,
  weak_answer: -12,
  specific_example: 10,
  vague_response: -10,
  star_format_used: 8,
  star_format_missing: -8,
  red_flag_triggered: -15,
  green_flag_triggered: 15,
  pet_peeve_triggered: -12,
  favorite_topic_discussed: 10,
  follow_up_answered_well: 10,
  follow_up_dodged: -10,
  honesty_detected: 8,
  deflection_detected: -12,
};

/**
 * Detect mood triggers from a candidate's response analysis.
 */
export function detectMoodTriggers(params: DetectTriggersParams): TriggerResult[] {
  const { analysis, redFlags, greenFlags, petPeeves: _petPeeves, favoriteTopics, candidateMessage } = params;
  const triggers: TriggerResult[] = [];
  const messageLower = candidateMessage.toLowerCase();
  const keyPointsLower = analysis.key_points.map((kp) => kp.toLowerCase());

  // STAR format
  if (analysis.star_score >= 70) {
    triggers.push({
      trigger: 'star_format_used',
      description: 'Used STAR format effectively',
      delta: TRIGGER_DELTAS.star_format_used,
    });
  } else if (analysis.star_score < 30) {
    triggers.push({
      trigger: 'star_format_missing',
      description: 'Missing STAR format structure',
      delta: TRIGGER_DELTAS.star_format_missing,
    });
  }

  // Depth
  if (analysis.depth_score >= 75) {
    triggers.push({
      trigger: 'strong_answer',
      description: 'Provided a strong, detailed answer',
      delta: TRIGGER_DELTAS.strong_answer,
    });
  } else if (analysis.depth_score < 30) {
    triggers.push({
      trigger: 'weak_answer',
      description: 'Answer lacked depth',
      delta: TRIGGER_DELTAS.weak_answer,
    });
  }

  // Clarity / specificity
  if (analysis.clarity_score >= 75) {
    triggers.push({
      trigger: 'specific_example',
      description: 'Clear and specific response',
      delta: TRIGGER_DELTAS.specific_example,
    });
  } else if (analysis.clarity_score < 30) {
    triggers.push({
      trigger: 'vague_response',
      description: 'Response was vague or unclear',
      delta: TRIGGER_DELTAS.vague_response,
    });
  }

  // Relevance / deflection
  if (analysis.relevance_score < 30) {
    triggers.push({
      trigger: 'deflection_detected',
      description: 'Candidate may have deflected the question',
      delta: TRIGGER_DELTAS.deflection_detected,
    });
  }

  // Red flags check
  for (const flag of redFlags) {
    const flagLower = flag.toLowerCase();
    if (keyPointsLower.some((kp) => kp.includes(flagLower) || flagLower.includes(kp))) {
      triggers.push({
        trigger: 'red_flag_triggered',
        description: `Red flag: ${flag}`,
        delta: TRIGGER_DELTAS.red_flag_triggered,
      });
      break; // Only count once per response
    }
  }

  // Green flags check
  for (const flag of greenFlags) {
    const flagLower = flag.toLowerCase();
    if (keyPointsLower.some((kp) => kp.includes(flagLower) || flagLower.includes(kp))) {
      triggers.push({
        trigger: 'green_flag_triggered',
        description: `Green flag: ${flag}`,
        delta: TRIGGER_DELTAS.green_flag_triggered,
      });
      break;
    }
  }

  // Favorite topics check
  for (const topic of favoriteTopics) {
    const topicLower = topic.toLowerCase();
    if (messageLower.includes(topicLower)) {
      triggers.push({
        trigger: 'favorite_topic_discussed',
        description: `Discussed favorite topic: ${topic}`,
        delta: TRIGGER_DELTAS.favorite_topic_discussed,
      });
      break;
    }
  }

  return triggers;
}

/**
 * Calculate an updated mood given the current mood and detected triggers.
 */
export function calculateMoodUpdate(
  currentMood: InterviewerMood,
  triggers: TriggerResult[]
): InterviewerMood {
  if (triggers.length === 0) {
    return currentMood;
  }

  // Sum deltas
  const totalDelta = triggers.reduce((sum, t) => sum + t.delta, 0);

  // Apply to intensity, clamped 0-100
  const newIntensity = Math.min(100, Math.max(0, currentMood.intensity + totalDelta));

  // Map intensity to mood label
  let newMoodLabel: InterviewerMood['current'];
  if (newIntensity < 20) {
    newMoodLabel = 'critical';
  } else if (newIntensity < 40) {
    newMoodLabel = 'skeptical';
  } else if (newIntensity < 60) {
    newMoodLabel = 'neutral';
  } else if (newIntensity < 80) {
    newMoodLabel = 'engaged';
  } else {
    newMoodLabel = 'impressed';
  }

  // Keep last 5 trigger descriptions
  const triggerDescriptions = triggers.map((t) => t.description);
  const updatedTriggers = [...triggerDescriptions, ...currentMood.triggers].slice(0, 5);

  return {
    current: newMoodLabel,
    intensity: newIntensity,
    triggers: updatedTriggers,
  };
}
