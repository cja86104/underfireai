import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database, InterviewProduct } from '@/types/database';
import { INTERVIEW_PRODUCT_CONFIG } from '@/types/database';

// Lazy initialization to avoid build-time errors
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    _stripe = new Stripe(secretKey, { apiVersion: '2025-02-24.acacia' });
  }
  return _stripe;
}

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;
function getSupabaseAdmin(): ReturnType<typeof createClient<Database>> {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase environment variables are not set');
    _supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);
  }
  return _supabaseAdmin;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'payment') {
          await handlePaymentCompleted(session);
        } else if (session.mode === 'subscription') {
          await handleLegacySubscriptionCheckout(session);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleLegacySubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleLegacySubscriptionCanceled(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handleLegacyPaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

// =============================================================================
// ONE-TIME PAYMENT HANDLERS
// =============================================================================

async function handlePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId    = session.metadata?.user_id;
  const product   = session.metadata?.product as InterviewProduct | undefined;
  const interviews = session.metadata?.interviews;
  const amountCents = session.metadata?.amount_cents;

  if (!userId || !product || !interviews) {
    console.error('Missing metadata in checkout session:', { userId, product, interviews });
    return;
  }

  if (!INTERVIEW_PRODUCT_CONFIG[product]) {
    console.error('Unknown product in checkout session:', product);
    return;
  }

  const interviewCount  = parseInt(interviews, 10);
  const amount          = amountCents ? parseInt(amountCents, 10) : INTERVIEW_PRODUCT_CONFIG[product].priceCents;
  const paymentIntentId = session.payment_intent as string | null;

  // Fast-path idempotency — avoid an unnecessary RPC call for duplicate events.
  // The grant_interview_credits function enforces true idempotency atomically
  // via ON CONFLICT DO NOTHING, so these SELECTs are an optimisation only.
  const { data: existingBySession } = await getSupabaseAdmin()
    .from('interview_purchases')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .maybeSingle();

  if (existingBySession) {
    console.log('Checkout session already processed (fast-path):', session.id);
    return;
  }

  if (paymentIntentId) {
    const { data: existingByIntent } = await getSupabaseAdmin()
      .from('interview_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();

    if (existingByIntent) {
      // payment_intent.succeeded fired first and already granted credits.
      // Stamp the checkout session id onto that row for future idempotency checks.
      await getSupabaseAdmin()
        .from('interview_purchases')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', existingByIntent.id);
      console.log('Already processed via payment intent (fast-path):', paymentIntentId);
      return;
    }
  }

  // Atomically insert the purchase record and increment the profile in one
  // database transaction (INSERT-first → UPDATE profile only if insert wins).
  // Returns true if credits were granted; false if a concurrent event won the race.
  const { data: granted, error: rpcError } = await getSupabaseAdmin()
    .rpc('grant_interview_credits', {
      p_user_id:                    userId,
      p_interviews:                 interviewCount,
      p_product_type:               product,
      p_amount_cents:               amount,
      p_stripe_payment_intent_id:   paymentIntentId ?? null,
      p_stripe_checkout_session_id: session.id,
    });

  if (rpcError) {
    console.error('grant_interview_credits RPC error:', rpcError);
    throw rpcError;
  }

  if (!granted) {
    console.log('grant_interview_credits: already processed (RPC idempotent):', session.id);
    return;
  }

  console.log(`Granted ${interviewCount} interviews to user ${userId} for product ${product} (checkout: ${session.id})`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const userId  = paymentIntent.metadata?.user_id;
  const product = paymentIntent.metadata?.product as InterviewProduct | undefined;

  if (!userId || !product) return; // Not an UnderFire payment intent

  const interviews = paymentIntent.metadata?.interviews;
  const amountCents = paymentIntent.metadata?.amount_cents;

  if (!interviews) {
    console.error('Missing interviews in payment intent metadata');
    return;
  }

  const interviewCount = parseInt(interviews, 10);
  const amount         = amountCents ? parseInt(amountCents, 10) : (INTERVIEW_PRODUCT_CONFIG[product]?.priceCents ?? 0);

  // Fast-path idempotency check.
  const { data: existingPurchase } = await getSupabaseAdmin()
    .from('interview_purchases')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .maybeSingle();

  if (existingPurchase) {
    console.log('Payment intent already processed (fast-path):', paymentIntent.id);
    return;
  }

  // Atomic grant — the INSERT-first pattern in the function means only one of
  // this event or checkout.session.completed will actually write the profile.
  const { data: granted, error: rpcError } = await getSupabaseAdmin()
    .rpc('grant_interview_credits', {
      p_user_id:                    userId,
      p_interviews:                 interviewCount,
      p_product_type:               product,
      p_amount_cents:               amount,
      p_stripe_payment_intent_id:   paymentIntent.id,
      p_stripe_checkout_session_id: null,
    });

  if (rpcError) {
    console.error('grant_interview_credits RPC error:', rpcError);
    throw rpcError;
  }

  if (!granted) {
    console.log('grant_interview_credits: already processed (RPC idempotent):', paymentIntent.id);
    return;
  }

  console.log(`Granted ${interviewCount} interviews to user ${userId} via payment intent ${paymentIntent.id}`);
}

// =============================================================================
// LEGACY SUBSCRIPTION HANDLERS (for backwards compatibility)
// =============================================================================

async function handleLegacySubscriptionCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  const tier   = session.metadata?.tier as 'pro' | 'premium';

  if (!userId || !tier) {
    console.error('Missing metadata in legacy subscription checkout session');
    return;
  }

  const subscriptionId  = session.subscription as string;
  const subscription    = await getStripe().subscriptions.retrieve(subscriptionId);
  const interviewsToGrant = 11;

  // Atomic credit grant — the UNIQUE constraint on stripe_checkout_session_id
  // added in migration 20250307 covers legacy checkouts that have no payment_intent_id.
  const { data: granted, error: rpcError } = await getSupabaseAdmin()
    .rpc('grant_interview_credits', {
      p_user_id:                    userId,
      p_interviews:                 interviewsToGrant,
      p_product_type:               'pro_11',
      p_amount_cents:               3500,
      p_stripe_payment_intent_id:   null,
      p_stripe_checkout_session_id: session.id,
    });

  if (rpcError) {
    console.error('grant_interview_credits RPC error (legacy):', rpcError);
    throw rpcError;
  }

  // Update Stripe-specific subscription fields — these are idempotent writes
  // that do not affect billing, so run them regardless of whether the grant
  // was new or a duplicate event.
  const { error: stripeFieldsError } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      stripe_customer_id:       session.customer as string,
      stripe_subscription_id:   subscriptionId,
      subscription_period_end:  new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);

  if (stripeFieldsError) {
    // Non-fatal — credits were already granted (or already existed) above.
    console.error('Error updating Stripe subscription fields (legacy):', stripeFieldsError);
  }

  if (granted) {
    console.log(`Legacy subscription converted: granted ${interviewsToGrant} interviews to user ${userId}`);
  } else {
    console.log(`Legacy subscription checkout already processed (idempotent): ${session.id}`);
  }
}

async function handleLegacySubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id, purchased_interviews')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    console.error('Could not find user for legacy subscription update');
    return;
  }

  let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active';
  if (subscription.status === 'past_due') status = 'past_due';
  else if (subscription.status === 'canceled') status = 'canceled';
  else if (subscription.status === 'trialing') status = 'trialing';

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier:        'pro',
      subscription_status:      status,
      stripe_subscription_id:   subscription.id,
      subscription_period_end:  new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating legacy subscription:', error);
    throw error;
  }
}

async function handleLegacySubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    console.error('Could not find user for legacy subscription cancellation');
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status:      'canceled',
      stripe_subscription_id:   null,
      subscription_period_end:  null,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error canceling legacy subscription:', error);
    throw error;
  }

  console.log(`Legacy subscription canceled for user ${profile.id}, credits retained`);
}

async function handleLegacyPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) return;

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating after failed payment:', error);
  }

  console.warn(`Legacy payment failed for user ${profile.id}`);
}
