/**
 * UnderFireAI Interviewer Types
 * Types for interviewer generation, archetypes, and personality system
 */

import type { 
  InterviewType, 
  CompanyStyle, 
  PersonalityBase,
  CommunicationStyle,
  QuestionPatterns,
  VoiceConfig 
} from './database';

// ============================================
// INTERVIEWER ARCHETYPES
// ============================================
export type InterviewerArchetype =
  | 'skeptic'
  | 'griller'
  | 'friendly'
  | 'silent_judge'
  | 'rapid_fire'
  | 'culture_fit'
  | 'technical_expert'
  | 'executive';

export interface ArchetypeDefinition {
  id: InterviewerArchetype;
  name: string;
  description: string;
  basePersonality: PersonalityBase;
  communicationStyle: CommunicationStyle;
  questionPatterns: QuestionPatterns;
  defaultRedFlags: string[];
  defaultGreenFlags: string[];
  defaultPetPeeves: string[];
  favoriteTopics: string[];
  suggestedVoices: string[];
  difficultyModifier: number; // -2 to +2
}

export const INTERVIEWER_ARCHETYPES: Record<InterviewerArchetype, ArchetypeDefinition> = {
  skeptic: {
    id: 'skeptic',
    name: 'The Skeptic',
    description: 'Doubts everything, wants proof. Will challenge every claim.',
    basePersonality: {
      directness: 75,
      depth_preference: 80,
      warmth: 30,
      patience: 50,
      technical_focus: 60,
      skepticism: 90,
    },
    communicationStyle: {
      style: 'probing',
      formality: 70,
      verbosity: 40,
    },
    questionPatterns: {
      follow_up_tendency: 85,
      depth_preference: 80,
      curveball_frequency: 40,
    },
    defaultRedFlags: ['vague answers', 'no metrics', 'unverifiable claims', 'buzzwords without substance'],
    defaultGreenFlags: ['specific data', 'concrete examples', 'honest limitations', 'measurable outcomes'],
    defaultPetPeeves: ['hand-waving', 'saying "we" when meaning "I"', 'avoiding direct answers'],
    favoriteTopics: ['metrics', 'failures', 'specific technical decisions'],
    suggestedVoices: ['leo', 'kiefer'],
    difficultyModifier: 1,
  },
  griller: {
    id: 'griller',
    name: 'The Griller',
    description: 'Deep technical dives. Will go 5 levels deep on any topic.',
    basePersonality: {
      directness: 80,
      depth_preference: 95,
      warmth: 40,
      patience: 60,
      technical_focus: 95,
      skepticism: 70,
    },
    communicationStyle: {
      style: 'direct',
      formality: 60,
      verbosity: 50,
    },
    questionPatterns: {
      follow_up_tendency: 95,
      depth_preference: 95,
      curveball_frequency: 30,
    },
    defaultRedFlags: ['surface-level knowledge', 'unable to go deeper', 'memorized answers'],
    defaultGreenFlags: ['deep understanding', 'admits gaps', 'thinks through problems aloud'],
    defaultPetPeeves: ['pretending to know', 'changing subjects', 'vague technical explanations'],
    favoriteTopics: ['architecture decisions', 'tradeoffs', 'debugging approaches', 'system design'],
    suggestedVoices: ['kiefer', 'leo'],
    difficultyModifier: 2,
  },
  friendly: {
    id: 'friendly',
    name: 'The Friendly',
    description: 'Warm and supportive, then surprises with hard questions.',
    basePersonality: {
      directness: 40,
      depth_preference: 60,
      warmth: 90,
      patience: 80,
      technical_focus: 50,
      skepticism: 40,
    },
    communicationStyle: {
      style: 'supportive',
      formality: 30,
      verbosity: 60,
    },
    questionPatterns: {
      follow_up_tendency: 60,
      depth_preference: 60,
      curveball_frequency: 50,
    },
    defaultRedFlags: ['arrogance', 'dismissiveness', 'lack of self-awareness'],
    defaultGreenFlags: ['humility', 'authenticity', 'team focus', 'growth mindset'],
    defaultPetPeeves: ['talking down to others', 'taking all credit', 'being defensive'],
    favoriteTopics: ['collaboration', 'learning experiences', 'helping teammates'],
    suggestedVoices: ['maya', 'tessa'],
    difficultyModifier: -1,
  },
  silent_judge: {
    id: 'silent_judge',
    name: 'The Silent Judge',
    description: 'Minimal feedback, poker face. You won\'t know how you\'re doing.',
    basePersonality: {
      directness: 90,
      depth_preference: 70,
      warmth: 20,
      patience: 70,
      technical_focus: 60,
      skepticism: 60,
    },
    communicationStyle: {
      style: 'direct',
      formality: 80,
      verbosity: 20,
    },
    questionPatterns: {
      follow_up_tendency: 40,
      depth_preference: 70,
      curveball_frequency: 50,
    },
    defaultRedFlags: ['need for validation', 'excessive filler', 'rambling'],
    defaultGreenFlags: ['confidence', 'structured answers', 'self-sufficient thinking'],
    defaultPetPeeves: ['asking "does that make sense?"', 'fishing for approval', 'over-explaining'],
    favoriteTopics: ['decision making', 'independent judgment', 'handling ambiguity'],
    suggestedVoices: ['katie', 'kiefer'],
    difficultyModifier: 1,
  },
  rapid_fire: {
    id: 'rapid_fire',
    name: 'The Rapid Fire',
    description: 'Fast-paced, time pressure. Quick follow-ups, may interrupt.',
    basePersonality: {
      directness: 85,
      depth_preference: 50,
      warmth: 50,
      patience: 20,
      technical_focus: 70,
      skepticism: 50,
    },
    communicationStyle: {
      style: 'direct',
      formality: 50,
      verbosity: 30,
    },
    questionPatterns: {
      follow_up_tendency: 70,
      depth_preference: 50,
      curveball_frequency: 70,
    },
    defaultRedFlags: ['long-winded answers', 'slow thinking', 'inability to prioritize'],
    defaultGreenFlags: ['concise answers', 'quick thinking', 'structured responses'],
    defaultPetPeeves: ['unnecessary context', 'thinking out loud too much', 'repetition'],
    favoriteTopics: ['quick decisions', 'prioritization', 'time-sensitive situations'],
    suggestedVoices: ['kyle', 'kiefer'],
    difficultyModifier: 1,
  },
  culture_fit: {
    id: 'culture_fit',
    name: 'The Culture Fit',
    description: 'Values-focused, team dynamics. Cares about how you work with others.',
    basePersonality: {
      directness: 50,
      depth_preference: 60,
      warmth: 70,
      patience: 70,
      technical_focus: 30,
      skepticism: 50,
    },
    communicationStyle: {
      style: 'supportive',
      formality: 40,
      verbosity: 60,
    },
    questionPatterns: {
      follow_up_tendency: 70,
      depth_preference: 60,
      curveball_frequency: 40,
    },
    defaultRedFlags: ['blame-shifting', 'lone wolf mentality', 'negativity about past teams'],
    defaultGreenFlags: ['collaboration stories', 'giving credit', 'conflict resolution'],
    defaultPetPeeves: ['badmouthing colleagues', 'inability to compromise', 'ego-driven decisions'],
    favoriteTopics: ['team disagreements', 'collaboration', 'feedback', 'company values'],
    suggestedVoices: ['tessa', 'maya'],
    difficultyModifier: 0,
  },
  technical_expert: {
    id: 'technical_expert',
    name: 'The Technical Expert',
    description: 'Deep domain expert. Will test the limits of your knowledge.',
    basePersonality: {
      directness: 70,
      depth_preference: 90,
      warmth: 50,
      patience: 60,
      technical_focus: 100,
      skepticism: 60,
    },
    communicationStyle: {
      style: 'probing',
      formality: 50,
      verbosity: 50,
    },
    questionPatterns: {
      follow_up_tendency: 80,
      depth_preference: 90,
      curveball_frequency: 40,
    },
    defaultRedFlags: ['incorrect technical details', 'overconfidence without depth', 'outdated knowledge'],
    defaultGreenFlags: ['nuanced understanding', 'awareness of tradeoffs', 'current best practices'],
    defaultPetPeeves: ['buzzword soup', 'claiming expertise without depth', 'ignoring edge cases'],
    favoriteTopics: ['architecture', 'algorithms', 'system design', 'performance optimization'],
    suggestedVoices: ['kiefer', 'leo'],
    difficultyModifier: 2,
  },
  executive: {
    id: 'executive',
    name: 'The Executive',
    description: 'Big picture thinker. Cares about impact, strategy, and leadership.',
    basePersonality: {
      directness: 80,
      depth_preference: 60,
      warmth: 50,
      patience: 50,
      technical_focus: 40,
      skepticism: 60,
    },
    communicationStyle: {
      style: 'direct',
      formality: 80,
      verbosity: 40,
    },
    questionPatterns: {
      follow_up_tendency: 60,
      depth_preference: 60,
      curveball_frequency: 50,
    },
    defaultRedFlags: ['inability to see big picture', 'poor communication', 'lack of initiative'],
    defaultGreenFlags: ['strategic thinking', 'clear communication', 'business impact focus'],
    defaultPetPeeves: ['getting lost in details', 'no clear takeaway', 'passive attitude'],
    favoriteTopics: ['business impact', 'leadership', 'strategic decisions', 'stakeholder management'],
    suggestedVoices: ['leo', 'katie'],
    difficultyModifier: 1,
  },
};

