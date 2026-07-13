import { describe, it, expect } from 'vitest';
import type { PanelInterviewer } from '@/types/panel';

// buildPanelSystemPrompt (lib/ai/interview/panel.ts) imports lib/ai/chat-client,
// which imports lib/ai/config, which throws at module-load time if
// NEXT_PUBLIC_APP_URL isn't set. Set it before the dynamic import below runs
// (a static value import would be hoisted ahead of this assignment — a
// type-only import like the one above is erased at compile time and is
// safe). Type-only imports never trigger runtime module evaluation.
process.env.NEXT_PUBLIC_APP_URL = 'https://test.underfireai.local';

const { buildPanelSystemPrompt } = await import('@/lib/ai/interview/panel');

/**
 * Companion to tests/lib/ai/generate-interview-system-prompt.test.ts: the
 * same audit finding (Section 2 Content safety — interviewer must not coach
 * the candidate) applies to panel mode, which builds its system prompt via
 * a separate function. Panel sessions can never have a coding challenge
 * attached (challenge_id is only set for interview_type === 'technical' in
 * app/api/interview/create/route.ts), so only the general anti-coaching
 * rule applies here, not the coding-specific one.
 */

const panel: PanelInterviewer[] = [
  {
    id: 'panelist-1',
    name: 'Jordan Lee',
    avatarUrl: null,
    roleLabel: 'Hiring Manager',
    archetype: 'skeptic',
    seatOrder: 0,
    isLead: true,
    traits: {
      directness: 60,
      depth_preference: 50,
      warmth: 50,
      patience: 50,
      technical_focus: 50,
      skepticism: 60,
    },
  },
];

describe('buildPanelSystemPrompt — anti-coaching guardrail', () => {
  it('forbids panelists from coaching the candidate', () => {
    const prompt = buildPanelSystemPrompt(panel, 'Software Engineer', null);

    expect(prompt).toMatch(/never coach the candidate/i);
  });
});
