/**
 * UnderFireAI - Interviewer Response Sanitizer
 *
 * Strips stage directions, internal thoughts, markdown formatting, AI
 * self-identification ("As an AI..."), and any other non-spoken content
 * from interviewer responses before they are saved to the database or
 * returned to the client.
 *
 * The system prompt explicitly forbids this output, but models occasionally
 * slip - particularly on the first turn, after long context windows, or
 * when the candidate's question pushes the model toward safety-policy
 * recital ("As a language model, I cannot speculate about salary numbers...").
 * This is a defense-in-depth pass, not the primary control.
 */

// ----------------------------------------------------------------------------
// Patterns that indicate non-spoken content
// ----------------------------------------------------------------------------

// Matches entire lines that are pure stage direction blocks.
const STAGE_DIRECTION_LINE = /^\s*\*\(.*\)\*\s*$/;

// Matches labeled header lines borrowed from character roleplay prompts.
const HEADER_LABEL_LINE = /^\s*\*{1,2}[A-Z][^*\n]{0,60}:\*{0,2}\s*$/;

// Matches lines that are entirely italic stage direction paragraphs.
const ITALIC_STAGE_LINE = /^\s*\*[^*\n]+\*\s*$/;

// Inline parenthetical stage directions like *(leaning in)* or *(pauses)*.
const INLINE_STAGE_DIRECTION = /\s*\*\([^)]{1,200}\)\*\s*/g;

// Multi-line decision-tree / internal-monologue parenthetical blocks.
const DECISION_TREE_BLOCK = /\*\([\s\S]*?\)\*/g;

// Bold markdown wrapper: **text** -> text. Applied after labels so we do
// not re-introduce label text.
const BOLD_MARKDOWN = /\*{2}([^*\n]+)\*{2}/g;

// AI self-identification phrasing. Requires both a first-person leading
// construction ("as a/an", "I am", "I'm") and an identity noun referring to
// the speaker as an AI/model/assistant. "Tell me about an AI project" is
// not matched because it lacks the first-person framing.
const META_COMMENTARY_SENTENCE =
  /\b(?:as\s+an?\s+(?:ai|language\s+model|large\s+language\s+model|llm|artificial\s+intelligence|chatbot|assistant|virtual\s+assistant)|i(?:'m|\s+am)\s+(?:just\s+|only\s+|merely\s+)?an?\s+(?:ai|language\s+model|large\s+language\s+model|llm|artificial\s+intelligence|chatbot|assistant|virtual\s+assistant)|i(?:'m|\s+am)\s+not\s+(?:a\s+)?(?:real\s+|human\s+|actual\s+)?(?:person|human|interviewer))\b/i;

// Sentence boundary: sentence-terminator followed by whitespace and a capital
// letter or opening quote. Avoids splitting on "Dr." or "3.5".
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z"])/;

function splitSentences(paragraph: string): string[] {
  if (!paragraph) return [];
  const sentences = paragraph.split(SENTENCE_BOUNDARY);
  return sentences.length > 0 ? sentences : [paragraph];
}

// ----------------------------------------------------------------------------
// Main sanitizer
// ----------------------------------------------------------------------------

/**
 * Strip all non-spoken content from an interviewer AI response.
 * Returns clean plain text containing only what the interviewer says aloud.
 *
 * Step order matters: multi-line stage directions are removed first so the
 * per-line stage / header / italic checks operate on clean content; bold
 * markdown is stripped after labels so we do not re-introduce label text;
 * meta-commentary stripping happens last so it sees real sentences and
 * includes a fallback that preserves the original text if every sentence
 * was meta-commentary, so a model that leaked AI identity on the first turn
 * does not produce an empty interviewer message that breaks the
 * conversation flow.
 */
export function sanitizeInterviewerResponse(raw: string): string {
  if (!raw || raw.trim().length === 0) return raw;

  let cleaned = raw.replace(DECISION_TREE_BLOCK, '');

  const lines = cleaned.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    if (STAGE_DIRECTION_LINE.test(line)) continue;
    if (HEADER_LABEL_LINE.test(line)) continue;
    if (ITALIC_STAGE_LINE.test(line)) continue;
    kept.push(line);
  }
  cleaned = kept.join('\n');

  cleaned = cleaned.replace(INLINE_STAGE_DIRECTION, ' ');
  cleaned = cleaned.replace(BOLD_MARKDOWN, '$1');

  const preMetaCleaned = cleaned;
  const paragraphs = cleaned.split(/\n\n+/);
  const sanitizedParagraphs = paragraphs.map((paragraph) => {
    const sentences = splitSentences(paragraph);
    const keptSentences = sentences.filter((s) => !META_COMMENTARY_SENTENCE.test(s));
    return keptSentences.join(' ').trim();
  });
  cleaned = sanitizedParagraphs.filter((p) => p.length > 0).join('\n\n');

  if (cleaned.trim().length === 0 && preMetaCleaned.trim().length > 0) {
    cleaned = preMetaCleaned;
  }

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  return cleaned;
}

/**
 * Returns true if the raw response appears to contain stage directions.
 * Useful for logging / monitoring how often the model slips.
 */
export function containsStageDirections(raw: string): boolean {
  if (DECISION_TREE_BLOCK.test(raw)) {
    DECISION_TREE_BLOCK.lastIndex = 0;
    return true;
  }
  DECISION_TREE_BLOCK.lastIndex = 0;
  const lines = raw.split('\n');
  return lines.some(
    (line) =>
      STAGE_DIRECTION_LINE.test(line) ||
      HEADER_LABEL_LINE.test(line) ||
      ITALIC_STAGE_LINE.test(line)
  );
}

/**
 * Returns true if the raw response contains AI self-identification phrasing.
 * Monitoring hook for the chat route - sanitization happens regardless of
 * this signal, but a rising rate of true returns is the leading indicator
 * that the system prompt or model behavior has drifted.
 */
export function containsMetaCommentary(raw: string): boolean {
  if (!raw) return false;
  const paragraphs = raw.split(/\n\n+/);
  for (const paragraph of paragraphs) {
    const sentences = splitSentences(paragraph);
    for (const sentence of sentences) {
      if (META_COMMENTARY_SENTENCE.test(sentence)) return true;
    }
  }
  return false;
}
