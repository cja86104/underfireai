import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser, getSubscriptionStatus } from '@/lib/supabase/server';
import type { NegotiationSessionInsert } from '@/types/database';

interface CreateNegotiationRequest {
  target_role: string;
  company_name: string | null;
  current_offer_amount: number;
  target_amount: number;
  experience_years: number | null;
  additional_context: string | null;
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

    const subscription = await getSubscriptionStatus();

    if (!subscription.hasPurchased) {
      return NextResponse.json(
        {
          error: 'Purchase required',
          message: 'Salary Negotiation Prep is included with every interview credit purchase.',
        },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateNegotiationRequest;

    // ── Validation ──────────────────────────────────────────────────────────
    // Upper bounds below exist because target_role, company_name, and
    // additional_context are embedded into the recruiter system prompt; and
    // because amounts stored in the DB seed the UI's anchor numbers — a
    // payload with NaN / Infinity / Number.MAX_SAFE_INTEGER would break the
    // formatter and poison downstream scoring prompts.
    const MAX_AMOUNT = 1_000_000; // $1,000,000 in dollars — comfortably above any real annual offer
    const MAX_EXPERIENCE_YEARS = 60;
    const MAX_ROLE_LENGTH = 200;
    const MAX_COMPANY_LENGTH = 200;
    const MAX_CONTEXT_LENGTH = 2000;

    if (!body.target_role || body.target_role.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Target role is required' },
        { status: 400 }
      );
    }

    if (body.target_role.length > MAX_ROLE_LENGTH) {
      return NextResponse.json(
        { error: 'Validation error', message: `Target role must be ${MAX_ROLE_LENGTH} characters or fewer` },
        { status: 400 }
      );
    }

    if (body.company_name !== null && body.company_name !== undefined) {
      if (typeof body.company_name !== 'string' || body.company_name.length > MAX_COMPANY_LENGTH) {
        return NextResponse.json(
          { error: 'Validation error', message: `Company name must be a string of ${MAX_COMPANY_LENGTH} characters or fewer` },
          { status: 400 }
        );
      }
    }

    if (body.additional_context !== null && body.additional_context !== undefined) {
      if (typeof body.additional_context !== 'string' || body.additional_context.length > MAX_CONTEXT_LENGTH) {
        return NextResponse.json(
          { error: 'Validation error', message: `Additional context must be a string of ${MAX_CONTEXT_LENGTH} characters or fewer` },
          { status: 400 }
        );
      }
    }

    if (
      typeof body.current_offer_amount !== 'number' ||
      !Number.isFinite(body.current_offer_amount) ||
      body.current_offer_amount <= 0 ||
      body.current_offer_amount > MAX_AMOUNT
    ) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Current offer amount must be a positive number within normal salary range' },
        { status: 400 }
      );
    }

    if (
      typeof body.target_amount !== 'number' ||
      !Number.isFinite(body.target_amount) ||
      body.target_amount <= 0 ||
      body.target_amount > MAX_AMOUNT
    ) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Target amount must be a positive number within normal salary range' },
        { status: 400 }
      );
    }

    if (body.experience_years !== null && body.experience_years !== undefined) {
      if (
        typeof body.experience_years !== 'number' ||
        !Number.isFinite(body.experience_years) ||
        body.experience_years < 0 ||
        body.experience_years > MAX_EXPERIENCE_YEARS
      ) {
        return NextResponse.json(
          { error: 'Validation error', message: `Experience years must be a number between 0 and ${MAX_EXPERIENCE_YEARS}` },
          { status: 400 }
        );
      }
    }

    const insert: NegotiationSessionInsert = {
      user_id: user.id,
      target_role: body.target_role.trim(),
      company_name: body.company_name?.trim() || null,
      current_offer_amount: Math.round(body.current_offer_amount),
      target_amount: Math.round(body.target_amount),
      experience_years: body.experience_years ?? null,
      additional_context: body.additional_context?.trim() || null,
      status: 'in_progress',
    };

    const supabase = await createClient();

    const { data: session, error } = await supabase
      .from('negotiation_sessions')
      .insert(insert)
      .select('id')
      .single();

    if (error || !session) {
      console.error('Error creating negotiation session:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create negotiation session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      session_id: session.id,
      message: 'Negotiation session created successfully',
    });
  } catch (error) {
    console.error('Error in create negotiation session:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
