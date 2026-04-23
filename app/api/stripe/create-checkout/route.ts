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

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL environment variable is not set');
  return url;
}

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

// Stripe returns code 'resource_missing' when the referenced customer/price
// no longer exists in the account (e.g. customer deleted in Dashboard or
// test-mode data wiped). We specifically catch it during session creation so
// a stale stripe_customer_id on the profile is auto-healed instead of
// permanently blocking checkout for that user.
function isResourceMissing(err: unknown): boolean {
  return err instanceof Stripe.errors.StripeError && err.code === 'resource_missing';
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

    // Refill pack requires user to have purchased before. This rule also
    // naturally prevents a fully-refunded user (purchased_interviews back to 0
    // via revoke_interview_credits) from using the refill path until they
    // make a fresh non-refill purchase.
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

    let customerId = profile?.stripe_customer_id ?? null;

    const sessionParams = (customer: string): Stripe.Checkout.SessionCreateParams => ({
      customer,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${getAppUrl()}/dashboard?purchase=success&product=${product}`,
      cancel_url: `${getAppUrl()}/settings?tab=billing&canceled=true`,
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

    // Ensure we have a valid customer. If the stored ID is stale (deleted in
    // Stripe), Stripe's checkout.sessions.create throws resource_missing. We
    // recover by clearing the bad ID, creating a new customer, and retrying
    // once. Bounded to a single retry so a persistent error still surfaces.
    let session: Stripe.Checkout.Session | null = null;
    let createdNewCustomer = false;

    const ensureCustomer = async (): Promise<string> => {
      if (customerId) return customerId;

      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      createdNewCustomer = true;
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      return customerId;
    };

    const activeCustomerId = await ensureCustomer();

    try {
      session = await getStripe().checkout.sessions.create(sessionParams(activeCustomerId));
    } catch (err) {
      // A stale customer ID is the only condition we silently recover from.
      // We only retry if the customer ID came from the profile (not if we
      // just created it ourselves — a freshly-created customer disappearing
      // mid-request is an unrecoverable Stripe-side anomaly).
      if (isResourceMissing(err) && !createdNewCustomer) {
        console.warn(
          `Stale stripe_customer_id for user ${user.id}: ${customerId}. ` +
          `Clearing and recreating.`,
        );

        await supabase
          .from('profiles')
          .update({ stripe_customer_id: null })
          .eq('id', user.id);

        customerId = null;
        const replacementCustomerId = await ensureCustomer();
        session = await getStripe().checkout.sessions.create(sessionParams(replacementCustomerId));
      } else {
        throw err;
      }
    }

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
