/**
 * GET /api/job-description/[id]
 * Get a specific job description with full details
 *
 * DELETE /api/job-description/[id]
 * Delete a job description
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import type { ExperienceRequirements, EducationRequirements } from '@/lib/job-description/parser';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: NextRequest,
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
    const supabase = await createClient();

    const { data: jd, error } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !jd) {
      return NextResponse.json(
        { error: 'Not found', message: 'Job description not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      jobDescription: {
        id: jd.id,
        rawText: jd.raw_text,
        sourceUrl: jd.source_url,
        companyName: jd.company_name,
        roleTitle: jd.role_title,
        requiredSkills: jd.required_skills ?? [],
        preferredSkills: jd.preferred_skills ?? [],
        experienceRequirements: jd.experience_requirements as unknown as ExperienceRequirements | null,
        educationRequirements: jd.education_requirements as unknown as EducationRequirements | null,
        responsibilities: jd.responsibilities ?? [],
        // Gap analysis results (if analyzed)
        resumeId: jd.resume_id,
        matchPercentage: jd.match_percentage,
        matchedSkills: jd.matched_skills ?? [],
        missingRequired: jd.missing_required ?? [],
        missingPreferred: jd.missing_preferred ?? [],
        additionalSkills: jd.additional_skills ?? [],
        narrativeGaps: jd.narrative_gaps ?? [],
        createdAt: jd.created_at,
        analyzedAt: jd.analyzed_at,
      },
    });
  } catch (error) {
    console.error('JD fetch error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const supabase = await createClient();

    const { error } = await supabase
      .from('job_descriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to delete job description' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('JD delete error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
