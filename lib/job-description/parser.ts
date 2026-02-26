/**
 * UnderFireAI - Job Description Parser
 *
 * Parses raw job description text into structured data for gap analysis.
 */

import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';

// ===========================================
// TYPES
// ===========================================

export interface ParsedJobDescription {
  companyName: string | null;
  roleTitle: string | null;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: ExperienceRequirements;
  educationRequirements: EducationRequirements;
  responsibilities: string[];
  benefits: string[];
  workStyle: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | 'unknown';
}

export interface ExperienceRequirements {
  minYears: number | null;
  maxYears: number | null;
  specificDomains: string[];
}

export interface EducationRequirements {
  degree: string | null;
  fields: string[];
  required: boolean;
}

// ===========================================
// PARSER
// ===========================================

/**
 * Parse a raw job description into structured data
 */
export async function parseJobDescription(
  rawText: string,
  sourceUrl?: string
): Promise<ParsedJobDescription> {
  // Truncate if too long
  const textForParsing = rawText.slice(0, 10000);

  const parsePrompt = `Parse this job description into structured data. Extract all relevant information.

JOB DESCRIPTION:
${textForParsing}

${sourceUrl ? `Source URL: ${sourceUrl}` : ''}

Return ONLY valid JSON with this structure:
{
  "companyName": "Company name or null if not found",
  "roleTitle": "Job title or null",
  "requiredSkills": ["skill1", "skill2"],
  "preferredSkills": ["skill1", "skill2"],
  "experienceRequirements": {
    "minYears": number or null,
    "maxYears": number or null,
    "specificDomains": ["domain1", "domain2"]
  },
  "educationRequirements": {
    "degree": "Bachelor's/Master's/PhD or null",
    "fields": ["Computer Science", "Engineering"],
    "required": true/false
  },
  "responsibilities": ["responsibility1", "responsibility2"],
  "benefits": ["benefit1", "benefit2"],
  "workStyle": "remote|hybrid|onsite|unknown",
  "seniorityLevel": "entry|mid|senior|lead|executive|unknown"
}

Guidelines:
- For skills, include both technical (languages, frameworks, tools) and soft skills
- Required skills are explicitly marked as "required" or "must have"
- Preferred skills are marked as "nice to have", "preferred", or "bonus"
- If experience years not specified, use null
- Extract specific domain experience (e.g., "fintech", "healthcare", "e-commerce")
- Responsibilities should be concise bullet points
- Determine seniority from title, years required, and responsibilities

Return ONLY the JSON object, no markdown formatting.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a job description parser. Extract structured data accurately and return only valid JSON.',
    },
    { role: 'user', content: parsePrompt },
  ];

  try {
    const completion = await createChatCompletion(messages, {
      model: AI_MODELS.RESUME_PARSE,
      ...MODEL_PARAMS.resumeParse,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';

    // Clean up potential markdown formatting
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanContent) as ParsedJobDescription;

    // Ensure arrays are initialized
    return {
      companyName: parsed.companyName ?? null,
      roleTitle: parsed.roleTitle ?? null,
      requiredSkills: parsed.requiredSkills ?? [],
      preferredSkills: parsed.preferredSkills ?? [],
      experienceRequirements: {
        minYears: parsed.experienceRequirements?.minYears ?? null,
        maxYears: parsed.experienceRequirements?.maxYears ?? null,
        specificDomains: parsed.experienceRequirements?.specificDomains ?? [],
      },
      educationRequirements: {
        degree: parsed.educationRequirements?.degree ?? null,
        fields: parsed.educationRequirements?.fields ?? [],
        required: parsed.educationRequirements?.required ?? false,
      },
      responsibilities: parsed.responsibilities ?? [],
      benefits: parsed.benefits ?? [],
      workStyle: parsed.workStyle ?? 'unknown',
      seniorityLevel: parsed.seniorityLevel ?? 'unknown',
    };
  } catch (error) {
    console.error('JD parsing error:', error);
    // Return empty structure on error
    return {
      companyName: null,
      roleTitle: null,
      requiredSkills: [],
      preferredSkills: [],
      experienceRequirements: {
        minYears: null,
        maxYears: null,
        specificDomains: [],
      },
      educationRequirements: {
        degree: null,
        fields: [],
        required: false,
      },
      responsibilities: [],
      benefits: [],
      workStyle: 'unknown',
      seniorityLevel: 'unknown',
    };
  }
}

/**
 * Extract key requirements for interview targeting
 */
export function extractInterviewFocusAreas(
  jd: ParsedJobDescription
): string[] {
  const focusAreas: string[] = [];

  // Add required skills as focus areas
  jd.requiredSkills.slice(0, 5).forEach((skill) => {
    focusAreas.push(`Technical proficiency in ${skill}`);
  });

  // Add domain experience requirements
  jd.experienceRequirements.specificDomains.forEach((domain) => {
    focusAreas.push(`Experience in ${domain} domain`);
  });

  // Add key responsibilities
  jd.responsibilities.slice(0, 3).forEach((resp) => {
    focusAreas.push(resp);
  });

  return focusAreas;
}
