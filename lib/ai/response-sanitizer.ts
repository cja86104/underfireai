/**
 * UnderFireAI — Interviewer Response Sanitizer
 *
 * Strips stage directions, internal thoughts, markdown formatting, and any
 * non-spoken content from AI responses before they are saved to the database
 * or returned to the client.
 *
 * The system prompt explicitly forbids this output, but models occasionally
 * slip — particularly on the first turn or after long context windows.
 * This is a defense-in-depth pass, not the primary control.
 */

// ── Patterns that indicate non-spoken content ─────────────────────────────────

/**
 * Matches entire lines that are pure stage direction blocks:
 *   *(Leaning in with curiosity...)*
 *   *(Green flags: ...)  (Red flags: ...)*
 *   *(If they answer X, I'll ask Y...)*
 */
const STAGE_DIRECTION_LINE = /^\s*\*\(.*\)\*\s*$/;

/**
 * Matches labeled header lines borrowed from character roleplay prompts:
 *   **Opening Question:**
 *   **Follow-up Question:**
 *   **Closing Statement:**
 *   **Key Moment:**  etc.
 */
const HEADER_LABEL_LINE = /^\s*\*{1,2}[A-Z][^*\n]{0,60}:\*{0,2}\s*$/;

/**
 * Matches lines that are entirely italic stage direction paragraphs:
 *   *Leaning forward, watching for depth...*
 *   *Nodding slowly, considering the answer.*
 */
const ITALIC_STAGE_LINE = /^\s*\*[^*\n]+\*\s*$/;

/**
 * Matches inline parenthetical stage directions that appear mid-sentence.
 * Captures patterns like: *(leaning in)* or *(pauses)*
 * Only strips the parenthetical — leaves surrounding text intact.
 */
const INLINE_STAGE_DIRECTION = /\s*\*\([^)]{1,200}\)\*\s*/g;

/**
 * Matches decision-tree / internal-monologue lines:
 *   *(If they dive into technical specifics...)*
 *   *(If they gloss over it, I'll probe...)*
 * These are multi-line parenthetical blocks.
 */
const DECISION_TREE_BLOCK = /\*\([\s\S]*?\)\*/g;

/**
 * Strips bold markdown from text that should be plain speech:
 *   **some text** → some text
 * Only applied after stage directions are removed, to avoid mangling
 * content that has already been stripped.
 */
const BOLD_MARKDOWN = /\*{2}([^*\n]+)\*{2}/g;

// ── Main sanitizer ────────────────────────────────────────────────────────────

/**
 * Strip all non-spoken content from an interviewer AI response.
 * Returns clean plain text containing only what the interviewer says aloud.
 */
export function sanitizeInterviewerResponse(raw: string): string {
  if (!raw || raw.trim().length === 0) return raw;

  // Step 1: Remove multi-line parenthetical blocks first (they span lines)
  let cleaned = raw.replace(DECISION_TREE_BLOCK, '');

  // Step 2: Process line by line — remove full lines that are pure stage content
  const lines = cleaned.split('\n');
  const kept: string[] = [];

  for (const line of lines) {
    if (STAGE_DIRECTION_LINE.test(line)) continue;
    if (HEADER_LABEL_LINE.test(line)) continue;
    if (ITALIC_STAGE_LINE.test(line)) continue;
    kept.push(line);
  }

  cleaned = kept.join('\n');

  // Step 3: Remove inline stage direction fragments
  cleaned = cleaned.replace(INLINE_STAGE_DIRECTION, ' ');

  // Step 4: Strip bold markdown (leftover from label lines)
  cleaned = cleaned.replace(BOLD_MARKDOWN, '$1');

  // Step 5: Collapse 3+ consecutive blank lines to a single blank line
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Step 6: Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Returns true if the raw response appears to contain stage directions.
 * Useful for logging / monitoring how often the model slips.
 */
export function containsStageDirections(raw: string): boolean {
  if (DECISION_TREE_BLOCK.test(raw)) return true;
  // Reset lastIndex after global regex test
  DECISION_TREE_BLOCK.lastIndex = 0;

  const lines = raw.split('\n');
  return lines.some(
    (line) =>
      STAGE_DIRECTION_LINE.test(line) ||
      HEADER_LABEL_LINE.test(line) ||
      ITALIC_STAGE_LINE.test(line)
  );
}
