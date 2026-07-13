/**
 * UnderFireAI Panel Interview Orchestration
 * Handles multi-interviewer panel mode with coordinated LLM responses
 */

import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import {
  type PanelInterviewer,
  type PanelState,
  type PanelTurnResult,
  parsePanelTurnResult,
  createInitialPanelState,
} from '@/types/panel';
import type { InterviewMessage } from '@/types/database';

// ===========================================
// INPUT/OUTPUT TYPES
// ===========================================
export interface RunPanelTurnInput {
  sessionId: string;
  userAnswer: string;
  panel: PanelInterviewer[];
  previousPanelState?: PanelState | null;
  history: InterviewMessage[];
  targetRole?: string | null;
  targetCompany?: string | null;
  resumeContext?: string | null;
  isFirstTurn?: boolean;
}

// ===========================================
// PANEL SYSTEM PROMPT BUILDER
// ===========================================
// Exported (in addition to being used internally by runPanelTurn) so it can
// be unit-tested directly without mocking the LLM call — see
// tests/lib/ai/panel-system-prompt.test.ts.
export function buildPanelSystemPrompt(
  panel: PanelInterviewer[],
  targetRole: string | null,
  targetCompany: string | null,
): string {
  const panelRoster = panel.map((p, idx) => {
    const traits = p.traits;
    return `${idx + 1}. ${p.name} (${p.roleLabel ?? p.archetype})
   - ID: ${p.id}
   - Archetype: ${p.archetype}
   - Traits: directness=${traits.directness}, warmth=${traits.warmth}, skepticism=${traits.skepticism}, patience=${traits.patience}
   - ${p.isLead ? 'LEAD INTERVIEWER - opens and closes, moderates discussion' : 'Panel member'}`;
  }).join('\n');

  return `You are simulating a panel interview with ${panel.length} distinct interviewers. Each interviewer has their own personality, perspective, and evaluation criteria.

## Panel Roster
${panelRoster}

## Interview Context
- Position: ${targetRole ?? 'Software Engineer'}
${targetCompany ? `- Company: ${targetCompany}` : ''}
- Format: Panel interview with multiple interviewers taking turns

## Your Task
After the candidate answers, generate responses from 1-3 panel members (not all need to speak every turn). Each interviewer should:
1. Stay in character based on their archetype and traits
2. Build on or contrast with other panel members' questions
3. React authentically to the candidate's response quality

## Output Format
You MUST respond with a single JSON object matching this exact structure:

{
  "turns": [
    {
      "interviewerId": "<uuid from roster>",
      "speakerName": "<name> (<role>)",
      "text": "<what they say>",
      "tone": "neutral" | "skeptical" | "supportive" | "rapid" | "probing"
    }
  ],
  "panelState": {
    "impressions": {
      "<interviewerId>": {
        "conviction": <0-100>,
        "sentiment": <-1 to 1>,
        "label": "unconvinced" | "skeptical" | "neutral" | "warming_up" | "convinced" | "impressed"
      }
    },
    "summary": "<1 sentence overall panel sentiment>"
  },
  "analysis": {
    "clarityScore": <0-100>,
    "confidenceScore": <0-100>,
    "relevanceScore": <0-100>,
    "depthScore": <0-100>,
    "starScore": <0-100>,
    "notes": "<brief evaluation notes>"
  }
}

## Rules
- Output ONLY valid JSON, no prose or markdown
- interviewerId values MUST match IDs from the panel roster
- Include analysis of the candidate's response
- Update impressions based on response quality
- Lead interviewer should speak first on opening and closing turns
- Not all panel members need to speak every turn (1-3 is typical)
- Never coach the candidate. If they ask what they should say, ask a panelist to answer on their behalf, or ask for help rephrasing their response, the panelist should decline in character and redirect them back to answering in their own words — never supply model answers or a corrected version of what they said.`;
}

