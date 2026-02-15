import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, getCurrentUser, getUserProfile } from '@/lib/supabase/server';

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return _stripe;
}

// Price IDs from Stripe Dashboard
function getPriceId(tier: 'pro' | 'premium'): string {
  const priceId = tier === 'pro'
    ? process.env.STRIPE_PRO_PRICE_ID
    : process.env.STRIPE_PREMIUM_PRICE_ID;
  if (!priceId) {
    throw new Error(`STRIPE_${tier.toUpperCase()}_PRICE_ID environment variable is not set`);
  }
  return priceId;
}

interface CreateCheckoutRequest {
  tier: 'pro' | 'premium';
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

    const body = await request.json() as CreateCheckoutRequest;
    const { tier } = body;

    if (!tier || !['pro', 'premium'].includes(tier)) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid subscription tier' },
        { status: 400 }
      );
    }

    const priceId = getPriceId(tier);

    const profile = await getUserProfile();
    const supabase = await createClient();

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });

      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create checkout session
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`,
      metadata: {
        user_id: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          tier,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    
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
