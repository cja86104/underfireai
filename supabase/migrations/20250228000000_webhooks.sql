-- =============================================
-- UnderFireAI - Webhook Configuration
-- =============================================
-- Enables users to configure outbound webhooks for
-- session completion notifications (enterprise feature)

-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Webhook configuration
    name TEXT NOT NULL DEFAULT 'Default Webhook',
    url TEXT NOT NULL,
    secret TEXT, -- For HMAC signature verification

    -- Event filters
    events TEXT[] NOT NULL DEFAULT ARRAY['session.completed'],

    -- Status
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ,
    last_status_code INTEGER,
    failure_count INTEGER NOT NULL DEFAULT 0,

    -- Constraints
    CONSTRAINT valid_url CHECK (url ~ '^https?://')
);

-- Function to enforce max 5 webhooks per user
CREATE OR REPLACE FUNCTION check_max_webhooks_per_user()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM webhooks WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Maximum of 5 webhooks per user allowed';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce webhook limit on insert
CREATE TRIGGER enforce_max_webhooks
    BEFORE INSERT ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION check_max_webhooks_per_user();

-- Webhook delivery log for debugging and retry
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,

    -- Response details
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX idx_webhooks_user_id ON webhooks(user_id);
CREATE INDEX idx_webhooks_enabled ON webhooks(enabled) WHERE enabled = true;
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';

-- Enable RLS
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhooks
CREATE POLICY "Users can view their own webhooks"
    ON webhooks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks"
    ON webhooks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks"
    ON webhooks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks"
    ON webhooks FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for webhook_deliveries
CREATE POLICY "Users can view deliveries for their webhooks"
    ON webhook_deliveries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM webhooks w
            WHERE w.id = webhook_deliveries.webhook_id
            AND w.user_id = auth.uid()
        )
    );

-- Function to update webhook stats after delivery
CREATE OR REPLACE FUNCTION update_webhook_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'success' THEN
        UPDATE webhooks
        SET
            last_triggered_at = NEW.delivered_at,
            last_status_code = NEW.status_code,
            failure_count = 0,
            updated_at = NOW()
        WHERE id = NEW.webhook_id;
    ELSIF NEW.status = 'failed' THEN
        UPDATE webhooks
        SET
            last_triggered_at = NOW(),
            last_status_code = NEW.status_code,
            failure_count = failure_count + 1,
            updated_at = NOW()
        WHERE id = NEW.webhook_id;

        -- Auto-disable webhook after 10 consecutive failures
        UPDATE webhooks
        SET enabled = false
        WHERE id = NEW.webhook_id AND failure_count >= 10;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER webhook_delivery_stats
    AFTER UPDATE OF status ON webhook_deliveries
    FOR EACH ROW
    WHEN (NEW.status IN ('success', 'failed'))
    EXECUTE FUNCTION update_webhook_stats();

-- Add webhook_metadata to session_scores for tracking
ALTER TABLE session_scores
ADD COLUMN IF NOT EXISTS webhook_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS webhook_sent_at TIMESTAMPTZ;