// ===========================================
// BUILD CONVERSATION CONTEXT
// ===========================================
function buildConversationContext(
  history: InterviewMessage[],
  previousPanelState: PanelState | null,
  panel: PanelInterviewer[],
): string {
  // Build name map for display
  const nameMap = new Map(panel.map(p => [p.id, `${p.name} (${p.roleLabel ?? p.archetype})`]));

  // Format recent history
  const historyText = history.slice(-10).map(msg => {
    if (msg.role === 'interviewer') {
      const msgInterviewerId = (msg as InterviewMessage & { interviewer_id?: string }).interviewer_id;
      const speakerName = msgInterviewerId
        ? nameMap.get(msgInterviewerId) ?? 'Interviewer'
        : 'Interviewer';
      return `${speakerName}: ${msg.content}`;
    }
    return `Candidate: ${msg.content}`;
  }).join('\n\n');

  // Include previous panel state if available
  let stateContext = '';
  if (previousPanelState) {
    const impressionSummary = Object.entries(previousPanelState.impressions)
      .map(([id, imp]) => {
        const name = nameMap.get(id) ?? id;
        return `- ${name}: ${imp.label} (conviction: ${imp.conviction})`;
      })
      .join('\n');

    stateContext = `\n## Current Panel Impressions\n${impressionSummary}\nSummary: ${previousPanelState.summary}\n`;
  }

  return `## Conversation History\n${historyText}\n${stateContext}`;
}

// ===========================================
// MAIN ORCHESTRATION FUNCTION
// ===========================================
export async function runPanelTurn(input: RunPanelTurnInput): Promise<PanelTurnResult> {
  const {
    panel,
    userAnswer,
    previousPanelState,
    history,
    targetRole,
    targetCompany,
    resumeContext,
    isFirstTurn = false,
  } = input;

  // Initialize panel state if first turn
  const currentPanelState = previousPanelState ?? createInitialPanelState(panel.map(p => p.id));

  // Build prompts
  const systemPrompt = buildPanelSystemPrompt(panel, targetRole ?? null, targetCompany ?? null);
  const conversationContext = buildConversationContext(history, currentPanelState, panel);

  // Build user message
  let userMessage = '';

  if (isFirstTurn) {
    userMessage = `This is the start of the panel interview. The lead interviewer should open with introductions and the first question.

${resumeContext ? `## Candidate Resume Context\n${resumeContext}\n` : ''}

Begin the panel interview.`;
  } else {
    userMessage = `${conversationContext}

## Candidate's Latest Response
${userAnswer}

Generate the panel's next turn. Remember to:
1. Have 1-3 interviewers respond (not all need to speak)
2. Update impressions based on the response quality
3. Include analysis of the candidate's answer
4. Stay in character for each interviewer`;
  }

  // Call LLM
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const completion = await createChatCompletion(messages, {
    model: AI_MODELS.INTERVIEW,
    ...MODEL_PARAMS.interview,
    temperature: 0.8,
  });

  const content = completion.choices[0]?.message?.content ?? '{}';

  // Parse and validate response
  try {
    const result = parsePanelTurnResult(content);

    // Validate interviewer IDs match panel
    const validIds = new Set(panel.map(p => p.id));
    for (const turn of result.turns) {
      if (!validIds.has(turn.interviewerId)) {
        console.warn(`Invalid interviewer ID in panel response: ${turn.interviewerId}`);
        // Assign to lead interviewer as fallback
        turn.interviewerId = panel.find(p => p.isLead)?.id ?? panel[0].id;
      }
    }

    return result;
  } catch (parseError) {
    console.error('Failed to parse panel turn result:', parseError instanceof Error ? parseError.message : 'unknown error');

    // Return fallback response
    const leadInterviewer = panel.find(p => p.isLead) ?? panel[0];
    return {
      turns: [{
        interviewerId: leadInterviewer.id,
        speakerName: `${leadInterviewer.name} (${leadInterviewer.roleLabel ?? leadInterviewer.archetype})`,
        text: isFirstTurn
          ? `Welcome! I'm ${leadInterviewer.name}, and I'll be leading today's panel interview. Let's start with a quick introduction - tell us about yourself and your background.`
          : "That's an interesting point. Could you elaborate a bit more on that?",
        tone: 'neutral',
      }],
      panelState: currentPanelState,
      analysis: {
        clarityScore: 50,
        confidenceScore: 50,
        relevanceScore: 50,
        depthScore: 50,
        notes: 'Fallback response due to parsing error',
      },
    };
  }
}

