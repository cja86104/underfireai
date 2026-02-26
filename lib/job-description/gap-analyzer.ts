/**
 * UnderFireAI - Job Description Gap Analyzer
 *
 * Analyzes gaps between a user's resume and a job description.
 */

import { createChatCompletion, type ChatMessage } from '@/lib/ai/chat-client';
import { AI_MODELS, MODEL_PARAMS } from '@/lib/ai/config';
import type { ParsedJobDescription } from './parser';

// ===========================================
// TYPES
// ===========================================

export interface GapAnalysis {
  matchPercentage: number;
  matchedSkills: string[];
  missingRequired: string[];
  missingPreferred: string[];
  additionalSkills: string[];
  narrativeGaps: NarrativeGap[];
  strengths: string[];
  recommendations: string[];
}

export interface NarrativeGap {
  area: string;
  gapDescription: string;
  coachingTip: string;
  severity: 'critical' | 'moderate' | 'minor';
}

interface ResumeData {
  rawText: string;
  skills: string[];
  experienceYears: number | null;
  targetRole: string | null;
}

// ===========================================
// GAP ANALYZER
// ===========================================

/**
 * Analyze gaps between resume and job description
 */
export async function analyzeGaps(
  resume: ResumeData,
  jd: ParsedJobDescription
): Promise<GapAnalysis> {
  // First do a basic skill matching
  const resumeSkillsLower = resume.skills.map((s) => s.toLowerCase());
  const requiredLower = jd.requiredSkills.map((s) => s.toLowerCase());
  const preferredLower = jd.preferredSkills.map((s) => s.toLowerCase());

  // Find matches and gaps using fuzzy matching
  const matchedSkills: string[] = [];
  const missingRequired: string[] = [];
  const missingPreferred: string[] = [];

  for (const skill of jd.requiredSkills) {
    if (skillMatches(skill, resumeSkillsLower)) {
      matchedSkills.push(skill);
    } else {
      missingRequired.push(skill);
    }
  }

  for (const skill of jd.preferredSkills) {
    if (skillMatches(skill, resumeSkillsLower)) {
      if (!matchedSkills.includes(skill)) {
        matchedSkills.push(skill);
      }
    } else {
      missingPreferred.push(skill);
    }
  }

  // Find additional skills (on resume but not in JD)
  const allJdSkills = [...requiredLower, ...preferredLower];
  const additionalSkills = resume.skills.filter(
    (skill) => !allJdSkills.some((jdSkill) =>
      skill.toLowerCase().includes(jdSkill) || jdSkill.includes(skill.toLowerCase())
    )
  );

  // Now do AI analysis for narrative gaps
  const narrativeAnalysis = await analyzeNarrativeGaps(resume, jd);

  // Calculate match percentage
  const totalRequired = jd.requiredSkills.length;
  const matchedRequired = jd.requiredSkills.filter((s) =>
    skillMatches(s, resumeSkillsLower)
  ).length;
  const matchPercentage =
    totalRequired > 0
      ? Math.round((matchedRequired / totalRequired) * 100)
      : 100;

  return {
    matchPercentage,
    matchedSkills,
    missingRequired,
    missingPreferred,
    additionalSkills: additionalSkills.slice(0, 10),
    narrativeGaps: narrativeAnalysis.gaps,
    strengths: narrativeAnalysis.strengths,
    recommendations: narrativeAnalysis.recommendations,
  };
}

/**
 * Check if a skill matches any in the list (fuzzy matching)
 */
function skillMatches(skill: string, skillList: string[]): boolean {
  const skillLower = skill.toLowerCase();

  // Common skill aliases
  const aliases: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript'],
    'typescript': ['ts'],
    'python': ['py'],
    'react': ['reactjs', 'react.js'],
    'node': ['nodejs', 'node.js'],
    'vue': ['vuejs', 'vue.js'],
    'angular': ['angularjs', 'angular.js'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'kubernetes': ['k8s'],
    'docker': ['containerization'],
    'aws': ['amazon web services'],
    'gcp': ['google cloud', 'google cloud platform'],
    'azure': ['microsoft azure'],
    'ci/cd': ['continuous integration', 'continuous deployment'],
    'machine learning': ['ml'],
    'artificial intelligence': ['ai'],
  };

  return skillList.some((listSkill) => {
    // Direct match
    if (listSkill.includes(skillLower) || skillLower.includes(listSkill)) {
      return true;
    }

    // Check aliases
    for (const [key, values] of Object.entries(aliases)) {
      if (skillLower.includes(key) || values.some((v) => skillLower.includes(v))) {
        if (listSkill.includes(key) || values.some((v) => listSkill.includes(v))) {
          return true;
        }
      }
    }

    return false;
  });
}

/**
 * Use AI to analyze narrative gaps (experience, leadership, domain)
 */
