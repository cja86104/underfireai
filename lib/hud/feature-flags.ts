/**
 * UnderFireAI — HUD Feature Flags
 *
 * Controls whether the 3D interviewer HUD is active.
 * Set NEXT_PUBLIC_ENABLE_3D_HUD=true in your environment to enable.
 *
 * When false, the existing 2D InterviewChat layout is rendered unchanged.
 * This flag is read at runtime so it can be toggled on Vercel without a redeploy.
 */

/**
 * Returns true when the 3D HUD is enabled for the current environment.
 * Safe to call in both server and client components.
 */
export function is3DHudEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_3D_HUD === 'true';
}
