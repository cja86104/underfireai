/**
 * UnderFireAI - Resume Interview Context
 *
 * Provides resume-related context for enhancing interview prompts.
 */

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';

// ===========================================
// TYPES
// ===========================================

export interface ResumeVulnerability {
  claim: string;
  severity: 'high' | 'medium' | 'low';
  reason: string;
  probingQuestions: string[];
}

export interface ResumeInterviewContext {
  vulnerabilities: ResumeVulnerability[];
  gaps: {
    area: string;
    description: string;
  }[];
  focusAreas: string[];
}

// ===========================================
// FUNCTIONS
// ===========================================

/**
 * Get resume vulnerabilities to probe during interview
 */
export async function getResumeVulnerabilitiesForInterview(
  userId: string,
  maxVulnerabilities = 5
): Promise<ResumeVulnerability[]> {
  const supabase = await createClient();

  // Get latest vulnerability scan
  const { data: insight } = await supabase
    .from('resume_insights')
    .select('vulnerabilities')
    .eq('user_id', userId)
    .eq('insight_type', 'vulnerability')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!insight?.vulnerabilities) {
    return [];
  }

  const vulnerabilities = insight.vulnerabilities as unknown as ResumeVulnerability[];

  // Sort by severity and take top N
  const sorted = vulnerabilities.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return sorted.slice(0, maxVulnerabilities);
}

/**
 * Get JD gaps to probe during interview
 */
export async function getJdGapsForInterview(
  userId: string,
  jobDescriptionId: string
): Promise<{ area: string; description: string }[]> {
  const supabase = await createClient();

  const { data: jd } = await supabase
    .from('job_descriptions')
    .select('narrative_gaps, missing_required')
    .eq('id', jobDescriptionId)
    .eq('user_id', userId)
    .single();

  if (!jd) {
    return [];
  }

  const gaps: { area: string; description: string }[] = [];

  // Add narrative gaps
  const narrativeGaps = (jd.narrative_gaps ?? []) as unknown as {
    area: string;
    gapDescription: string;
    severity: string;
  }[];

  for (const gap of narrativeGaps) {
    if (gap.severity === 'critical' || gap.severity === 'moderate') {
      gaps.push({
        area: gap.area,
        description: gap.gapDescription,
      });
    }
  }

  // Add missing required skills as gaps
  const missingRequired = jd.missing_required ?? [];
  if (missingRequired.length > 0) {
    gaps.push({
      area: 'Missing Required Skills',
      description: `Candidate lacks: ${missingRequired.slice(0, 5).join(', ')}`,
    });
  }

  return gaps.slice(0, 5);
}

/**
 * Build system prompt context for resume-targeted interviews
 */
export function buildResumeTargetingPrompt(
  vulnerabilities: ResumeVulnerability[],
  gaps: { area: string; description: string }[] = []
): string {
  if (vulnerabilities.length === 0 && gaps.length === 0) {
    return '';
  }

  let prompt = `\n## RESUME COACHING MODE\n`;
  prompt += `This candidate has opted into resume-targeted practice. Your goal is to probe their weak points constructively.\n\n`;

  if (vulnerabilities.length > 0) {
    prompt += `### Resume Vulnerabilities to Probe\n`;
    prompt += `The following claims from the candidate's resume may be weak. Probe these areas with follow-up questions. Don't accept vague answers - push for specifics.\n\n`;

    for (const vuln of vulnerabilities) {
      prompt += `**Claim**: "${vuln.claim}"\n`;
      prompt += `- Why it's weak: ${vuln.reason}\n`;
      prompt += `- Suggested probing questions:\n`;
      for (const q of vuln.probingQuestions.slice(0, 2)) {
        prompt += `  - ${q}\n`;
      }
      prompt += '\n';
    }
  }

  if (gaps.length > 0) {
    prompt += `### Experience Gaps to Explore\n`;
    prompt += `The candidate has identified these gaps they want to practice addressing:\n\n`;

    for (const gap of gaps) {
      prompt += `- **${gap.area}**: ${gap.description}\n`;
    }
    prompt += '\n';
    prompt += `Ask questions that give them practice articulating how they'd address these gaps or demonstrate transferable skills.\n`;
  }

  prompt += `\n### Coaching Instructions\n`;
  prompt += `1. Weave these probing questions naturally into the interview\n`;
  prompt += `2. When the candidate gives a vague answer about a vulnerable claim, follow up with: "Can you be more specific about..."\n`;
  prompt += `3. If they struggle, that's okay - this is practice. Note it but don't be harsh.\n`;
  prompt += `4. Balance probing with encouraging their strengths\n`;
  prompt += `5. At least 2-3 of your questions should target these vulnerable areas\n\n`;

  return prompt;
}

/**
 * Save interview context to session metadata
 */
export async function saveInterviewResumeContext(
  sessionId: string,
  context: ResumeInterviewContext
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('interview_sessions')
    .update({
      resume_targeting_context: context as unknown as Json,
    })
    .eq('id', sessionId);
}
