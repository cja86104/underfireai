/**
 * Per-response simulation notice returned by the negotiation endpoints.
 *
 * The negotiation feature plays an AI recruiter inside a practice exercise;
 * without an explicit notice the candidate could (a) misread an in-character
 * recruiter "offer" as financial guidance or (b) misread an AI hedge as
 * legal advice. Both negotiation endpoints (`/api/negotiate/[sessionId]/chat`
 * and `/api/negotiate/[sessionId]/end`) return this string on the success
 * payload so the client can surface it persistently.
 *
 * The string is intentionally extracted to a shared module: keeping a single
 * source-of-truth prevents the two route copies from drifting (and the
 * weaker copy being the one the user actually sees). The recruiter's
 * SYSTEM prompt independently bars the AI from generating any legal / tax /
 * financial advice — this constant is the user-facing tripwire on top of
 * that primary control.
 */
export const SIMULATION_DISCLAIMER =
  'Practice negotiation only. The recruiter is an AI simulation and its responses do not constitute legal, tax, or financial advice for any real offer. Consult a qualified professional before making real compensation decisions.';