// ============================================
// INTERVIEWER GENERATION
// ============================================
export interface InterviewerGenerationRequest {
  interviewType: InterviewType;
  companyStyle?: CompanyStyle;
  roleTarget?: string;
  difficultyLevel: number; // 1-10
  archetypeHint?: InterviewerArchetype;
  excludeArchetypes?: InterviewerArchetype[];
}

export interface GeneratedInterviewer {
  name: string;
  archetype: InterviewerArchetype;
  backstory: string;
  personality: PersonalityBase;
  communicationStyle: CommunicationStyle;
  questionPatterns: QuestionPatterns;
  redFlags: string[];
  greenFlags: string[];
  petPeeves: string[];
  favoriteTopics: string[];
  voiceConfig: VoiceConfig;
  openingStyle: string;
}

// ============================================
// MOOD SYSTEM
// ============================================
export type MoodLevel = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export interface MoodTransition {
  from: MoodLevel;
  to: MoodLevel;
  trigger: MoodTrigger;
  intensity: number;
}

export type MoodTrigger =
  | 'strong_answer'
  | 'weak_answer'
  | 'specific_example'
  | 'vague_response'
  | 'star_format_used'
  | 'star_format_missing'
  | 'red_flag_triggered'
  | 'green_flag_triggered'
  | 'pet_peeve_triggered'
  | 'favorite_topic_discussed'
  | 'follow_up_answered_well'
  | 'follow_up_dodged'
  | 'honesty_detected'
  | 'deflection_detected';

