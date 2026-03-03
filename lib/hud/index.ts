/**
 * UnderFireAI — HUD Library
 * Public API for the 3D interviewer HUD feature.
 */

export { AudioLevelProvider, useAudioLevelRef, useAudioLevelWriter } from './audio-context';
export { useHudSessionStore, selectLatestTurn, selectMoodScore } from './session-store';
export { is3DHudEnabled } from './feature-flags';
export { detectWebGL, isWebGLAvailable, type WebGLSupport } from './webgl';
