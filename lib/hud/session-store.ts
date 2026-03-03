/**
 * UnderFireAI — HUD Session Store (Zustand)
 *
 * Manages low-frequency HUD state: per-turn analysis results and rolling
 * session metrics. This store is updated once per candidate answer (~every
 * 30–90 seconds), NOT per animation frame.
 *
 * High-frequency audio data lives in AudioLevelContext (refs), not here.
 */

import { create } from 'zustand';
import {
  computeSessionMetrics,
  type HudTurnAnalysis,
  type HudSessionMetrics,
} from '@/types/hud';

// ─────────────────────────────────────────────────────────────────────────────
// State shape
// ─────────────────────────────────────────────────────────────────────────────

interface HudSessionState {
  /** All turns in insertion order — source of truth for history chart. */
  turns: HudTurnAnalysis[];

  /**
   * Derived from turns; recomputed on every addTurn call.
   * null only before the first answer is submitted.
   */
  sessionMetrics: HudSessionMetrics | null;

  /**
   * Appends a new turn and recomputes sessionMetrics.
   * Called from InterviewChat after the chat API returns a new analysis object.
   */
  addTurn: (turn: HudTurnAnalysis) => void;

  /**
   * Resets the store to its initial state.
   * Called when a new interview session starts or the page unmounts.
   */
  clearSession: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useHudSessionStore = create<HudSessionState>((set) => ({
  turns: [],
  sessionMetrics: null,

  addTurn: (turn: HudTurnAnalysis): void => {
    set((state) => {
      // Prevent duplicate turn IDs (e.g., from React StrictMode double-invoke).
      if (state.turns.some((t) => t.turnId === turn.turnId)) {
        return state;
      }

      const updatedTurns = [...state.turns, turn];
      return {
        turns: updatedTurns,
        sessionMetrics: computeSessionMetrics(updatedTurns),
      };
    });
  },

  clearSession: (): void => {
    set({ turns: [], sessionMetrics: null });
  },
}));

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// Defined outside the store to avoid re-creating function references on render.
// ─────────────────────────────────────────────────────────────────────────────

/** The most recently processed turn, or null if none yet. */
export function selectLatestTurn(state: HudSessionState): HudTurnAnalysis | null {
  return state.turns.length > 0 ? state.turns[state.turns.length - 1] : null;
}

/** Mood score (-1 to +1) derived from the rolling session average. */
export function selectMoodScore(state: HudSessionState): number {
  return state.sessionMetrics?.moodScore ?? 0;
}
