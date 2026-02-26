/**
 * POST /api/job-description/[id]/generate-practice
 * Generate a practice interview session config based on JD gaps
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { generatePracticeConfig, type NarrativeGap } from '@/lib/job-description/gap-analyzer';
import type { ParsedJobDescription, ExperienceRequirements, EducationRequirements } from '@/lib/job-description/parser';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PostBody {
  focusAreas?: string[];
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = (await request.json()) as PostBody;

    const supabase = await createClient();

    // Check subscription - premium only
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'premium') {
      return NextResponse.json(
        { error: 'Upgrade required', message: 'JD-targeted practice is a Premium feature' },
        { status: 403 }
      );
    }

    // Get the job description with analysis
    const { data: jd, error: jdError } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (jdError || !jd) {
      return NextResponse.json(
        { error: 'Not found', message: 'Job description not found' },
        { status: 404 }
      );
    }

    if (!jd.analyzed_at) {
      return NextResponse.json(
        { error: 'Not analyzed', message: 'Please run gap analysis first' },
        { status: 400 }
      );
    }

    // Build parsed JD structure
    const parsedJd: ParsedJobDescription = {
      companyName: jd.company_name,
      roleTitle: jd.role_title,
      requiredSkills: jd.required_skills ?? [],
      preferredSkills: jd.preferred_skills ?? [],
      experienceRequirements: (jd.experience_requirements as unknown as ExperienceRequirements) ?? {
        minYears: null,
        maxYears: null,
        specificDomains: [],
      },
      educationRequirements: (jd.education_requirements as unknown as EducationRequirements) ?? {
        degree: null,
        fields: [],
        required: false,
      },
      responsibilities: jd.responsibilities ?? [],
      benefits: [],
      workStyle: 'unknown',
      seniorityLevel: 'unknown',
    };

    // Build analysis from stored results
    const analysis = {
      matchPercentage: jd.match_percentage ?? 0,
      matchedSkills: jd.matched_skills ?? [],
      missingRequired: jd.missing_required ?? [],
      missingPreferred: jd.missing_preferred ?? [],
      additionalSkills: jd.additional_skills ?? [],
      narrativeGaps: (jd.narrative_gaps ?? []) as unknown as NarrativeGap[],
      strengths: [], // These aren't stored, will be regenerated
      recommendations: [],
    };

    // Generate practice config
    const practiceConfig = generatePracticeConfig(parsedJd, analysis);

    // Override focus areas if provided
    if (body.focusAreas && body.focusAreas.length > 0) {
      practiceConfig.focusAreas = body.focusAreas;
    }

    return NextResponse.json({
      success: true,
      practiceConfig: {
        targetRole: practiceConfig.targetRole,
        targetCompany: jd.company_name,
        interviewType: practiceConfig.interviewType,
        difficulty: practiceConfig.difficulty,
        focusAreas: practiceConfig.focusAreas,
        jobDescriptionId: id,
        // This context can be passed to the interview setup
        systemPromptContext: practiceConfig.systemPromptContext,
      },
      // Quick link to start interview
      startUrl: `/interview/new?jd=${id}&role=${encodeURIComponent(practiceConfig.targetRole)}&type=${practiceConfig.interviewType}&difficulty=${practiceConfig.difficulty}`,
    });
  } catch (error) {
    console.error('Generate practice error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
