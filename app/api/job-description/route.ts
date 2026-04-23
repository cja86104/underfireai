/**
 * POST /api/job-description
 * Parse and save a job description
 *
 * GET /api/job-description
 * List user's saved job descriptions
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import { parseJobDescription } from '@/lib/job-description/parser';
import type { Json } from '@/types/database';

interface PostBody {
  rawText: string;
  sourceUrl?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as PostBody;

    if (!body.rawText || body.rawText.trim().length < 50) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Job description text is required (min 50 characters)' },
        { status: 400 }
      );
    }

    // Explicit upper bound. Without this, the downstream `.slice(0, 50000)`
    // silently discards text past 50k chars — user can't see their content
    // was truncated. Reject instead so the client is aware, and so a 50 MB
    // paste cannot occupy memory on the way to the truncation step.
    const MAX_JD_LENGTH = 50_000;
    if (body.rawText.length > MAX_JD_LENGTH) {
      return NextResponse.json(
        { error: 'Validation error', message: `Job description must be ${MAX_JD_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    // source_url cap — the URL is embedded into the JD parser prompt via the
    // sandboxed `Source URL:` line. Without a ceiling a malicious paste could
    // balloon per-call token cost.
    const MAX_SOURCE_URL_LENGTH = 2_000;
    if (body.sourceUrl !== undefined && body.sourceUrl !== null) {
      if (typeof body.sourceUrl !== 'string' || body.sourceUrl.length > MAX_SOURCE_URL_LENGTH) {
        return NextResponse.json(
          { error: 'Validation error', message: `Source URL must be a string of ${MAX_SOURCE_URL_LENGTH} characters or fewer` },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Check if user has purchased
    const subscription = await getSubscriptionStatus();

    if (!subscription.hasPurchased) {
      return NextResponse.json(
        { error: 'Purchase required', message: 'Job description analysis is available after purchasing interview credits' },
        { status: 403 }
      );
    }

    // Parse the job description
    const parsed = await parseJobDescription(body.rawText, body.sourceUrl);

    // Save to database
    const { data: jd, error: insertError } = await supabase
      .from('job_descriptions')
      .insert({
        user_id: user.id,
        raw_text: body.rawText.slice(0, 50000),
        source_url: body.sourceUrl ?? null,
        company_name: parsed.companyName,
        role_title: parsed.roleTitle,
        required_skills: parsed.requiredSkills,
        preferred_skills: parsed.preferredSkills,
        experience_requirements: parsed.experienceRequirements as unknown as Json,
        education_requirements: parsed.educationRequirements as unknown as Json,
        responsibilities: parsed.responsibilities,
      })
      .select('id, company_name, role_title, required_skills, preferred_skills, created_at')
      .single();

    if (insertError) {
      console.error('JD insert error:', insertError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to save job description' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobDescription: {
        id: jd.id,
        companyName: jd.company_name,
        roleTitle: jd.role_title,
        requiredSkills: jd.required_skills,
        preferredSkills: jd.preferred_skills,
        createdAt: jd.created_at,
      },
      parsed: {
        ...parsed,
      },
      message: 'Job description parsed successfully',
    });
  } catch (error) {
    console.error('JD parse error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: jobs, error } = await supabase
      .from('job_descriptions')
      .select(`
        id,
        company_name,
        role_title,
        required_skills,
        match_percentage,
        created_at,
        analyzed_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('JD fetch error:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch job descriptions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobDescriptions: jobs.map((j) => ({
        id: j.id,
        companyName: j.company_name,
        roleTitle: j.role_title,
        requiredSkillsCount: j.required_skills?.length ?? 0,
        matchPercentage: j.match_percentage,
        createdAt: j.created_at,
        analyzed: !!j.analyzed_at,
      })),
    });
  } catch (error) {
    console.error('JD list error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
