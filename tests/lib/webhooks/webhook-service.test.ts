import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for the RLS/client-mismatch bug found while walking
 * underfireai-audit-checklist-v1.md Section 4 (Database schema audit,
 * "webhook_deliveries has no INSERT/UPDATE/DELETE policies for users — only
 * the service side writes. Verify admin client is used for all mutations.").
 *
 * webhook_deliveries only grants a SELECT policy to authenticated users
 * (migration 20250228000000_webhooks.sql). createDeliveryRecord and
 * updateDeliveryRecord in lib/webhooks/webhook-service.ts were using the
 * regular cookie-scoped createClient() (RLS-enforced as 'authenticated')
 * instead of createAdminClient() (service_role, bypasses RLS) for their
 * INSERT/UPDATE. Every insert was therefore silently rejected by RLS,
 * createDeliveryRecord always returned null, and deliverWebhook() — the
 * actual outbound HTTP POST to the user's configured URL — was never
 * reached, for both real session-completed events and the manual
 * "Send test webhook" button. This test asserts the write path goes
 * through the admin client and that a webhook send actually succeeds.
 */

const calls: {
  client: 'regular' | 'admin';
  table: string;
  op: 'insert' | 'update' | 'select';
  payload?: Record<string, unknown>;
}[] = [];

interface Row {
  id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  enabled: boolean;
}

const webhookRow: Row = {
  id: 'webhook-1',
  user_id: 'user-1',
  name: 'Test webhook',
  url: 'https://example.com/hook',
  secret: null,
  events: ['session.completed'],
  enabled: true,
};

function makeClient(clientTag: 'regular' | 'admin') {
  return {
    from(table: string) {
      const builder = {
        select: () => builder,
        eq: () => builder,
        insert: (payload: Record<string, unknown>) => {
          calls.push({ client: clientTag, table, op: 'insert', payload });
          return builder;
        },
        update: (payload: Record<string, unknown>) => {
          calls.push({ client: clientTag, table, op: 'update', payload });
          return builder;
        },
        single: () => {
          if (table === 'webhooks') {
            calls.push({ client: clientTag, table, op: 'select' });
            return Promise.resolve({ data: webhookRow, error: null });
          }
          if (table === 'webhook_deliveries') {
            return Promise.resolve({ data: { id: 'delivery-1' }, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
        then: (resolve: (value: { data: unknown; error: unknown }) => void) => {
          resolve({ data: null, error: null });
        },
      };
      return builder;
    },
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => makeClient('regular'),
  createAdminClient: () => makeClient('admin'),
}));

const { sendTestWebhook } = await import('@/lib/webhooks/webhook-service');

describe('sendTestWebhook — webhook_deliveries RLS/client fix', () => {
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '',
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('writes webhook_deliveries through the admin client, not the RLS-scoped client', async () => {
    await sendTestWebhook(webhookRow.id, webhookRow.user_id);

    const deliveryWrites = calls.filter((c) => c.table === 'webhook_deliveries');
    expect(deliveryWrites.length).toBeGreaterThan(0);
    expect(deliveryWrites.every((c) => c.client === 'admin')).toBe(true);

    // The webhooks table lookup itself is fine on the regular RLS-scoped
    // client (the owner-scoped SELECT policy allows it).
    const webhookReads = calls.filter((c) => c.table === 'webhooks');
    expect(webhookReads.every((c) => c.client === 'regular')).toBe(true);
  });

  it('actually delivers the webhook (previously always failed at "Failed to create delivery record")', async () => {
    const result = await sendTestWebhook(webhookRow.id, webhookRow.user_id);

    expect(result.success).toBe(true);
    expect(result.error).not.toBe('Failed to create delivery record');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(webhookRow.url, expect.any(Object));
  });
});