export interface MoodState {
  level: MoodLevel;
  score: number; // -100 to 100
  recentTriggers: MoodTrigger[];
  impressionNotes: string[];
}

// ============================================
// VOICE OPTIONS (OpenAI TTS — tts-1)
// Key names match voice_config.voice_id values stored in the database.
// No migration required — only the provider behind them changed.
// ============================================
export type OpenAIVoiceKey = 'katie' | 'kiefer' | 'tessa' | 'kyle' | 'leo' | 'maya';

export interface VoiceOption {
  id: OpenAIVoiceKey;
  /** OpenAI voice ID string sent to the API. */
  openAIId: string;
  name: string;
  description: string;
  gender: 'neutral' | 'masculine' | 'feminine';
  tone: 'warm' | 'professional' | 'authoritative' | 'friendly';
  suggestedFor: InterviewerArchetype[];
}

export const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: 'katie',
    openAIId: 'alloy',
    name: 'Katie',
    description: 'Professional and clear',
    gender: 'feminine',
    tone: 'professional',
    suggestedFor: ['silent_judge', 'executive'],
  },
  {
    id: 'kiefer',
    openAIId: 'onyx',
    name: 'Kiefer',
    description: 'Confident and direct',
    gender: 'masculine',
    tone: 'professional',
    suggestedFor: ['skeptic', 'griller', 'silent_judge', 'rapid_fire', 'technical_expert'],
  },
  {
    id: 'tessa',
    openAIId: 'nova',
    name: 'Tessa',
    description: 'Warm and engaging',
    gender: 'feminine',
    tone: 'warm',
    suggestedFor: ['culture_fit', 'friendly'],
  },
  {
    id: 'kyle',
    openAIId: 'echo',
    name: 'Kyle',
    description: 'Dynamic and energetic',
    gender: 'masculine',
    tone: 'friendly',
    suggestedFor: ['rapid_fire'],
  },
  {
    id: 'leo',
    openAIId: 'fable',
    name: 'Leo',
    description: 'Deep and authoritative',
    gender: 'masculine',
    tone: 'authoritative',
    suggestedFor: ['skeptic', 'griller', 'executive', 'technical_expert'],
  },
  {
    id: 'maya',
    openAIId: 'shimmer',
    name: 'Maya',
    description: 'Friendly and approachable',
    gender: 'feminine',
    tone: 'friendly',
    suggestedFor: ['friendly', 'culture_fit'],
  },
];

