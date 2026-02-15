/**
 * UnderFireAI - Question Generator
 *
 * Generates interview questions based on type, role, and context.
 */

import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS, INTERVIEW_CONFIGS } from '@/lib/ai/config';
import type { InterviewType, CompanyStyle } from '@/types/database';

export interface QuestionGeneratorParams {
  interviewType: InterviewType;
  companyStyle?: CompanyStyle | null;
  roleTarget?: string | null;
  skills?: string[];
  experienceYears?: number;
  previousQuestions?: string[];
  difficulty?: number;
}

export interface GeneratedQuestion {
  question: string;
  category: string;
  expectedFormat: 'star' | 'technical' | 'open' | 'situational';
  followUpHints: string[];
  evaluationCriteria: string[];
}

const QUESTION_CATEGORIES: Record<InterviewType, string[]> = {
  behavioral: ['leadership', 'teamwork', 'conflict', 'failure', 'achievement', 'communication'],
  technical: ['system_design', 'coding', 'debugging', 'architecture', 'optimization', 'trade_offs'],
  case: ['market_sizing', 'profitability', 'market_entry', 'growth_strategy', 'operations'],
  hr: ['motivation', 'career_goals', 'culture_fit', 'work_style', 'expectations'],
  panel: ['leadership', 'cross_functional', 'stakeholder_management', 'decision_making'],
  phone_screen: ['background', 'interest', 'basic_technical', 'availability'],
};

export async function generateQuestions(
  params: QuestionGeneratorParams,
  count = 5
): Promise<GeneratedQuestion[]> {
  const {
    interviewType,
    companyStyle,
    roleTarget,
    skills = [],
    experienceYears,
    previousQuestions = [],
    difficulty = 5,
  } = params;

  const config = INTERVIEW_CONFIGS[interviewType];
  const categories = QUESTION_CATEGORIES[interviewType];

  const prompt = `Generate ${count} interview questions for a ${interviewType} interview.

Context:
- Interview Type: ${interviewType}
${companyStyle ? `- Company Style: ${companyStyle}` : ''}
${roleTarget ? `- Target Role: ${roleTarget}` : ''}
${skills.length > 0 ? `- Candidate Skills: ${skills.join(', ')}` : ''}
${experienceYears ? `- Experience: ${experienceYears} years` : ''}
- Difficulty Level: ${difficulty}/10
${config.starEmphasis ? '- STAR format responses expected' : ''}

${previousQuestions.length > 0 ? `\nAvoid these already-asked questions:\n${previousQuestions.map(q => `- ${q}`).join('\n')}` : ''}

Question categories to cover: ${categories.join(', ')}

Generate a JSON array with ${count} questions:
[
  {
    "question": "The interview question",
    "category": "category from list above",
    "expectedFormat": "star|technical|open|situational",
    "followUpHints": ["potential follow-up 1", "potential follow-up 2"],
    "evaluationCriteria": ["what to look for 1", "what to look for 2"]
  }
]

Make questions specific, challenging, and appropriate for the difficulty level.
Return ONLY valid JSON array.`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You generate interview questions. Return only valid JSON arrays.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
        temperature: 0.8,
      }
    );

    let content = completion.choices[0]?.message?.content || '[]';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed: unknown = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return getDefaultQuestions(interviewType, count);
    }

    return parsed.map((q: Record<string, unknown>) => ({
      question: typeof q.question === 'string' ? q.question : '',
      category: typeof q.category === 'string' ? q.category : 'general',
      expectedFormat: validateFormat(q.expectedFormat),
      followUpHints: Array.isArray(q.followUpHints)
        ? q.followUpHints.filter((h: unknown) => typeof h === 'string')
        : [],
      evaluationCriteria: Array.isArray(q.evaluationCriteria)
        ? q.evaluationCriteria.filter((c: unknown) => typeof c === 'string')
        : [],
    }));
  } catch (error) {
    console.error('Error generating questions:', error);
    return getDefaultQuestions(interviewType, count);
  }
}

