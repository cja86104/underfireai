import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Use service role for webhook (bypasses RLS)
const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing signature' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier as 'pro' | 'premium';

  if (!userId || !tier) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const subscriptionId = session.subscription as string;

  // Fetch subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const { error } = await supabaseAdmin
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

  console.log(`User ${userId} upgraded to ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await supabaseAdmin
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

  const { error } = await supabaseAdmin
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

  console.log(`Updated subscription for user ${profile.id}: ${tier} (${status})`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    console.error('Could not find user for subscription cancellation');
    return;
  }

  const { error } = await supabaseAdmin
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

  console.log(`Canceled subscription for user ${profile.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    // Not necessarily an error - could be a one-time payment
    return;
  }

  // Reset monthly interview count on successful renewal
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'active',
      monthly_interviews_used: 0,
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating after payment:', error);
  }

  console.log(`Payment succeeded for user ${profile.id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by customer ID
  const { data: profile, error: findError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (findError || !profile) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'past_due',
    })
    .eq('id', profile.id);

  if (error) {
    console.error('Error updating after failed payment:', error);
  }

  console.log(`Payment failed for user ${profile.id}`);
}
