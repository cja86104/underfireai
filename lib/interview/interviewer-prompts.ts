/**
 * UnderFireAI - Interviewer Prompts
 *
 * System prompts for AI interviewers based on personality and context.
 */

import type {
  PersonalityBase,
  CommunicationStyle,
  InterviewerMood,
  InterviewType,
  CompanyStyle,
} from '@/types/database';

export interface InterviewerPromptParams {
  interviewerName: string;
  interviewType: InterviewType;
  companyStyle?: CompanyStyle | null;
  roleTarget?: string | null;
  backstory?: string | null;
  personality?: PersonalityBase | null;
  communicationStyle?: CommunicationStyle | null;
  redFlags?: string[] | null;
  greenFlags?: string[] | null;
  petPeeves?: string[] | null;
  favoriteTopics?: string[] | null;
  resumeContext?: string | null;
  currentMood?: InterviewerMood | null;
}

/**
 * Generate the main system prompt for an interviewer
 */
export function generateSystemPrompt(params: InterviewerPromptParams): string {
  const {
    interviewerName,
    interviewType,
    companyStyle,
    roleTarget,
    backstory,
    personality,
    communicationStyle,
    redFlags,
    greenFlags,
    petPeeves,
    favoriteTopics,
    resumeContext,
    currentMood,
  } = params;

  let prompt = `You are ${interviewerName}, a professional interviewer conducting a ${interviewType} interview`;

  if (companyStyle) {
    prompt += ` at a ${companyStyle}-style company`;
  }

  if (roleTarget) {
    prompt += ` for a ${roleTarget} position`;
  }

  prompt += '.\n\n';

  // Hidden backstory
  if (backstory) {
    prompt += `## Your Background (hidden from candidate)\n${backstory}\n\n`;
  }

  // Personality traits
  if (personality) {
    prompt += generatePersonalitySection(personality);
  }

  // Communication style
  if (communicationStyle) {
    prompt += generateCommunicationSection(communicationStyle);
  }

  // Behavioral triggers
  if (redFlags && redFlags.length > 0) {
    prompt += `## Red Flags (what makes you skeptical)\n`;
    prompt += redFlags.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (greenFlags && greenFlags.length > 0) {
    prompt += `## Green Flags (what impresses you)\n`;
    prompt += greenFlags.map(f => `- ${f}`).join('\n') + '\n\n';
  }

  if (petPeeves && petPeeves.length > 0) {
    prompt += `## Pet Peeves (answers you dislike)\n`;
    prompt += petPeeves.map(p => `- ${p}`).join('\n') + '\n\n';
  }

  if (favoriteTopics && favoriteTopics.length > 0) {
    prompt += `## Favorite Topics (you like to dig into these)\n`;
    prompt += favoriteTopics.map(t => `- ${t}`).join('\n') + '\n\n';
  }

  // Current mood
  if (currentMood) {
    prompt += generateMoodSection(currentMood);
  }

  // Resume context
  if (resumeContext) {
    prompt += `## Candidate's Resume/Background\n${resumeContext}\n\n`;
  }

  // Instructions
  prompt += generateInstructionsSection(interviewType);

  return prompt;
}

function generatePersonalitySection(personality: PersonalityBase): string {
  let section = `## Your Personality Traits (0-100 scale)\n`;

  section += `- Directness: ${personality.directness} (${describeDirectness(personality.directness)})\n`;
  section += `- Depth Preference: ${personality.depth_preference} (${describeDepth(personality.depth_preference)})\n`;
  section += `- Warmth: ${personality.warmth} (${describeWarmth(personality.warmth)})\n`;
  section += `- Patience: ${personality.patience} (${describePatience(personality.patience)})\n`;
  section += `- Technical Focus: ${personality.technical_focus} (${describeTechnical(personality.technical_focus)})\n`;
  section += `- Skepticism: ${personality.skepticism} (${describeSkepticism(personality.skepticism)})\n\n`;

  return section;
}

function generateCommunicationSection(style: CommunicationStyle): string {
  let section = `## Communication Style\n`;

  section += `- Style: ${style.style}\n`;
  section += `- Formality: ${style.formality > 70 ? 'Very formal' : style.formality > 40 ? 'Professional' : 'Casual'}\n`;
  section += `- Verbosity: ${style.verbosity > 70 ? 'Detailed responses' : style.verbosity > 40 ? 'Moderate' : 'Brief and concise'}\n\n`;

  return section;
}

function generateMoodSection(mood: InterviewerMood): string {
  let section = `## Current Mood (hidden from candidate)\n`;

  section += `You are currently feeling: ${mood.current} (intensity: ${mood.intensity}/100)\n`;

  if (mood.triggers && mood.triggers.length > 0) {
    section += `Recent things that affected your mood: ${mood.triggers.join(', ')}\n`;
  }

  section += `Adjust your tone and follow-up style based on this mood.\n\n`;

  return section;
}

function generateInstructionsSection(interviewType: InterviewType): string {
  const baseInstructions = `## Instructions
1. Stay in character throughout the interview
2. Ask one question at a time
3. Follow up based on the candidate's responses
4. Your mood and tone should shift based on answer quality
5. If you see red flags, become more skeptical and probe deeper
6. If you see green flags, show appropriate appreciation but maintain professionalism
7. Never break character or reveal your hidden personality traits
8. Keep responses concise - you're an interviewer, not a lecturer
9. End the interview naturally after 5-10 questions or when appropriate`;

  const typeSpecific: Record<InterviewType, string> = {
    behavioral: '\n10. For behavioral questions, expect STAR-format answers (Situation, Task, Action, Result)\n11. Probe for specific examples and quantifiable results',
    technical: '\n10. Ask follow-up questions to test depth of knowledge\n11. Present hypothetical scenarios to test problem-solving',
    case: '\n10. Guide them through the case structure\n11. Test their analytical thinking and business acumen',
    hr: '\n10. Focus on culture fit and motivation\n11. Look for red flags in how they describe past experiences',
    panel: '\n10. Represent multiple perspectives in your questions\n11. Test cross-functional collaboration abilities',
    phone_screen: '\n10. Keep questions high-level but probe for specifics\n11. Assess basic qualifications and communication skills',
  };

  return baseInstructions + (typeSpecific[interviewType] || '') + '\n\nBegin with a brief introduction and your first question.';
}

// Personality description helpers
function describeDirectness(value: number): string {
  if (value > 70) return 'very direct and blunt';
  if (value > 40) return 'balanced';
  return 'diplomatic and gentle';
}

function describeDepth(value: number): string {
  if (value > 70) return 'loves deep dives';
  if (value > 40) return 'balanced depth';
  return 'prefers surface-level';
}

function describeWarmth(value: number): string {
  if (value > 70) return 'very friendly and supportive';
  if (value > 40) return 'professional';
  return 'cold and reserved';
}

function describePatience(value: number): string {
  if (value > 70) return 'gives time to think';
  if (value > 40) return 'moderate pace';
  return 'rapid-fire, quick follow-ups';
}

function describeTechnical(value: number): string {
  if (value > 70) return 'heavy technical emphasis';
  if (value > 40) return 'balanced';
  return 'soft skills focused';
}

function describeSkepticism(value: number): string {
  if (value > 70) return 'challenges everything, needs proof';
  if (value > 40) return 'reasonably trusting';
  return 'takes answers at face value';
}

/**
 * Generate an opening prompt for the interviewer
 */
export function generateOpeningPrompt(params: {
  interviewerName: string;
  interviewType: InterviewType;
  companyStyle?: CompanyStyle | null;
  roleTarget?: string | null;
  warmth: number;
}): string {
  const { interviewerName, interviewType, companyStyle, roleTarget, warmth } = params;

  const warmGreeting = warmth > 60;
  const formal = warmth < 40;

  let opening = warmGreeting
    ? `Hi there! Thanks so much for joining me today. I'm ${interviewerName}`
    : formal
    ? `Good day. I'm ${interviewerName}`
    : `Hello, I'm ${interviewerName}`;

  opening += `, and I'll be conducting your ${interviewType} interview`;

  if (roleTarget) {
    opening += ` for the ${roleTarget} position`;
  }

  if (companyStyle) {
    opening += ` here at our ${companyStyle} company`;
  }

  opening += '.';

  if (warmGreeting) {
    opening += " Let's have a good conversation today. Ready to get started?";
  } else if (formal) {
    opening += ' Shall we begin?';
  } else {
    opening += " Let's dive in.";
  }

  return opening;
}

/**
 * Generate a closing prompt for the interviewer
 */
export function generateClosingPrompt(params: {
  interviewerName: string;
  warmth: number;
  impressed: boolean;
}): string {
  const { warmth, impressed } = params;

  if (impressed && warmth > 60) {
    return "That wraps up our conversation. I really enjoyed speaking with you today - you gave some excellent answers. We'll be in touch soon about next steps. Do you have any questions for me?";
  } else if (impressed) {
    return "That concludes our interview. You've given some solid responses. We'll follow up with you regarding next steps. Any questions?";
  } else if (warmth > 60) {
    return "Thank you for your time today. We'll review your responses and be in touch. Feel free to ask any questions you might have about the role or company.";
  } else {
    return "That's all I have for you today. We'll be in touch. Any questions?";
  }
}
