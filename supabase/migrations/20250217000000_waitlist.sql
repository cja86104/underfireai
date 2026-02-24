-- Waitlist table for pre-launch signups
-- Accessed exclusively via the waitlist-signup Edge Function using service role key

CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing_page',
  referrer TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint on email (produces error code 23505 on duplicate insert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);

-- Index for chronological listing
CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist(created_at DESC);

-- Enable RLS to block direct anonymous access (Edge Function uses service role, which bypasses RLS)
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RPC function to get total waitlist count
-- Called by the waitlist-signup Edge Function via supabase.rpc('get_waitlist_count')
CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM waitlist);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
