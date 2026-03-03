import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, getCurrentUser, getUserProfile } from '@/lib/supabase/server';
import { INTERVIEW_PRODUCT_CONFIG, type InterviewProduct } from '@/types/database';

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

/**
 * Get the Stripe Price ID for a product
 * These should be configured in your Stripe Dashboard as one-time prices
 */
function getPriceId(product: InterviewProduct): string {
  const envMap: Record<InterviewProduct, string> = {
    starter_6: 'STRIPE_STARTER_PRICE_ID',
    pro_11: 'STRIPE_PRO_PACK_PRICE_ID',
    refill_5: 'STRIPE_REFILL_PRICE_ID',
  };

  const envVar = envMap[product];
  const priceId = process.env[envVar];
  
  if (!priceId) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  
  return priceId;
}

interface CreateCheckoutRequest {
  product: InterviewProduct;
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
    const { product } = body;

    // Validate product
    if (!product || !INTERVIEW_PRODUCT_CONFIG[product]) {
      return NextResponse.json(
        { error: 'Validation error', message: 'Invalid product selected' },
        { status: 400 }
      );
    }

    const productConfig = INTERVIEW_PRODUCT_CONFIG[product];

    // Refill pack requires user to have purchased before
    if (productConfig.isRefill) {
      const profile = await getUserProfile();
      if (!profile || profile.purchased_interviews === 0) {
        return NextResponse.json(
          { error: 'Validation error', message: 'Refill packs are only available after an initial purchase' },
          { status: 400 }
        );
      }
    }

    const priceId = getPriceId(product);
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

    // Create checkout session for ONE-TIME PAYMENT
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'payment', // ONE-TIME payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?purchase=success&product=${product}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`,
      metadata: {
        user_id: user.id,
        product,
        interviews: productConfig.interviews.toString(),
        amount_cents: productConfig.priceCents.toString(),
      },
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          product,
          interviews: productConfig.interviews.toString(),
          amount_cents: productConfig.priceCents.toString(),
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

    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { error: 'Server error', message },
      { status: 500 }
    );
  }
}
