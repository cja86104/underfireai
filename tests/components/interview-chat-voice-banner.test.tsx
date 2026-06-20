/**
 * Mobile regression tests for InterviewChat (the 2D chat layout that mobile
 * always renders — the 3D HUD composer is desktop-only via `showHud`).
 *
 * Problem 1 — interviewer voice:
 *   A large orange "Tap to enable interviewer voice" banner forced a manual tap
 *   before TTS would play. It has been removed; audio now unlocks silently on
 *   the user's first gesture. Test asserts the banner is no longer rendered.
 *
 * Problem 2 — dark-mode input visibility:
 *   The composer <textarea> carried conflicting `dark:text-slate-900` and
 *   `dark:text-slate-100` classes (plus a malformed `dark:text-slate-500`),
 *   so typed text rendered near-black on the dark background — invisible.
 *   Test asserts the textarea uses the light dark-mode text colour and not the
 *   near-black one.
 *
 *   Both tests FAIL on the pre-fix code and PASS after the fix.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// next/navigation router is read on mount.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Not needed for these assertions.
vi.mock('next/image', () => ({ default: () => null }));

// Isolate from the speech-recognition / Web Audio stack.
vi.mock('@/components/interview/voice-mode', () => ({ VoiceMode: () => null }));

// Force the 2D chat path (no WebGL/three.js under jsdom anyway).
vi.mock('@/lib/hud/feature-flags', () => ({ is3DHudEnabled: () => false }));
vi.mock('@/lib/hud/webgl', () => ({ isWebGLAvailable: () => false }));
vi.mock('@/components/hud/interview-hud', () => ({ InterviewHUD: () => null }));

import { InterviewChat } from '@/components/interview/interview-chat';

beforeAll(() => {
  // jsdom doesn't implement scrollIntoView; the chat scrolls to bottom on mount.
  Element.prototype.scrollIntoView = () => {};
  // Present as a mobile device so the 2D layout (mobile path) is rendered.
  Object.defineProperty(window.navigator, 'userAgent', {
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    configurable: true,
  });
  Object.defineProperty(window, 'innerWidth', { value: 390, configurable: true });
});

afterEach(() => cleanup());

function renderChat() {
  return render(
    <InterviewChat
      sessionId="test-session"
      sessionStatus="in_progress"
      interviewType="behavioral"
      targetRole="Software Engineer"
      targetCompany={null}
      companyStyle={null}
      interviewer={{
        id: 'interviewer-1',
        name: 'Alex',
        avatarUrl: null,
        backstory: null,
        personalityBase: null,
        currentMood: null,
        voiceConfig: null,
      }}
      interviewerPersonality={null}
      initialMessages={[
        {
          // One existing message so the chat does not auto-start the
          // interview (which would fire fetch('/api/...') with a relative
          // URL that jsdom cannot resolve). Candidate role avoids any
          // interviewer-message side effects.
          id: 'seed-candidate',
          session_id: 'test-session',
          role: 'candidate',
          content: 'Seed message so the chat does not fetch on mount.',
          audio_url: null,
          response_time_seconds: null,
          analysis: null,
          created_at: new Date().toISOString(),
        },
      ]}
      resumeContext={null}
      startedAt={new Date().toISOString()}
      voiceEnabled
    />,
  );
}

describe('InterviewChat (mobile)', () => {
  it('does not render the enable-voice banner', () => {
    renderChat();

    // Sanity: the in-progress chat composer mounted.
    expect(
      screen.getByPlaceholderText(/type your response/i),
    ).toBeInTheDocument();

    // The orange "Tap to enable interviewer voice" banner must be gone.
    expect(
      screen.queryByRole('button', { name: /enable interviewer voice/i }),
    ).toBeNull();
    expect(
      screen.queryByText(/tap to enable interviewer voice/i),
    ).toBeNull();
  });

  it('uses a visible dark-mode text colour for the composer input', () => {
    renderChat();
    const textarea = screen.getByPlaceholderText(/type your response/i);

    // Typed text must be light in dark mode...
    expect(textarea).toHaveClass('dark:text-slate-100');
    // ...and must NOT carry the near-black colour that hid it on the dark bg.
    expect(textarea).not.toHaveClass('dark:text-slate-900');
    // The muted dark colour applies to the placeholder, not the typed text.
    expect(textarea).toHaveClass('dark:placeholder:text-slate-500');
  });
});
