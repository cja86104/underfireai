/**
 * POST /api/job-description
 * Parse and save a job description
 *
 * GET /api/job-description
 * List user's saved job descriptions
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
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

    const supabase = await createClient();

    // Check subscription and monthly limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'free') {
      return NextResponse.json(
        { error: 'Upgrade required', message: 'Job description analysis is a Pro feature' },
        { status: 403 }
      );
    }

    // Check monthly limit for Pro users (3/month)
    if (profile?.subscription_tier === 'pro') {
      const { count } = await supabase
        .from('job_descriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString());

      if (count && count >= 3) {
        return NextResponse.json(
          { error: 'Limit reached', message: 'Pro users can analyze 3 job descriptions per month. Upgrade to Premium for unlimited.' },
          { status: 403 }
        );
      }
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
