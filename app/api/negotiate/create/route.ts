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

    if (subscription.tier !== 'premium') {
      return NextResponse.json(
        {
          error: 'Premium required',
          message: 'Salary Negotiation Prep requires a Premium subscription.',
        },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateNegotiationRequest;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!body.target_role || body.target_role.trim().length === 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Target role is required' },
        { status: 400 }
      );
    }

    if (typeof body.current_offer_amount !== 'number' || body.current_offer_amount <= 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Current offer amount must be a positive number' },
        { status: 400 }
      );
    }

    if (typeof body.target_amount !== 'number' || body.target_amount <= 0) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Target amount must be a positive number' },
        { status: 400 }
      );
    }

    if (body.experience_years !== null && body.experience_years !== undefined) {
      if (typeof body.experience_years !== 'number' || body.experience_years < 0) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Experience years must be a non-negative number' },
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
