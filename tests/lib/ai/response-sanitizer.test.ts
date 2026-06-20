import { describe, it, expect } from 'vitest';
import {
  sanitizeInterviewerResponse,
  containsStageDirections,
  containsMetaCommentary,
} from '@/lib/ai/response-sanitizer';

/**
 * Tests for the interviewer-response sanitizer — defense-in-depth pass
 * that strips stage directions, AI self-identification, and markdown
 * artifacts before interviewer turns are persisted or shipped to the
 * client.
 *
 * The system prompt forbids these patterns, but models slip. These tests
 * lock down the guard so regressions surface immediately.
 */
describe('sanitizeInterviewerResponse', () => {
  it('returns clean prose unchanged', () => {
    const input = 'Tell me about a time you led a team through a hard decision.';
    expect(sanitizeInterviewerResponse(input)).toBe(input);
  });

  it('strips a standalone parenthetical stage direction line', () => {
    const input = '*(leans back, arms folded)*\nSo what brought you here today?';
    const output = sanitizeInterviewerResponse(input);
    expect(output).toBe('So what brought you here today?');
  });

  it('strips an inline parenthetical stage direction', () => {
    const input = 'I see. *(pauses)* And how did the team react?';
    const output = sanitizeInterviewerResponse(input);
    expect(output).not.toContain('*(pauses)*');
    expect(output).toContain('I see.');
    expect(output).toContain('And how did the team react?');
  });

  it('strips bold markdown wrappers but keeps the inner text', () => {
    const input = 'That **really** stands out to me.';
    expect(sanitizeInterviewerResponse(input)).toBe('That really stands out to me.');
  });

  it('strips a header-label line', () => {
    const input = '**FOLLOW-UP QUESTION:**\nWhat would you do differently?';
    const output = sanitizeInterviewerResponse(input);
    expect(output).toBe('What would you do differently?');
  });

  it('strips a multi-line decision-tree parenthetical block', () => {
    const input = [
      '*(internal: if candidate hedges, push for concrete numbers;',
      'if they over-claim, probe for evidence)*',
      'Can you walk me through the metrics you owned?',
    ].join('\n');
    const output = sanitizeInterviewerResponse(input);
    expect(output).toBe('Can you walk me through the metrics you owned?');
  });

  it('strips a sentence containing AI self-identification', () => {
    const input =
      "As an AI language model, I cannot speculate about salary numbers. " +
      "But let's focus on your behavioral fit.";
    const output = sanitizeInterviewerResponse(input);
    expect(output).not.toMatch(/as an ai/i);
    expect(output).toContain("let's focus on your behavioral fit");
  });

  it("strips a sentence containing \"I'm an AI\"", () => {
    const input = "I'm an AI assistant. What is your greatest weakness?";
    const output = sanitizeInterviewerResponse(input);
    expect(output).not.toMatch(/i'm an ai/i);
    expect(output).toBe('What is your greatest weakness?');
  });

  it('preserves the original text if every sentence would be meta-commentary (fallback)', () => {
    // If we stripped everything we would ship an empty interviewer message
    // and break the conversation. The sanitizer documents this fallback.
    const input = "As an AI, I cannot answer that. I'm just a language model.";
    const output = sanitizeInterviewerResponse(input);
    expect(output.length).toBeGreaterThan(0);
  });

  it('returns the input unchanged for an empty string', () => {
    expect(sanitizeInterviewerResponse('')).toBe('');
  });

  it('returns the input unchanged for a whitespace-only string', () => {
    expect(sanitizeInterviewerResponse('   \n  \t  ')).toBe('   \n  \t  ');
  });

  it('collapses three-or-more consecutive newlines down to a paragraph break', () => {
    const input = 'First paragraph.\n\n\n\nSecond paragraph.';
    expect(sanitizeInterviewerResponse(input)).toBe(
      'First paragraph.\n\nSecond paragraph.'
    );
  });
});

describe('containsStageDirections', () => {
  it('returns true when a stage-direction line is present', () => {
    expect(containsStageDirections('*(taps pen)*\nNext question.')).toBe(true);
  });

  it('returns true when a multi-line internal-monologue block is present', () => {
    const input = '*(thinking:\n  follow up on metrics)*\nNext question.';
    expect(containsStageDirections(input)).toBe(true);
  });

  it('returns false for clean spoken prose', () => {
    expect(containsStageDirections('What did you learn from that?')).toBe(false);
  });

  it("is stateless across calls (the DECISION_TREE_BLOCK regex lastIndex is reset)", () => {
    const dirty = '*(thinking)*\nGo on.';
    // Two consecutive calls must return the same result; the regex /g flag
    // could otherwise leak lastIndex state.
    expect(containsStageDirections(dirty)).toBe(true);
    expect(containsStageDirections(dirty)).toBe(true);
  });
});

describe('containsMetaCommentary', () => {
  it('returns true for "As an AI ..."', () => {
    expect(containsMetaCommentary('As an AI, I cannot help with that.')).toBe(true);
  });

  it('returns true for "I am a large language model"', () => {
    expect(containsMetaCommentary('I am a large language model.')).toBe(true);
  });

  it("returns true for \"I'm not a real person\"", () => {
    expect(containsMetaCommentary("I'm not a real person.")).toBe(true);
  });

  it('returns FALSE for an innocuous mention of "an AI project"', () => {
    // The regex requires first-person framing ("as a/an" + identity noun
    // referring to the speaker). "Tell me about an AI project" is a
    // question about the candidate's work, NOT a self-identification leak.
    expect(
      containsMetaCommentary('Tell me about an AI project you worked on.')
    ).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(containsMetaCommentary('')).toBe(false);
  });
});
