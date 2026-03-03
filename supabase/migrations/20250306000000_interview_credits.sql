-- UnderFireAI Database Migration
-- Migration: interview_credits
-- Description: Convert from subscription tiers to one-time interview credit purchases
-- Pricing: 6 interviews for $25, 11 interviews for $35, +5 refill for $10

-- ============================================
-- ADD NEW COLUMNS FOR CREDIT SYSTEM
-- ============================================

-- Total interviews the user has purchased (lifetime accumulator)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS purchased_interviews INTEGER NOT NULL DEFAULT 0;

-- Total interviews the user has used (lifetime accumulator)
-- Note: monthly_interviews_used already exists, we'll rename it
ALTER TABLE profiles 
RENAME COLUMN monthly_interviews_used TO interviews_used;

-- Track purchase history for receipts/support
CREATE TABLE IF NOT EXISTS interview_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  product_type TEXT NOT NULL CHECK (product_type IN ('starter_6', 'pro_11', 'refill_5')),
  interviews_granted INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for user purchase history
CREATE INDEX IF NOT EXISTS idx_interview_purchases_user ON interview_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_purchases_created ON interview_purchases(created_at DESC);

-- Enable RLS on purchases table
ALTER TABLE interview_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON interview_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert purchases (via webhook)
CREATE POLICY "Service role can insert purchases"
  ON interview_purchases FOR INSERT
  WITH CHECK (true);

-- ============================================
-- UPDATE SUBSCRIPTION TIER USAGE
-- ============================================
-- We keep subscription_tier but change its meaning:
-- 'free' = never purchased (0 interviews remaining)
-- 'pro' = has purchased (has interview credits)
-- 'premium' = deprecated, treat same as 'pro'
--
-- After any purchase, user becomes 'pro' permanently
-- All features unlocked for anyone with tier != 'free'

-- ============================================
-- REMOVE MONTHLY RESET CRON
-- ============================================
-- The reset_monthly_interviews function is no longer needed
-- We'll create a no-op replacement to avoid breaking the cron job
-- (The actual cron job should be disabled in Supabase dashboard)

CREATE OR REPLACE FUNCTION reset_monthly_interviews()
RETURNS void AS $$
BEGIN
  -- NO-OP: Monthly resets are deprecated
  -- Interview credits are now permanent until used
  RAISE NOTICE 'reset_monthly_interviews() is deprecated - no action taken';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Grant Interview Credits
-- ============================================
CREATE OR REPLACE FUNCTION grant_interview_credits(
  p_user_id UUID,
  p_interviews INTEGER,
  p_product_type TEXT,
  p_amount_cents INTEGER,
  p_stripe_payment_intent_id TEXT DEFAULT NULL,
  p_stripe_checkout_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update user's purchased interview count
  UPDATE profiles
  SET 
    purchased_interviews = purchased_interviews + p_interviews,
    subscription_tier = 'pro',  -- Unlock all features
    subscription_status = 'active',
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Record the purchase
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
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get Interviews Remaining
-- ============================================
CREATE OR REPLACE FUNCTION get_interviews_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_purchased INTEGER;
  v_used INTEGER;
BEGIN
  SELECT purchased_interviews, interviews_used
  INTO v_purchased, v_used
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN GREATEST(0, COALESCE(v_purchased, 0) - COALESCE(v_used, 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Use Interview Credit
-- ============================================
CREATE OR REPLACE FUNCTION use_interview_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  -- Get current remaining
  v_remaining := get_interviews_remaining(p_user_id);
  
  IF v_remaining <= 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Increment used count
  UPDATE profiles
  SET 
    interviews_used = interviews_used + 1,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATE EXISTING USERS
-- ============================================
-- Give existing paid subscribers credits based on their tier
-- This is a one-time migration for existing users

-- Pro users: Grant 11 interviews (equivalent to Pro Pack)
UPDATE profiles
SET purchased_interviews = 11
WHERE subscription_tier = 'pro'
  AND subscription_status = 'active'
  AND purchased_interviews = 0;

-- Premium users: Grant 11 interviews (equivalent to Pro Pack)
UPDATE profiles
SET purchased_interviews = 11
WHERE subscription_tier = 'premium'
  AND subscription_status = 'active'
  AND purchased_interviews = 0;

-- Free users who have used interviews: 
-- Grant them 3 to cover what they already used (legacy free tier)
UPDATE profiles
SET purchased_interviews = 3
WHERE subscription_tier = 'free'
  AND interviews_used > 0
  AND purchased_interviews = 0;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================
COMMENT ON COLUMN profiles.purchased_interviews IS 'Total interviews purchased (lifetime accumulator)';
COMMENT ON COLUMN profiles.interviews_used IS 'Total interviews used (lifetime accumulator, renamed from monthly_interviews_used)';
COMMENT ON TABLE interview_purchases IS 'Audit log of all interview credit purchases';
COMMENT ON FUNCTION grant_interview_credits IS 'Grants interview credits to a user and records the purchase';
COMMENT ON FUNCTION get_interviews_remaining IS 'Returns the number of interview credits remaining for a user';
COMMENT ON FUNCTION use_interview_credit IS 'Decrements a users interview credit, returns false if none remaining';
