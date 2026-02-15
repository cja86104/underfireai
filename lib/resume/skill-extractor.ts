/**
 * UnderFireAI - Skill Extractor
 *
 * AI-powered skill extraction and categorization from resumes.
 */

import { createChatCompletion } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';

export interface ExtractedSkills {
  technical: string[];
  soft: string[];
  tools: string[];
  languages: string[];
  frameworks: string[];
  databases: string[];
  cloud: string[];
  methodologies: string[];
  certifications: string[];
  all: string[];
}

export interface SkillAnalysis {
  skills: ExtractedSkills;
  experienceLevel: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>;
  recommendations: string[];
  gaps: string[];
}

/** Parsed JSON structure from skill extraction */
interface ParsedSkillsResponse {
  technical?: unknown;
  soft?: unknown;
  tools?: unknown;
  languages?: unknown;
  frameworks?: unknown;
  databases?: unknown;
  cloud?: unknown;
  methodologies?: unknown;
  certifications?: unknown;
}

/** Parsed JSON structure from skill analysis */
interface ParsedSkillAnalysis {
  experienceLevel?: Record<string, string>;
  recommendations?: unknown;
  gaps?: unknown;
}

/**
 * Extract and categorize skills from resume text using AI
 */
export async function extractSkills(resumeText: string): Promise<ExtractedSkills> {
  const prompt = `Extract all skills from this resume and categorize them.

RESUME:
${resumeText.slice(0, 6000)}

Return a JSON object:
{
  "technical": ["programming languages, algorithms, etc."],
  "soft": ["communication, leadership, etc."],
  "tools": ["Git, Jira, Figma, etc."],
  "languages": ["programming languages only"],
  "frameworks": ["React, Django, Spring, etc."],
  "databases": ["MySQL, MongoDB, etc."],
  "cloud": ["AWS, Azure, GCP services"],
  "methodologies": ["Agile, Scrum, TDD, etc."],
  "certifications": ["AWS Certified, PMP, etc."]
}

Be thorough - extract every skill mentioned. Return ONLY valid JSON.`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You extract skills from resumes. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.RESUME_PARSE,
        ...MODEL_PARAMS.resumeParse,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed = JSON.parse(content) as ParsedSkillsResponse;

    const skills: ExtractedSkills = {
      technical: validateArray(parsed.technical),
      soft: validateArray(parsed.soft),
      tools: validateArray(parsed.tools),
      languages: validateArray(parsed.languages),
      frameworks: validateArray(parsed.frameworks),
      databases: validateArray(parsed.databases),
      cloud: validateArray(parsed.cloud),
      methodologies: validateArray(parsed.methodologies),
      certifications: validateArray(parsed.certifications),
      all: [],
    };

    // Combine all skills
    skills.all = [
      ...new Set([
        ...skills.technical,
        ...skills.soft,
        ...skills.tools,
        ...skills.languages,
        ...skills.frameworks,
        ...skills.databases,
        ...skills.cloud,
        ...skills.methodologies,
      ]),
    ];

    return skills;
  } catch (error) {
    console.error('Error extracting skills:', error);
    return extractSkillsBasic(resumeText);
  }
}

/**
 * Analyze skills for a specific role
 */
