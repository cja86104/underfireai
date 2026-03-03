/**
 * UnderFireAI — WebGL Detection
 *
 * Detects WebGL 1 and WebGL 2 support at runtime.
 * Called once before mounting the 3D Canvas so we never load Three.js
 * on devices that cannot render it.
 *
 * Safe to call server-side (returns false when window is undefined).
 */

export type WebGLSupport = 'webgl2' | 'webgl1' | 'none';

/**
 * Returns the highest WebGL version supported by the current browser,
 * or 'none' if WebGL is unavailable (e.g. SSR, old browser, disabled GPU).
 */
export function detectWebGL(): WebGLSupport {
  if (typeof window === 'undefined') return 'none';

  try {
    const canvas = document.createElement('canvas');

    // Try WebGL 2 first
    const ctx2 = canvas.getContext('webgl2');
    if (ctx2) {
      // Immediately lose the context so we don't hold GPU resources
      const ext = ctx2.getExtension('WEBGL_lose_context');
      ext?.loseContext();
      return 'webgl2';
    }

    // Fall back to WebGL 1
    const ctx1 =
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    if (ctx1) {
      const ext = (ctx1 as WebGLRenderingContext).getExtension('WEBGL_lose_context');
      ext?.loseContext();
      return 'webgl1';
    }
  } catch {
    // Canvas creation can throw in sandboxed environments
  }

  return 'none';
}

/** Returns true when any WebGL version is available. */
export function isWebGLAvailable(): boolean {
  return detectWebGL() !== 'none';
}
