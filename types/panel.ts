/**
 * UnderFireAI Panel Interview Types
 * Types for multi-interviewer panel mode
 */

import { z } from 'zod';
import type { PersonalityBase } from './database';

// ===========================================
// PANEL INTERVIEWER
// ===========================================
export interface PanelInterviewer {
  id: string;
  name: string;
  avatarUrl?: string | null;
  roleLabel?: string | null;        // "Eng Manager", "PM", etc.
  archetype: string;                // "skeptic", "griller", etc.
  seatOrder: number;                // 0,1,2,3 = position in UI
  isLead: boolean;                  // Primary interviewer
  traits: PersonalityBase;
}

// ===========================================
// PANEL STATE (persisted per session)
// ===========================================
export interface PanelImpression {
  conviction: number;     // 0-100: how convinced this interviewer is
  sentiment: number;      // -1 to 1: negative to positive
  label: string;          // "unconvinced", "warming_up", "impressed"
}

export interface PanelState {
  impressions: Record<string, PanelImpression>;  // keyed by interviewer ID
  summary: string;                                // overall panel sentiment
}

// ===========================================
// PANEL TURN TYPES
// ===========================================
export type PanelTone = 'neutral' | 'skeptical' | 'supportive' | 'rapid' | 'probing';

export interface PanelTurnInterviewerUtterance {
  interviewerId: string;
  speakerName: string;
  text: string;
  tone: PanelTone;
}

export interface PanelTurnAnalysis {
  clarityScore?: number;      // 0-100
  confidenceScore?: number;   // 0-100
  relevanceScore?: number;    // 0-100
  depthScore?: number;        // 0-100
  starScore?: number;         // 0-100
  notes?: string;
}

export interface PanelTurnResult {
  turns: PanelTurnInterviewerUtterance[];
  panelState: PanelState;
  analysis?: PanelTurnAnalysis;
}

// ===========================================
// ZOD SCHEMAS FOR LLM OUTPUT VALIDATION
// ===========================================
export const panelTurnInterviewerUtteranceSchema = z.object({
  interviewerId: z.string(),
  speakerName: z.string(),
  text: z.string(),
  tone: z.enum(['neutral', 'skeptical', 'supportive', 'rapid', 'probing']),
});

export const panelImpressionSchema = z.object({
  conviction: z.number().min(0).max(100),
  sentiment: z.number().min(-1).max(1),
  label: z.string(),
});

export const panelStateSchema = z.object({
  impressions: z.record(panelImpressionSchema),
  summary: z.string(),
});

export const panelTurnAnalysisSchema = z.object({
  clarityScore: z.number().min(0).max(100).optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
  relevanceScore: z.number().min(0).max(100).optional(),
  depthScore: z.number().min(0).max(100).optional(),
  starScore: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
}).strict();

export const panelTurnResultSchema = z.object({
  turns: z.array(panelTurnInterviewerUtteranceSchema),
  panelState: panelStateSchema,
  analysis: panelTurnAnalysisSchema.optional(),
}).strict();

// ===========================================
// PANEL ROLE PRESETS
// ===========================================
export const PANEL_ROLE_PRESETS = {
  engineering_loop: [
    { roleLabel: 'Hiring Manager', archetype: 'culture_fit' },
    { roleLabel: 'Tech Lead', archetype: 'griller' },
    { roleLabel: 'Senior Engineer', archetype: 'technical_expert' },
  ],
  cross_functional: [
    { roleLabel: 'Engineering Manager', archetype: 'skeptic' },
    { roleLabel: 'Product Manager', archetype: 'culture_fit' },
    { roleLabel: 'Designer', archetype: 'friendly' },
  ],
  exec_panel: [
    { roleLabel: 'VP Engineering', archetype: 'executive' },
    { roleLabel: 'CTO', archetype: 'skeptic' },
    { roleLabel: 'HR Director', archetype: 'culture_fit' },
  ],
  startup_founders: [
    { roleLabel: 'CEO', archetype: 'executive' },
    { roleLabel: 'CTO', archetype: 'griller' },
  ],
} as const;

export type PanelPreset = keyof typeof PANEL_ROLE_PRESETS;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Parse raw LLM JSON output into validated PanelTurnResult
 */
export function parsePanelTurnResult(jsonText: string): PanelTurnResult {
  // Strip markdown code fences if present
  const cleaned = jsonText
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '');

  const parsed = JSON.parse(cleaned);
  return panelTurnResultSchema.parse(parsed);
}

/**
 * Create initial panel state with neutral impressions
 */
export function createInitialPanelState(interviewerIds: string[]): PanelState {
  const impressions: Record<string, PanelImpression> = {};

  for (const id of interviewerIds) {
    impressions[id] = {
      conviction: 50,
      sentiment: 0,
      label: 'neutral',
    };
  }

  return {
    impressions,
    summary: 'The panel is beginning their evaluation.',
  };
}

/**
 * Get impression label from conviction score
 */
export function getImpressionLabel(conviction: number, sentiment: number): string {
  if (conviction >= 80 && sentiment > 0.5) return 'impressed';
  if (conviction >= 70 && sentiment > 0.2) return 'convinced';
  if (conviction >= 60 && sentiment > 0) return 'warming_up';
  if (conviction >= 40) return 'neutral';
  if (conviction >= 25) return 'skeptical';
  return 'unconvinced';
}