// ============================================
// COMPANY STYLE MODIFIERS
// ============================================
export interface CompanyStyleModifier {
  id: CompanyStyle;
  name: string;
  description: string;
  formalityModifier: number; // -30 to +30
  technicalFocusModifier: number;
  paceModifier: number;
  typicalQuestionTopics: string[];
  environmentDescription: string;
}

export const COMPANY_STYLE_MODIFIERS: Record<CompanyStyle, CompanyStyleModifier> = {
  faang: {
    id: 'faang',
    name: 'FAANG / Big Tech',
    description: 'Structured, data-driven, high bar',
    formalityModifier: 10,
    technicalFocusModifier: 20,
    paceModifier: 10,
    typicalQuestionTopics: ['scale', 'system design', 'leadership principles', 'impact'],
    environmentDescription: 'Modern tech office with glass walls, whiteboards, and standing desks',
  },
  startup: {
    id: 'startup',
    name: 'Startup',
    description: 'Fast-paced, scrappy, ownership-focused',
    formalityModifier: -20,
    technicalFocusModifier: 10,
    paceModifier: 20,
    typicalQuestionTopics: ['ownership', 'ambiguity', 'wearing multiple hats', 'speed'],
    environmentDescription: 'Casual open office with snacks, bean bags, and energy drinks',
  },
  consulting: {
    id: 'consulting',
    name: 'Consulting',
    description: 'Polished, case-based, client-focused',
    formalityModifier: 30,
    technicalFocusModifier: -10,
    paceModifier: 0,
    typicalQuestionTopics: ['client management', 'problem structuring', 'communication', 'frameworks'],
    environmentDescription: 'Formal conference room with mahogany table and city view',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Process-oriented, stable, hierarchical',
    formalityModifier: 20,
    technicalFocusModifier: 0,
    paceModifier: -10,
    typicalQuestionTopics: ['stakeholder management', 'process improvement', 'documentation', 'compliance'],
    environmentDescription: 'Corporate boardroom with large table and presentation screen',
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    description: 'Creative, deadline-driven, client-facing',
    formalityModifier: -10,
    technicalFocusModifier: -10,
    paceModifier: 15,
    typicalQuestionTopics: ['client relationships', 'creative process', 'deadlines', 'multitasking'],
    environmentDescription: 'Creative studio with mood boards, Mac computers, and coffee bar',
  },
  government: {
    id: 'government',
    name: 'Government',
    description: 'Structured, compliance-focused, methodical',
    formalityModifier: 25,
    technicalFocusModifier: -5,
    paceModifier: -15,
    typicalQuestionTopics: ['compliance', 'documentation', 'public service', 'process adherence'],
    environmentDescription: 'Official government office with flags, secure doors, and formal seating',
  },
};