export async function analyzeSkillsForRole(
  skills: ExtractedSkills,
  targetRole: string
): Promise<SkillAnalysis> {
  const prompt = `Analyze these skills for a ${targetRole} role.

CANDIDATE SKILLS:
${JSON.stringify(skills, null, 2)}

TARGET ROLE: ${targetRole}

Return JSON:
{
  "experienceLevel": {
    "skill_name": "beginner|intermediate|advanced|expert"
  },
  "recommendations": ["skills they should highlight"],
  "gaps": ["skills they should develop for this role"]
}

Be specific to the ${targetRole} role requirements.
Return ONLY valid JSON.`;

  try {
    const completion = await createChatCompletion(
      [
        { role: 'system', content: 'You analyze skills for job fit. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      {
        model: AI_MODELS.ANALYSIS,
        ...MODEL_PARAMS.analysis,
      }
    );

    let content = completion.choices[0]?.message?.content || '{}';
    content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');

    const parsed = JSON.parse(content) as ParsedSkillAnalysis;

    return {
      skills,
      experienceLevel: (parsed.experienceLevel ?? {}) as Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>,
      recommendations: validateArray(parsed.recommendations),
      gaps: validateArray(parsed.gaps),
    };
  } catch (error) {
    console.error('Error analyzing skills:', error);
    return {
      skills,
      experienceLevel: {},
      recommendations: [],
      gaps: [],
    };
  }
}

/**
 * Generate interview topics based on skills
 */
export function generateInterviewTopics(skills: ExtractedSkills): string[] {
  const topics: string[] = [];

  // Technical deep-dives
  if (skills.languages.length > 0) {
    topics.push(`Deep dive on ${skills.languages[0]} experience and best practices`);
  }

  if (skills.frameworks.length > 0) {
    topics.push(`Architecture decisions using ${skills.frameworks[0]}`);
  }

  if (skills.databases.length > 0) {
    topics.push(`Database design and optimization with ${skills.databases[0]}`);
  }

  if (skills.cloud.length > 0) {
    topics.push(`Cloud architecture and ${skills.cloud[0]} services`);
  }

  // Behavioral based on soft skills
  if (skills.soft.includes('leadership') || skills.soft.includes('team lead')) {
    topics.push('Leadership experience and team management');
  }

  if (skills.soft.includes('communication')) {
    topics.push('Cross-functional collaboration and stakeholder management');
  }

  if (skills.methodologies.includes('Agile') || skills.methodologies.includes('Scrum')) {
    topics.push('Agile practices and sprint management');
  }

  // Tool-specific
  if (skills.tools.length > 0) {
    topics.push(`Workflow with ${skills.tools.slice(0, 3).join(', ')}`);
  }

  return topics.slice(0, 10);
}

/**
 * Match skills to job requirements
 */
export function matchSkillsToRequirements(
  candidateSkills: ExtractedSkills,
  requiredSkills: string[],
  preferredSkills: string[] = []
): {
  matched: string[];
  missing: string[];
  additional: string[];
  matchPercentage: number;
} {
  const allCandidateSkills = candidateSkills.all.map(s => s.toLowerCase());

  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of requiredSkills) {
    const lower = skill.toLowerCase();
    if (allCandidateSkills.some(s => s.includes(lower) || lower.includes(s))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  // Check preferred skills
  for (const skill of preferredSkills) {
    const lower = skill.toLowerCase();
    if (allCandidateSkills.some(s => s.includes(lower) || lower.includes(s))) {
      if (!matched.includes(skill)) matched.push(skill);
    }
  }

  // Find additional skills not in requirements
  const additional = candidateSkills.all.filter(skill => {
    const lower = skill.toLowerCase();
    return !requiredSkills.some(r => r.toLowerCase() === lower) &&
           !preferredSkills.some(p => p.toLowerCase() === lower);
  });

  const matchPercentage = requiredSkills.length > 0
    ? Math.round((matched.filter(m => requiredSkills.includes(m)).length / requiredSkills.length) * 100)
    : 100;

  return {
    matched,
    missing,
    additional,
    matchPercentage,
  };
}

/**
 * Basic skill extraction without AI (fallback)
 */
function extractSkillsBasic(text: string): ExtractedSkills {
  const lowerText = text.toLowerCase();

  const patterns: Record<string, string[]> = {
    languages: ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r'],
    frameworks: ['react', 'angular', 'vue', 'next.js', 'node.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', '.net'],
    databases: ['mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'oracle', 'sql server'],
    cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'docker', 'kubernetes', 'terraform'],
    tools: ['git', 'github', 'gitlab', 'jira', 'confluence', 'figma', 'postman', 'webpack', 'jenkins'],
    methodologies: ['agile', 'scrum', 'kanban', 'tdd', 'ci/cd', 'devops'],
    soft: ['leadership', 'communication', 'teamwork', 'problem solving', 'project management'],
  };

  const skills: ExtractedSkills = {
    technical: [],
    soft: [],
    tools: [],
    languages: [],
    frameworks: [],
    databases: [],
    cloud: [],
    methodologies: [],
    certifications: [],
    all: [],
  };

  for (const [category, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        const properCase = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        (skills as unknown as Record<string, string[]>)[category].push(properCase);
      }
    }
  }

  skills.technical = [...skills.languages, ...skills.frameworks];
  skills.all = [
    ...new Set([
      ...skills.languages,
      ...skills.frameworks,
      ...skills.databases,
      ...skills.cloud,
      ...skills.tools,
      ...skills.methodologies,
      ...skills.soft,
    ]),
  ];

  return skills;
}

function validateArray(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((s): s is string => typeof s === 'string' && s.length > 0);
}
