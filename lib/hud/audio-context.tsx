'use client';

/**
 * UnderFireAI — AudioLevelContext
 *
 * Provides a shared, ref-based audio data bus between VoiceMode and the 3D
 * HUD scene. This context NEVER triggers React re-renders.
 *
 * Architecture:
 *   VoiceMode  → calls updateAudioLevel(data) each requestAnimationFrame tick
 *   HUD Canvas → reads audioDataRef.current inside useFrame() — no re-renders
 *
 * Why refs instead of state?
 *   Audio data updates at 60fps. Using React state for this would schedule
 *   60 re-renders per second across the entire component subtree — completely
 *   unacceptable for a live interview session. The ref approach means the 3D
 *   scene reads fresh data every frame with zero React overhead.
 */

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type MutableRefObject,
} from 'react';
import { AUDIO_LEVEL_DEFAULT, type AudioLevelData } from '@/types/hud';

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────

interface AudioLevelContextValue {
  /**
   * The live audio data ref. Read this inside useFrame() or rAF callbacks.
   * Never read this during React render — its value is not reactive.
   */
  audioDataRef: MutableRefObject<AudioLevelData>;

  /**
   * Called by VoiceMode each animation frame with the latest FFT snapshot.
   * Mutates audioDataRef.current in-place; causes no React re-renders.
   */
  updateAudioLevel: (data: AudioLevelData) => void;

  /**
   * Called when the microphone stream stops.
   * Resets the ref to silent/inactive defaults.
   */
  resetAudioLevel: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context + provider
// ─────────────────────────────────────────────────────────────────────────────

const AudioLevelContext = createContext<AudioLevelContextValue | null>(null);

interface AudioLevelProviderProps {
  children: ReactNode;
}

export function AudioLevelProvider({ children }: AudioLevelProviderProps): React.JSX.Element {
  // A single mutable ref shared across all consumers.
  // Object identity never changes — consumers always hold the same ref.
  const audioDataRef = useRef<AudioLevelData>({ ...AUDIO_LEVEL_DEFAULT });

  const updateAudioLevel = useCallback((data: AudioLevelData): void => {
    // Direct mutation — deliberately bypasses React's render cycle.
    audioDataRef.current = data;
  }, []);

  const resetAudioLevel = useCallback((): void => {
    audioDataRef.current = { ...AUDIO_LEVEL_DEFAULT };
  }, []);

  return (
    <AudioLevelContext.Provider value={{ audioDataRef, updateAudioLevel, resetAudioLevel }}>
      {children}
    </AudioLevelContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the stable ref to the live audio data.
 *
 * USE IN: useFrame() callbacks, requestAnimationFrame loops, Three.js
 *         material/uniform updates.
 *
 * DO NOT: read audioDataRef.current during React render or pass it as a prop
 *         to reactive children — it will not trigger updates.
 */
export function useAudioLevelRef(): MutableRefObject<AudioLevelData> {
  const ctx = useContext(AudioLevelContext);
  if (!ctx) {
    throw new Error('useAudioLevelRef must be used inside <AudioLevelProvider>');
  }
  return ctx.audioDataRef;
}

/**
 * Returns the write functions used by VoiceMode.
 * VoiceMode calls updateAudioLevel() inside its existing rAF loop.
 */
export function useAudioLevelWriter(): {
  updateAudioLevel: (data: AudioLevelData) => void;
  resetAudioLevel: () => void;
} {
  const ctx = useContext(AudioLevelContext);
  if (!ctx) {
    throw new Error('useAudioLevelWriter must be used inside <AudioLevelProvider>');
  }
  return { updateAudioLevel: ctx.updateAudioLevel, resetAudioLevel: ctx.resetAudioLevel };
}
