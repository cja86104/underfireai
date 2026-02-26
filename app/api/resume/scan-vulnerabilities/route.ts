import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import {
  generateAndSaveVulnerabilityScan,
  getLatestVulnerabilityScan,
} from '@/lib/resume/insights-service';

/**
 * POST /api/resume/scan-vulnerabilities
 *
 * Scans user's resume for vulnerabilities and generates probing questions.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Check subscription tier
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier === 'free') {
      return NextResponse.json(
        {
          error: 'Upgrade required',
          message: 'Resume vulnerability scanning is available on Pro and Premium plans',
        },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      resumeId?: string;
      forceRescan?: boolean;
    };
    const { resumeId, forceRescan } = body;

    // Check for recent scan (within 24 hours) unless force rescan
    if (!forceRescan) {
      const existing = await getLatestVulnerabilityScan(user.id, resumeId);
      if (existing) {
        const scanAge = Date.now() - new Date(existing.createdAt).getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (scanAge < twentyFourHours) {
          return NextResponse.json({
            success: true,
            cached: true,
            insight: {
              id: existing.id,
              vulnerabilityScore: existing.vulnerabilityScore,
              vulnerabilities: existing.vulnerabilities,
              createdAt: existing.createdAt,
            },
          });
        }
      }
    }

    // Generate new vulnerability scan
    const insight = await generateAndSaveVulnerabilityScan(user.id, resumeId);

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Scan failed',
          message: 'Could not scan resume. Do you have a resume uploaded?',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      cached: false,
      insight: {
        id: insight.id,
        vulnerabilityScore: insight.vulnerabilityScore,
        vulnerabilities: insight.vulnerabilities,
        createdAt: insight.createdAt,
      },
    });
  } catch (error) {
    console.error('Error scanning vulnerabilities:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to scan vulnerabilities' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resume/scan-vulnerabilities?resumeId=xxx
 *
 * Get latest vulnerability scan for a resume.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get('resumeId') ?? undefined;

    const insight = await getLatestVulnerabilityScan(user.id, resumeId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Not found', message: 'No vulnerability scan found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      insight: {
        id: insight.id,
        vulnerabilityScore: insight.vulnerabilityScore,
        vulnerabilities: insight.vulnerabilities,
        createdAt: insight.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching vulnerability scan:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch vulnerability scan' },
      { status: 500 }
    );
  }
}
