/**
 * UnderFireAI - AI Backstory Generator
 *
 * Generates unique interviewer backstories using AI
 * based on archetype traits and interview context.
 */

import { createChatCompletion } from './chat-client';
import { AI_MODELS, MODEL_PARAMS } from './config';
import type { InterviewerArchetype, ArchetypeDefinition } from '@/types/interviewer';

interface BackstoryParams {
  archetypeId: InterviewerArchetype;
  archetypeName: string;
  archetypeDescription: string;
  interviewType: string;
  companyStyle: string | null;
  roleTarget: string | null;
  interviewerName: string;
}

/**
 * Generate a unique backstory for an interviewer using AI.
 * Falls back to a generic backstory on error (never throws).
 */
export async function generateBackstory(params: BackstoryParams): Promise<string> {
  const {
    archetypeId,
    archetypeName,
    archetypeDescription,
    interviewType,
    companyStyle,
    roleTarget,
    interviewerName,
  } = params;

  const prompt = `Generate a 2-3 sentence backstory for an interviewer character in a mock interview app. The backstory should explain WHY this interviewer behaves the way they do.

Character details:
- Name: ${interviewerName}
- Archetype: ${archetypeName} — ${archetypeDescription}
- Interview type: ${interviewType}
${companyStyle ? `- Company style: ${companyStyle}` : ''}
${roleTarget ? `- Hiring for: ${roleTarget}` : ''}

Requirements:
- Write in second person ("You...")
- Make it feel like a real person with real experiences
- Explain what shaped their interviewing style
- Keep it to 2-3 sentences
- Do NOT include quotes or formatting, just plain text`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You write brief, compelling character backstories. Respond with only the backstory text, no additional commentary.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        temperature: 0.9,
        max_tokens: 256,
      }
    );

    const backstory = completion.choices[0]?.message?.content?.trim();
    if (backstory && backstory.length > 20) {
      return backstory;
    }

    return getGenericBackstory(archetypeId);
  } catch (error) {
    console.error('Error generating backstory:', error);
    return getGenericBackstory(archetypeId);
  }
}

function getGenericBackstory(archetypeId: InterviewerArchetype): string {
  const fallbacks: Record<InterviewerArchetype, string> = {
    skeptic: 'You were burned by a bad hire who talked a great game but couldn\'t deliver. Now you verify everything and trust data over words.',
    griller: 'You rose through the ranks by mastering every technical detail. You expect candidates to demonstrate the same depth of understanding.',
    friendly: 'You remember how nervous you were in your first big interview. You try to put candidates at ease while still asking the hard questions.',
    silent_judge: 'You prefer to observe and analyze rather than fill silence. The best candidates are comfortable with pauses and don\'t need constant validation.',
    rapid_fire: 'Time is money. In a fast-paced environment, you need people who can think on their feet and communicate concisely.',
    culture_fit: 'You\'ve seen brilliant jerks destroy team morale. Skills matter, but so does how you treat people and work with others.',
    technical_expert: 'You\'ve spent decades mastering your craft and can spot surface-level knowledge instantly. You want to find people who truly understand the fundamentals.',
    executive: 'You\'ve led organizations through growth and crisis. You care about big-picture thinking, strategic impact, and whether a candidate can lead.',
  };

  return fallbacks[archetypeId];
}
