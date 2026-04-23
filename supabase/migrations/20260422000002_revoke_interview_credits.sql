-- =============================================================================
-- Define revoke_interview_credits RPC used by the Stripe webhook on refund.
--
-- Called from app/api/stripe/webhook/route.ts when a `charge.refunded` event
-- fires for a one-time purchase payment intent. Atomically:
--   1. Transitions the matching interview_purchases row from 'completed' to
--      'refunded'. The status filter makes the RPC idempotent — repeated
--      charge.refunded events (e.g. a lost-dispute follow-up after an earlier
--      manual refund) hit 0 rows on the second call and exit FALSE.
--   2. Decrements profiles.purchased_interviews by the granted amount, clamped
--      at 0 so a user who was already at 0 remaining does not go negative.
--
-- Contract:
--   - Returns TRUE  if the purchase was transitioned to refunded AND the
--     profile was decremented.
--   - Returns FALSE if no 'completed' purchase exists for that payment intent
--     (already refunded, or never granted). This is a safe no-op — the caller
--     should log and acknowledge the webhook.
--
-- Scope:
--   Only one-time purchases (which carry a non-null stripe_payment_intent_id).
--   Legacy subscription purchases have stripe_payment_intent_id = NULL and are
--   therefore not touched by this RPC; by design, legacy subscription refunds
--   preserve credits (see handleLegacySubscriptionCanceled).
-- =============================================================================

CREATE OR REPLACE FUNCTION revoke_interview_credits(
  p_stripe_payment_intent_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_interviews   INTEGER;
  v_rows         INTEGER;
BEGIN
  -- Atomic status transition completed -> refunded with RETURNING.
  -- The status='completed' filter is the idempotency guard: a second refund
  -- event for the same payment intent finds status='refunded' and matches 0
  -- rows, so v_user_id / v_interviews stay NULL and we return FALSE.
  UPDATE interview_purchases
  SET status = 'refunded'
  WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
    AND status = 'completed'
  RETURNING user_id, interviews_granted
  INTO v_user_id, v_interviews;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN FALSE;
  END IF;

  -- Atomic column-level decrement. GREATEST clamps at 0 so the column never
  -- goes negative in the edge case where interviews_used already exceeded
  -- the granted count before the refund (e.g. a user who consumed all credits
  -- and then disputed — we do not refund their used sessions, but we do
  -- floor the purchased counter so remaining = max(0, purchased - used) = 0).
  UPDATE profiles
  SET
    purchased_interviews = GREATEST(0, purchased_interviews - v_interviews),
    updated_at           = NOW()
  WHERE id = v_user_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION revoke_interview_credits IS
  'Atomic refund path: marks interview_purchases row refunded and decrements profiles.purchased_interviews. Idempotent per payment intent. Called from Stripe charge.refunded webhook.';
