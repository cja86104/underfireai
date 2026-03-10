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
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return _stripe;
}

// Lazy initialization for Supabase admin client
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;
function getSupabaseAdmin(): ReturnType<typeof createClient<Database>> {
  if (!_supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase environment variables are not set');
    }
    _supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey);
  }
  return _supabaseAdmin;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      // ONE-TIME PAYMENT EVENTS (new credit system)
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // Only handle payment mode (one-time purchases)
        if (session.mode === 'payment') {
          await handlePaymentCompleted(session);
        }
        // Legacy: handle subscription mode for backwards compatibility
        else if (session.mode === 'subscription') {
          await handleLegacySubscriptionCheckout(session);
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }

      // LEGACY SUBSCRIPTION EVENTS (for existing subscribers during transition)
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
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ONE-TIME PAYMENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

async function handlePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  const product = session.metadata?.product as InterviewProduct | undefined;
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

  const interviewCount = parseInt(interviews, 10);
  const amount = amountCents ? parseInt(amountCents, 10) : INTERVIEW_PRODUCT_CONFIG[product].priceCents;

  // Check if this session has already been processed (idempotency)
  // Check BOTH ids: if payment_intent.succeeded fired first it will have inserted
  // a row with stripe_payment_intent_id but no stripe_checkout_session_id.
  // Checking only checkout_session_id would miss that and double-grant credits.
  const paymentIntentId = session.payment_intent as string | null;

  const { data: existingBySession } = await getSupabaseAdmin()
    .from('interview_purchases')
    .select('id')
    .eq('stripe_checkout_session_id', session.id)
    .single();

  if (existingBySession) {
    console.log('Checkout session already processed:', session.id);
    return;
  }

  if (paymentIntentId) {
    const { data: existingByIntent } = await getSupabaseAdmin()
      .from('interview_purchases')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .single();

    if (existingByIntent) {
      // payment_intent.succeeded already ran — update the row with the checkout session id
      // so future checks by either id both hit the same record, then stop
      await getSupabaseAdmin()
        .from('interview_purchases')
        .update({ stripe_checkout_session_id: session.id })
        .eq('id', existingByIntent.id);
      console.log('Checkout session already processed via payment intent:', paymentIntentId);
      return;
    }
  }

  // Get current purchased count
  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('purchased_interviews')
    .eq('id', userId)
    .single();

  const currentPurchased = profile?.purchased_interviews ?? 0;

  // Update profile with new credits
  const { error: profileError } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      purchased_interviews: currentPurchased + interviewCount,
      subscription_tier: 'pro',
      subscription_status: 'active',
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    throw profileError;
  }

  // Record the purchase
  const { error: purchaseError } = await getSupabaseAdmin()
    .from('interview_purchases')
    .insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntentId,
      stripe_checkout_session_id: session.id,
      product_type: product,
      interviews_granted: interviewCount,
      amount_cents: amount,
      status: 'completed',
    });

  if (purchaseError) {
    console.error('Error recording purchase:', purchaseError);
  }

  console.log(`Successfully granted ${interviewCount} interviews to user ${userId} for product ${product}`);
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const userId = paymentIntent.metadata?.user_id;
  const product = paymentIntent.metadata?.product as InterviewProduct | undefined;

  if (!userId || !product) {
    return;
  }

  // Check if already processed via checkout session
  const { data: existingPurchase } = await getSupabaseAdmin()
    .from('interview_purchases')
    .select('id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single();

  if (existingPurchase) {
    console.log('Payment intent already processed:', paymentIntent.id);
    return;
  }

  const interviews = paymentIntent.metadata?.interviews;
  const amountCents = paymentIntent.metadata?.amount_cents;

  if (!interviews) {
    console.error('Missing interviews in payment intent metadata');
    return;
  }

  const interviewCount = parseInt(interviews, 10);
  const amount = amountCents ? parseInt(amountCents, 10) : INTERVIEW_PRODUCT_CONFIG[product].priceCents;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('purchased_interviews')
    .eq('id', userId)
    .single();

  const currentPurchased = profile?.purchased_interviews ?? 0;

  const { error: profileError } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      purchased_interviews: currentPurchased + interviewCount,
      subscription_tier: 'pro',
      subscription_status: 'active',
    })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile:', profileError);
    throw profileError;
  }

  const { error: purchaseError } = await getSupabaseAdmin()
    .from('interview_purchases')
    .insert({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      product_type: product,
      interviews_granted: interviewCount,
      amount_cents: amount,
      status: 'completed',
    });

  if (purchaseError) {
    console.error('Error recording purchase:', purchaseError);
  }

  console.log(`Successfully granted ${interviewCount} interviews to user ${userId} via payment intent`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY SUBSCRIPTION HANDLERS (for backwards compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

async function handleLegacySubscriptionCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier as 'pro' | 'premium';

  if (!userId || !tier) {
    console.error('Missing metadata in legacy subscription checkout session');
    return;
  }

  const subscriptionId = session.subscription as string;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const interviewsToGrant = 11;

  const { data: profile } = await getSupabaseAdmin()
    .from('profiles')
    .select('purchased_interviews')
    .eq('id', userId)
    .single();

  const currentPurchased = profile?.purchased_interviews ?? 0;

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      purchased_interviews: currentPurchased + interviewsToGrant,
      subscription_tier: 'pro',
      subscription_status: 'active',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscriptionId,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile after legacy checkout:', error);
    throw error;
  }

  console.log(`Legacy subscription converted: granted ${interviewsToGrant} interviews to user ${userId}`);
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
      subscription_tier: 'pro',
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_period_end: null,
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

  if (findError || !profile) {
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating after failed payment:', error);
  }

  console.warn(`Legacy payment failed for user ${profile.id}`);
}
