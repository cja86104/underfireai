import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

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
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.warn(`Unhandled event type: ${event.type}`);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier as 'pro' | 'premium';

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const subscriptionId = session.subscription as string;

  // Fetch subscription details
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: 'active',
      stripe_subscription_id: subscriptionId,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      monthly_interviews_used: 0, // Reset on upgrade
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile after checkout:', error);
    throw error;
  }

  // User upgraded successfully
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    console.error('Could not find user for subscription update');
    return;
  }

  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id;
  let tier: 'free' | 'pro' | 'premium' = 'free';
  
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    tier = 'pro';
  } else if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) {
    tier = 'premium';
  }

  // Map Stripe status to our status
  let status: 'active' | 'canceled' | 'past_due' | 'trialing' = 'active';
  if (subscription.status === 'past_due') status = 'past_due';
  else if (subscription.status === 'canceled') status = 'canceled';
  else if (subscription.status === 'trialing') status = 'trialing';

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating subscription:', error);
    throw error;
  }

  // Subscription updated successfully
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    console.error('Could not find user for subscription cancellation');
    return;
  }

  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      subscription_period_end: null,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }

  // Subscription canceled successfully
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await getSupabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    // Not necessarily an error - could be a one-time payment
    return;
  }

  // Reset monthly interview count on successful renewal
  const { error } = await getSupabaseAdmin()
    .from('profiles')
    .update({
      subscription_status: 'active',
      monthly_interviews_used: 0,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating after payment:', error);
  }

  // Payment succeeded
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  // Find user by customer ID
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

  console.warn(`Payment failed for user ${profile.id}`);
}
