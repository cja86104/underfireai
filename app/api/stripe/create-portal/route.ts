import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser, getUserProfile } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const profile = await getUserProfile();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Not found', message: 'No billing account found' },
        { status: 404 }
      );
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Stripe error', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
