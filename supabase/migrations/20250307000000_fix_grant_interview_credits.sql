-- =============================================================================
-- Fix grant_interview_credits to eliminate the race condition between
-- checkout.session.completed and payment_intent.succeeded Stripe events.
--
-- ROOT CAUSE: The original function did:
--   1. UPDATE profiles SET purchased_interviews = read_value + count  (non-atomic)
--   2. INSERT interview_purchases ...
--
-- If two events raced past the SELECT-based idempotency check before either
-- wrote, both would read the same stale profile value and overwrite each other's
-- update — netting one credit grant instead of two, or two grants for one payment.
--
-- FIX: INSERT into interview_purchases FIRST using ON CONFLICT DO NOTHING.
--   - Only the event that wins the INSERT proceeds to update the profile.
--   - The losing event sees 0 rows inserted and returns FALSE immediately.
--   - The profile UPDATE uses the column-level increment expression
--     (purchased_interviews + p_interviews) which is evaluated atomically
--     by Postgres — no read required.
-- =============================================================================

-- Step 1: Clean up any duplicate checkout session rows created by the race
-- condition this migration fixes. Keep the oldest row per session ID.
DELETE FROM interview_purchases a
  USING interview_purchases b
WHERE a.stripe_checkout_session_id IS NOT NULL
  AND a.stripe_checkout_session_id = b.stripe_checkout_session_id
  AND a.created_at > b.created_at;

-- Step 2: Add a UNIQUE constraint on stripe_checkout_session_id so that
-- legacy subscription checkouts (which have no payment_intent_id) are also
-- protected by the ON CONFLICT guard. Use a partial unique index so that
-- multiple NULL values are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_interview_purchases_checkout_session_unique
  ON interview_purchases (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Step 3: DROP the existing function first — Postgres does not allow
-- CREATE OR REPLACE to change a function's return type (void → boolean).
DROP FUNCTION IF EXISTS grant_interview_credits(UUID, INTEGER, TEXT, INTEGER, TEXT, TEXT);

-- Step 4: Recreate with the INSERT-first pattern.
-- Returns TRUE  → credits were granted (new purchase).
-- Returns FALSE → already processed (idempotent no-op).
CREATE OR REPLACE FUNCTION grant_interview_credits(
  p_user_id                    UUID,
  p_interviews                 INTEGER,
  p_product_type               TEXT,
  p_amount_cents               INTEGER,
  p_stripe_payment_intent_id   TEXT DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rows_inserted INTEGER;
BEGIN
  -- INSERT the purchase record first. ON CONFLICT DO NOTHING means that if
  -- another concurrent event already inserted a row with the same
  -- stripe_payment_intent_id OR stripe_checkout_session_id, this INSERT is
  -- silently skipped (0 rows inserted) and we return FALSE without touching
  -- the profile — preventing any double-grant.
  INSERT INTO interview_purchases (
    user_id,
    stripe_payment_intent_id,
    stripe_checkout_session_id,
    product_type,
    interviews_granted,
    amount_cents,
    status
  ) VALUES (
    p_user_id,
    p_stripe_payment_intent_id,
    p_stripe_checkout_session_id,
    p_product_type,
    p_interviews,
    p_amount_cents,
    'completed'
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Nothing inserted → already processed by another event. Bail out.
  IF v_rows_inserted = 0 THEN
    RETURN FALSE;
  END IF;

  -- The INSERT succeeded — this event owns the grant. Atomically increment
  -- purchased_interviews directly in SQL so no read is needed and no
  -- concurrent update can interfere.
  UPDATE profiles
  SET
    purchased_interviews = purchased_interviews + p_interviews,
    subscription_tier    = 'pro',
    subscription_status  = 'active',
    updated_at           = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$;