export async function generateFollowUp(
  originalQuestion: string,
  candidateResponse: string,
  interviewType: InterviewType
): Promise<string> {
  const prompt = `Based on this interview exchange, generate a natural follow-up question.

Original Question: ${originalQuestion}

Candidate's Response: ${candidateResponse}

Interview Type: ${interviewType}

Generate ONE concise follow-up question that:
- Digs deeper into something they mentioned
- Clarifies any vague points
- Tests the depth of their knowledge/experience

Return ONLY the follow-up question, no additional text.`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You generate interview follow-up questions. Be concise.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.INTERVIEW,
        temperature: 0.7,
        max_tokens: 150,
      }
    );

    return completion.choices[0]?.message?.content?.trim() || 'Can you elaborate on that?';
  } catch (error) {
    console.error('Error generating follow-up:', error);
    return 'Can you tell me more about that?';
  }
}

export function generateOpeningQuestion(
  interviewType: InterviewType,
  _roleTarget?: string | null
): string {
  const openings: Record<InterviewType, string[]> = {
    behavioral: [
      'Tell me about yourself and what brings you here today.',
      'Walk me through your background and why you\'re interested in this role.',
      'I\'d love to hear about your career journey so far.',
    ],
    technical: [
      'Tell me about a technical project you\'re particularly proud of.',
      'Walk me through your technical background and areas of expertise.',
      'What\'s the most challenging technical problem you\'ve solved recently?',
    ],
    case: [
      'Before we dive into the case, tell me briefly about your background.',
      'Let\'s start with a quick overview of your relevant experience.',
    ],
    hr: [
      'Tell me a bit about yourself.',
      'What made you interested in this opportunity?',
      'Walk me through your background briefly.',
    ],
    panel: [
      'Let\'s start with introductions. Tell us about yourself.',
      'We\'d like to hear about your background and what brings you here.',
    ],
    phone_screen: [
      'Thanks for taking the time to chat. Tell me a bit about yourself.',
      'Let\'s start with a quick overview of your background.',
    ],
  };

  const options = openings[interviewType];
  return options[Math.floor(Math.random() * options.length)];
}

function validateFormat(format: unknown): 'star' | 'technical' | 'open' | 'situational' {
  const valid = ['star', 'technical', 'open', 'situational'];
  if (typeof format === 'string' && valid.includes(format)) {
    return format as 'star' | 'technical' | 'open' | 'situational';
  }
  return 'open';
}

function getDefaultQuestions(interviewType: InterviewType, count: number): GeneratedQuestion[] {
  const defaults: Record<InterviewType, GeneratedQuestion[]> = {
    behavioral: [
      {
        question: 'Tell me about a time you had to deal with a difficult team member.',
        category: 'conflict',
        expectedFormat: 'star',
        followUpHints: ['How did you approach them?', 'What was the outcome?'],
        evaluationCriteria: ['Empathy', 'Problem resolution', 'Communication'],
      },
      {
        question: 'Describe a project where you had to meet a tight deadline.',
        category: 'achievement',
        expectedFormat: 'star',
        followUpHints: ['How did you prioritize?', 'What would you do differently?'],
        evaluationCriteria: ['Time management', 'Prioritization', 'Results'],
      },
    ],
    technical: [
      {
        question: 'How would you design a URL shortening service?',
        category: 'system_design',
        expectedFormat: 'technical',
        followUpHints: ['How would you handle scale?', 'What about analytics?'],
        evaluationCriteria: ['Architecture', 'Scalability', 'Trade-offs'],
      },
    ],
    case: [
      {
        question: 'How would you estimate the market size for electric scooters in a major city?',
        category: 'market_sizing',
        expectedFormat: 'open',
        followUpHints: ['What assumptions are you making?', 'How would you validate?'],
        evaluationCriteria: ['Structure', 'Logic', 'Assumptions'],
      },
    ],
    hr: [
      {
        question: 'What motivates you in your work?',
        category: 'motivation',
        expectedFormat: 'open',
        followUpHints: ['Can you give an example?'],
        evaluationCriteria: ['Self-awareness', 'Authenticity'],
      },
    ],
    panel: [
      {
        question: 'Tell us about a time you influenced a decision without direct authority.',
        category: 'leadership',
        expectedFormat: 'star',
        followUpHints: ['How did you build consensus?'],
        evaluationCriteria: ['Influence', 'Communication', 'Results'],
      },
    ],
    phone_screen: [
      {
        question: 'What interests you about this role?',
        category: 'interest',
        expectedFormat: 'open',
        followUpHints: ['What specifically appeals to you?'],
        evaluationCriteria: ['Research', 'Enthusiasm', 'Fit'],
      },
    ],
  };

  const questions = defaults[interviewType] || defaults.behavioral;
  return questions.slice(0, count);
}
