import { type NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import type { Database, InterviewProduct } from '@/types/database';
import { INTERVIEW_PRODUCT_CONFIG } from '@/types/database';

// =============================================================================
// Supabase RPC nullable-arg convention (read this before "fixing" any `?? undefined`)
// =============================================================================
// Postgres functions declared with `<param> TEXT DEFAULT NULL` are surfaced in
// the generated TypeScript types as `?: string` — i.e. `string | undefined` —
// not `string | null`. That mirrors the wire contract: omitting the key tells
// supabase-js to leave the param unbound, and Postgres substitutes the
// declared DEFAULT (NULL).
//
// Consequence: where a Stripe object yields `string | null` (e.g.
// `session.payment_intent` is null on a one-time card-saved session), the
// idiomatic call is:
//
//     p_stripe_payment_intent_id: paymentIntentId ?? undefined
//
// Passing `null` directly fails the type check; coalescing to `undefined`
// removes the key from the JSON body and Postgres applies DEFAULT NULL. This
// is by design — do NOT "fix" it by changing the RPC signature, casting to
// any, or piping nulls through. Every `?? undefined` in this file follows
// this convention.
// =============================================================================

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
        }
        break;
      }
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        await handlePaymentIntentFailed(paymentIntent);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        await handleChargeRefunded(charge);
        break;
      }
      case 'charge.dispute.created': {
        const dispute = event.data.object;
        await handleChargeDisputeCreated(dispute);
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

// Source-of-truth guard: credit count always comes from INTERVIEW_PRODUCT_CONFIG,
// never from the webhook metadata value. Metadata is set by create-checkout on our
// own server and is effectively trusted today — but webhook payloads that pass
// signature verification are still "input from an external source," and trusting
// the integer inside them would make a single leaked signing secret (or a bug in
// checkout session construction) immediately cash-exchangeable. Reading from the
// product config makes the credit grant deterministic per product SKU and caps
// any theoretical tampered payload at the advertised pack size.
function resolveInterviewCount(
  product: InterviewProduct,
  metadataInterviews: string | undefined,
  context: string,
): number {
  const authoritative = INTERVIEW_PRODUCT_CONFIG[product].interviews;

  if (metadataInterviews !== undefined) {
    const parsed = parseInt(metadataInterviews, 10);
    if (Number.isFinite(parsed) && parsed !== authoritative) {
      // Not fatal: we grant the authoritative count anyway. The warning is a
      // tripwire so production logs surface any drift between the checkout
      // route (which sets metadata) and the product config (source of truth).
      console.warn(
        `[stripe:${context}] metadata.interviews=${parsed} disagrees with ` +
        `INTERVIEW_PRODUCT_CONFIG[${product}].interviews=${authoritative}. ` +
        `Granting ${authoritative} (config is authoritative).`,
      );
    }
  }

  return authoritative;
}

async function handlePaymentCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId    = session.metadata?.user_id;
  const product   = session.metadata?.product as InterviewProduct | undefined;
  const interviews = session.metadata?.interviews;

  if (!userId || !product) {
    console.error('Missing user_id or product in checkout session metadata:', { userId, product });
    return;
  }

  if (!INTERVIEW_PRODUCT_CONFIG[product]) {
    console.error('Unknown product in checkout session:', product);
    return;
  }

  const interviewCount = resolveInterviewCount(product, interviews, 'checkout.session.completed');
  // Use the Stripe-reported charged amount (post-discount) for audit accuracy.
  // Falls back to the advertised priceCents if amount_total is unexpectedly null.
  const amount = session.amount_total ?? INTERVIEW_PRODUCT_CONFIG[product].priceCents;
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
      p_stripe_payment_intent_id:   paymentIntentId ?? undefined,
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

  // Unknown product guard. Without this, the original code fell through to a
  // silent zero-credit grant (INTERVIEW_PRODUCT_CONFIG[product]?.priceCents ?? 0)
  // which would create a useless purchase row and no warning trail.
  if (!INTERVIEW_PRODUCT_CONFIG[product]) {
    console.error('Unknown product in payment intent metadata:', product);
    return;
  }

  const interviewCount = resolveInterviewCount(product, paymentIntent.metadata?.interviews, 'payment_intent.succeeded');
  const amount = paymentIntent.amount ?? INTERVIEW_PRODUCT_CONFIG[product].priceCents;

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
      p_stripe_checkout_session_id: undefined,
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

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  // One-time payments that fail never granted credits (grant runs on succeeded
  // only). This handler exists for observability — so failures surface in
  // Vercel logs instead of being invisible — and to give support a signal when
  // a user reports "I paid but got nothing."
  const userId    = paymentIntent.metadata?.user_id ?? 'unknown';
  const product   = paymentIntent.metadata?.product ?? 'unknown';
  const lastError = paymentIntent.last_payment_error;
  console.warn(
    `Payment intent failed: id=${paymentIntent.id} user=${userId} product=${product} ` +
    `code=${lastError?.code ?? 'unknown'} message=${lastError?.message ?? 'no message'}`,
  );
}

// =============================================================================
// REFUND + DISPUTE HANDLERS (one-time payments)
// =============================================================================

async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id ?? null;

  if (!paymentIntentId) {
    console.warn(`charge.refunded received without payment_intent: charge=${charge.id}`);
    return;
  }

  // Distinguish full from partial refunds. Stripe emits charge.refunded for both.
  // For partial refunds we log and retain credits — there is no proportional
  // policy defined (the product is discrete credit packs, not a metered
  // subscription), so a partial refund does not cleanly map to a credit delta.
  const fullRefund =
    charge.refunded === true ||
    (typeof charge.amount === 'number' &&
     typeof charge.amount_refunded === 'number' &&
     charge.amount_refunded >= charge.amount);

  if (!fullRefund) {
    console.warn(
      `Partial refund retained credits: charge=${charge.id} ` +
      `intent=${paymentIntentId} refunded=${charge.amount_refunded}/${charge.amount}. ` +
      `Manual credit adjustment may be required.`,
    );
    return;
  }

  const { data: revoked, error } = await getSupabaseAdmin()
    .rpc('revoke_interview_credits', { p_stripe_payment_intent_id: paymentIntentId });

  if (error) {
    console.error('revoke_interview_credits RPC error:', error);
    throw error;
  }

  if (revoked) {
    console.log(`Revoked interview credits for payment intent ${paymentIntentId} (charge ${charge.id})`);
  } else {
    // Either already refunded (idempotent replay) or a one-time payment that
    // was never granted (out-of-band charge, or legacy subscription — legacy
    // purchase rows have stripe_payment_intent_id = NULL and are intentionally
    // excluded from this path).
    console.log(`No completed purchase to revoke for payment intent ${paymentIntentId} (already refunded, unrecognized, or legacy sub)`);
  }
}

async function handleChargeDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
  // Log-only. A dispute-created event does not necessarily mean the charge is
  // refunded — the merchant may win. If the dispute is lost, Stripe emits
  // charge.refunded (with refunded=true) and handleChargeRefunded revokes
  // credits through the normal path. Surfacing the dispute here gives support
  // a signal to investigate before the outcome is final.
  const chargeId = typeof dispute.charge === 'string' ? dispute.charge : dispute.charge?.id ?? 'unknown';
  console.warn(
    `Stripe dispute created: id=${dispute.id} charge=${chargeId} ` +
    `reason=${dispute.reason} status=${dispute.status} amount=${dispute.amount}`,
  );
}
