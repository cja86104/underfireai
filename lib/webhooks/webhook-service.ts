/**
 * UnderFireAI - Webhook Service
 *
 * Handles outbound webhook notifications for session events.
 * Features:
 * - HMAC signature for payload verification
 * - Exponential backoff retry
 * - Async delivery (non-blocking)
 * - Delivery logging for debugging
 */

import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/types/database';
import crypto from 'crypto';

// ===========================================
// TYPES
// ===========================================

export interface WebhookConfig {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  enabled: boolean;
}

export interface SessionCompletedPayload {
  event: 'session.completed';
  timestamp: string;
  data: {
    session_id: string;
    user_id: string;
    interview_type: string;
    target_role: string | null;
    target_company: string | null;
    difficulty: number;
    duration_seconds: number | null;
    started_at: string;
    ended_at: string | null;
    scores: {
      overall_score: number;
      clarity_score: number;
      confidence_score: number;
      technical_depth: number;
      star_usage_score: number;
      communication_score: number;
    };
    feedback: {
      strengths: string[];
      improvements: string[];
      ai_feedback: string;
      interviewer_impression: string;
    };
    coding?: {
      challenge_id: string | null;
      language: string | null;
      passed_tests: number;
      total_tests: number;
      correctness: number;
    };
  };
}

export type WebhookPayload = SessionCompletedPayload;

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  deliveryId?: string;
}

// ===========================================
// CONFIGURATION
// ===========================================

const WEBHOOK_CONFIG = {
  /** Request timeout in milliseconds */
  timeoutMs: 10000,
  /** Maximum retry attempts */
  maxRetries: 3,
  /** Base delay for exponential backoff */
  baseDelayMs: 1000,
  /** Maximum delay cap */
  maxDelayMs: 30000,
  /** User agent for webhook requests */
  userAgent: 'UnderFireAI-Webhook/1.0',
};

// ===========================================
// SIGNATURE GENERATION
// ===========================================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateSignature(payload: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Verify webhook signature (for incoming webhooks from external services)
 */
export function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ===========================================
// WEBHOOK DELIVERY
// ===========================================

/**
 * Send a webhook with retry logic
 */
