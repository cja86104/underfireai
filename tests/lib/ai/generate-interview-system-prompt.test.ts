import { describe, it, expect } from 'vitest';

// generateInterviewSystemPrompt (lib/ai/chat-client.ts) imports lib/ai/config,
// which throws at module-load time if NEXT_PUBLIC_APP_URL isn't set. Set it
// before the dynamic import below runs (a static top-level import would be
// hoisted ahead of this assignment, so it must be a dynamic import).
process.env.NEXT_PUBLIC_APP_URL = 'https://test.underfireai.local';

const { generateInterviewSystemPrompt } = await import('@/lib/ai/chat-client');

/**
 * Tests for the anti-coaching / no-solving guardrails added to the live
 * interview system prompt (audit finding, underfireai-audit-checklist-v1.md
 * Section 2 Content safety:
 *   - "Interviewer prompts must NOT attempt to coach or help the candidate
 *     mid-interview... interviewer should stay in character."
 *   - "Coding interview AI output — verify no path where the AI is asked to
 *     write the solution for the candidate."
 *
 * Prior to this fix, generateInterviewSystemPrompt had no explicit
 * instruction forbidding the interviewer from coaching the candidate, and no
 * awareness at all of whether the session had a live coding challenge
 * attached, so nothing stopped the interviewer persona from writing the
 * candidate's solution for them if asked.
 */

const baseParams = {
  interviewerName: 'Alex Chen',
  interviewType: 'technical',
  companyStyle: null,
  targetCompany: null,
  roleTarget: 'Software Engineer',
  backstory: null,
  personality: null,
  communicationStyle: null,
  redFlags: null,
  greenFlags: null,
  petPeeves: null,
  favoriteTopics: null,
  resumeContext: null,
  hasResume: false,
};

describe('generateInterviewSystemPrompt — anti-coaching guardrails', () => {
  it('always forbids coaching the candidate, regardless of interview type', () => {
    const prompt = generateInterviewSystemPrompt({ ...baseParams });

    expect(prompt).toMatch(/never coach the candidate/i);
    expect(prompt).toMatch(/do not supply model answers/i);
  });

  it('does not include the coding-specific no-solving instruction when there is no coding challenge', () => {
    const prompt = generateInterviewSystemPrompt({ ...baseParams, hasCodingChallenge: false });

    expect(prompt).not.toMatch(/never write, dictate, complete, debug, or fix their code/i);
  });

  it('adds an explicit "never write the candidate\'s code" instruction when hasCodingChallenge is true', () => {
    const prompt = generateInterviewSystemPrompt({ ...baseParams, hasCodingChallenge: true });

    expect(prompt).toMatch(/never write, dictate, complete, debug, or fix their code/i);
    expect(prompt).toMatch(/the candidate must write and fix the solution themselves/i);
  });
});