async function analyzeNarrativeGaps(
  resume: ResumeData,
  jd: ParsedJobDescription
): Promise<{
  gaps: NarrativeGap[];
  strengths: string[];
  recommendations: string[];
}> {
  const resumeExcerpt = resume.rawText.slice(0, 4000);

  const prompt = `Analyze the gaps between this resume and job description. Focus on narrative gaps, not just skill lists.

RESUME:
${resumeExcerpt}

JOB REQUIREMENTS:
- Role: ${jd.roleTitle ?? 'Not specified'}
- Seniority: ${jd.seniorityLevel}
- Experience: ${jd.experienceRequirements.minYears ?? '?'}-${jd.experienceRequirements.maxYears ?? '?'} years
- Domains: ${jd.experienceRequirements.specificDomains.join(', ') || 'Not specified'}
- Key Responsibilities: ${jd.responsibilities.slice(0, 5).join('; ')}

Analyze for:
1. Experience level gaps (years, seniority, scope)
2. Domain/industry gaps
3. Leadership/management gaps
4. Technical depth gaps
5. Soft skills gaps

Return JSON:
{
  "gaps": [
    {
      "area": "Area name (e.g., 'Leadership Experience')",
      "gapDescription": "Specific description of the gap",
      "coachingTip": "How to address this in interviews",
      "severity": "critical|moderate|minor"
    }
  ],
  "strengths": [
    "Strength that aligns well with the role"
  ],
  "recommendations": [
    "Specific recommendation for the candidate"
  ]
}

Return ONLY valid JSON.`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a career coach analyzing resume-job fit. Be constructive but honest about gaps.',
    },
    { role: 'user', content: prompt },
  ];

  try {
    const completion = await createChatCompletion(messages, {
      model: AI_MODELS.ANALYSIS,
      ...MODEL_PARAMS.analysis,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const cleanContent = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const result = JSON.parse(cleanContent) as {
      gaps: NarrativeGap[];
      strengths: string[];
      recommendations: string[];
    };

    return {
      gaps: result.gaps ?? [],
      strengths: result.strengths ?? [],
      recommendations: result.recommendations ?? [],
    };
  } catch (error) {
    console.error('Narrative gap analysis error:', error);
    return {
      gaps: [],
      strengths: [],
      recommendations: [],
    };
  }
}

/**
 * Generate interview topics based on gaps
 */
export function generatePracticeTopics(analysis: GapAnalysis): string[] {
  const topics: string[] = [];

  // Add critical narrative gaps
  analysis.narrativeGaps
    .filter((g) => g.severity === 'critical')
    .forEach((gap) => {
      topics.push(`Address gap: ${gap.area}`);
    });

  // Add missing required skills
  analysis.missingRequired.slice(0, 3).forEach((skill) => {
    topics.push(`Demonstrate transferable knowledge: ${skill}`);
  });

  // Add areas to emphasize strengths
  analysis.strengths.slice(0, 2).forEach((strength) => {
    topics.push(`Highlight strength: ${strength}`);
  });

  return topics;
}

/**
 * Generate session config for gap-targeted practice
 */
export function generatePracticeConfig(
  jd: ParsedJobDescription,
  analysis: GapAnalysis
): {
  targetRole: string;
  interviewType: string;
  difficulty: number;
  focusAreas: string[];
  systemPromptContext: string;
} {
  // Determine interview type based on gaps
  let interviewType = 'behavioral';
  if (analysis.missingRequired.length > 2) {
    interviewType = 'technical';
  }

  // Determine difficulty based on seniority
  let difficulty = 5;
  if (jd.seniorityLevel === 'senior' || jd.seniorityLevel === 'lead') {
    difficulty = 7;
  } else if (jd.seniorityLevel === 'executive') {
    difficulty = 9;
  } else if (jd.seniorityLevel === 'entry') {
    difficulty = 3;
  }

  // Build focus areas
  const focusAreas = generatePracticeTopics(analysis);

  // Build system prompt context for the interviewer
  const systemPromptContext = `
This candidate is applying for: ${jd.roleTitle ?? 'a technical role'} at ${jd.companyName ?? 'a company'}

KEY GAPS TO PROBE:
${analysis.narrativeGaps.map((g) => `- ${g.area}: ${g.gapDescription}`).join('\n')}

MISSING SKILLS TO ASSESS:
${analysis.missingRequired.map((s) => `- ${s}`).join('\n')}

STRENGTHS TO EXPLORE:
${analysis.strengths.map((s) => `- ${s}`).join('\n')}

Focus your questions on understanding how the candidate would address their gaps and leverage their strengths for this specific role.
`.trim();

  return {
    targetRole: jd.roleTitle ?? 'Software Engineer',
    interviewType,
    difficulty,
    focusAreas,
    systemPromptContext,
  };
}