async function deliverWebhook(
  webhook: WebhookConfig,
  payload: WebhookPayload,
  deliveryId: string
): Promise<WebhookDeliveryResult> {
  const payloadString = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': WEBHOOK_CONFIG.userAgent,
    'X-UnderFireAI-Event': payload.event,
    'X-UnderFireAI-Delivery': deliveryId,
    'X-UnderFireAI-Timestamp': timestamp,
  };

  // Add signature if secret is configured
  if (webhook.secret) {
    const signaturePayload = `${timestamp}.${payloadString}`;
    headers['X-UnderFireAI-Signature'] = generateSignature(signaturePayload, webhook.secret);
  }

  let lastError: string | undefined;
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt < WEBHOOK_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        WEBHOOK_CONFIG.timeoutMs
      );

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      lastStatusCode = response.status;

      // Success: 2xx status codes
      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          deliveryId,
        };
      }

      // Non-retryable errors: 4xx (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        const responseText = await response.text().catch(() => '');
        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}: ${responseText.slice(0, 200)}`,
          deliveryId,
        };
      }

      // Retryable: 429 or 5xx
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          lastError = 'Request timeout';
        } else {
          lastError = error.message;
        }
      } else {
        lastError = 'Unknown error';
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < WEBHOOK_CONFIG.maxRetries - 1) {
      const delay = Math.min(
        WEBHOOK_CONFIG.baseDelayMs * Math.pow(2, attempt),
        WEBHOOK_CONFIG.maxDelayMs
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return {
    success: false,
    statusCode: lastStatusCode,
    error: lastError ?? 'Max retries exceeded',
    deliveryId,
  };
}

// ===========================================
// PUBLIC API
// ===========================================

/**
 * Get all enabled webhooks for a user that listen to a specific event
 */
export async function getWebhooksForEvent(
  userId: string,
  eventType: string
): Promise<WebhookConfig[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .contains('events', [eventType]);

  if (error) {
    console.error('Error fetching webhooks:', error);
    return [];
  }

  return (data ?? []) as WebhookConfig[];
}

/**
 * Create a webhook delivery record
 */
async function createDeliveryRecord(
  webhookId: string,
  eventType: string,
  payload: WebhookPayload
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload: payload as unknown as Json,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating delivery record:', error);
    return null;
  }

  return data.id;
}

/**
 * Update a webhook delivery record with result
 */
async function updateDeliveryRecord(
  deliveryId: string,
  result: WebhookDeliveryResult,
  attempts: number
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('webhook_deliveries')
    .update({
      attempts,
      status: result.success ? 'success' : 'failed',
      status_code: result.statusCode,
      error_message: result.error,
      ...(result.success ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq('id', deliveryId);
}

/**
 * Send webhook notification for session completion.
 *
 * Awaits every per-webhook delivery (each with its own retry budget inside
 * deliverWebhook) so the returned `sent` flag reflects whether at least one
 * delivery actually succeeded, not just that a request was dispatched.
 *
 * Callers that record `webhook_sent` on the session_scores row should gate on
 * `successCount > 0` — a `false` here means every configured endpoint failed
 * or no endpoints were configured.
 */
export async function sendSessionCompletedWebhook(
  sessionData: SessionCompletedPayload['data']
): Promise<{ sent: boolean; webhookCount: number; successCount: number; totalCount: number }> {
  const payload: SessionCompletedPayload = {
    event: 'session.completed',
    timestamp: new Date().toISOString(),
    data: sessionData,
  };

  try {
    // Get webhooks for this user
    const webhooks = await getWebhooksForEvent(
      sessionData.user_id,
      'session.completed'
    );

    if (webhooks.length === 0) {
      return { sent: false, webhookCount: 0, successCount: 0, totalCount: 0 };
    }

    // Send to all configured webhooks in parallel
    const deliveryPromises = webhooks.map(async (webhook) => {
      const deliveryId = await createDeliveryRecord(
        webhook.id,
        'session.completed',
        payload
      );

      if (!deliveryId) {
        return { success: false };
      }

      const result = await deliverWebhook(webhook, payload, deliveryId);
      await updateDeliveryRecord(deliveryId, result, WEBHOOK_CONFIG.maxRetries);

      return result;
    });

    // Await all deliveries so the return value reflects real outcomes. This
    // adds at most one webhook timeout window (10s × maxRetries with backoff)
    // to the end-of-session scoring response — acceptable because the caller
    // is the score route, not a hot critical path.
    const results = await Promise.allSettled(deliveryPromises);

    const successCount = results.reduce((count, r) => {
      return r.status === 'fulfilled' && r.value.success === true ? count + 1 : count;
    }, 0);

    return {
      sent: successCount > 0,
      webhookCount: webhooks.length,
      successCount,
      totalCount: webhooks.length,
    };
  } catch (error) {
    console.error('Error sending session completed webhook:', error);
    return { sent: false, webhookCount: 0, successCount: 0, totalCount: 0 };
  }
}

/**
 * Send a test webhook to verify configuration
 */
export async function sendTestWebhook(
  webhookId: string,
  userId: string
): Promise<WebhookDeliveryResult> {
  const supabase = await createClient();

  // Get webhook
  const { data: webhook, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .eq('user_id', userId)
    .single();

  if (error || !webhook) {
    return { success: false, error: 'Webhook not found' };
  }

  const testPayload: SessionCompletedPayload = {
    event: 'session.completed',
    timestamp: new Date().toISOString(),
    data: {
      session_id: 'test-session-id',
      user_id: userId,
      interview_type: 'behavioral',
      target_role: 'Software Engineer',
      target_company: 'Test Company',
      difficulty: 5,
      duration_seconds: 1800,
      started_at: new Date(Date.now() - 1800000).toISOString(),
      ended_at: new Date().toISOString(),
      scores: {
        overall_score: 75,
        clarity_score: 80,
        confidence_score: 70,
        technical_depth: 75,
        star_usage_score: 72,
        communication_score: 78,
      },
      feedback: {
        strengths: ['Clear communication', 'Good examples'],
        improvements: ['More specific metrics', 'Better time management'],
        ai_feedback: 'This is a test webhook delivery.',
        interviewer_impression: 'Test impression for webhook verification.',
      },
    },
  };

  const deliveryId = await createDeliveryRecord(
    webhook.id,
    'session.completed',
    testPayload
  );

  if (!deliveryId) {
    return { success: false, error: 'Failed to create delivery record' };
  }

  const result = await deliverWebhook(
    webhook as WebhookConfig,
    testPayload,
    deliveryId
  );

  await updateDeliveryRecord(deliveryId, result, 1);

  return result;
}
