/**
 * POST /api/job-description/[id]/analyze
 * Run gap analysis between job description and user's resume
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { analyzeGaps } from '@/lib/job-description/gap-analyzer';
import type { ParsedJobDescription, ExperienceRequirements, EducationRequirements } from '@/lib/job-description/parser';
import type { Json } from '@/types/database';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface PostBody {
  resumeId?: string;
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

    // Gate: Job Analysis requires any interview pack purchase
    const subscription = await getSubscriptionStatus();
    if (!subscription.hasPurchased) {
      return NextResponse.json(
        { error: 'Purchase required', message: 'Job Description Analysis is included with every interview credit purchase.' },
        { status: 403 }
      );
    }

    // Get the job description
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

    // Get the resume (specified or most recent)
    let resumeQuery = supabase
      .from('user_resumes')
      .select('id, raw_text, skills, experience_years, target_role')
      .eq('user_id', user.id);

    if (body.resumeId) {
      resumeQuery = resumeQuery.eq('id', body.resumeId);
    } else {
      resumeQuery = resumeQuery.order('uploaded_at', { ascending: false }).limit(1);
    }

    const { data: resume, error: resumeError } = await resumeQuery.single();

    if (resumeError || !resume) {
      return NextResponse.json(
        { error: 'No resume', message: 'Please upload a resume before analyzing job fit' },
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

    // Run gap analysis
    const analysis = await analyzeGaps(
      {
        rawText: resume.raw_text ?? '',
        skills: resume.skills ?? [],
        experienceYears: resume.experience_years,
        targetRole: resume.target_role,
      },
      parsedJd
    );

    // Update job description with analysis results
    const { error: updateError } = await supabase
      .from('job_descriptions')
      .update({
        resume_id: resume.id,
        match_percentage: analysis.matchPercentage,
        matched_skills: analysis.matchedSkills,
        missing_required: analysis.missingRequired,
        missing_preferred: analysis.missingPreferred,
        additional_skills: analysis.additionalSkills,
        narrative_gaps: analysis.narrativeGaps as unknown as Json,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Analysis update error:', updateError);
    }

    return NextResponse.json({
      success: true,
      analysis: {
        matchPercentage: analysis.matchPercentage,
        matchedSkills: analysis.matchedSkills,
        missingRequired: analysis.missingRequired,
        missingPreferred: analysis.missingPreferred,
        additionalSkills: analysis.additionalSkills,
        narrativeGaps: analysis.narrativeGaps,
        strengths: analysis.strengths,
        recommendations: analysis.recommendations,
      },
      resumeId: resume.id,
    });
  } catch (error) {
    console.error('Gap analysis error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
