/**
 * UnderFireAI - Individual Webhook API
 *
 * GET, PATCH, DELETE operations for a specific webhook.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { z } from 'zod';

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().refine(
    (url) => url.startsWith('https://') || url.startsWith('http://localhost'),
    'URL must use HTTPS (except localhost for testing)'
  ).optional(),
  secret: z.string().min(16).max(256).nullable().optional(),
  events: z.array(z.enum(['session.completed'])).optional(),
  enabled: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ webhookId: string }>;
}

/**
 * GET /api/webhooks/[webhookId] - Get a specific webhook
 */
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { webhookId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select(`
        id,
        name,
        url,
        events,
        enabled,
        created_at,
        updated_at,
        last_triggered_at,
        last_status_code,
        failure_count
      `)
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single();

    if (error || !webhook) {
      return NextResponse.json(
        { error: 'Not found', message: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Get recent deliveries
    const { data: deliveries } = await supabase
      .from('webhook_deliveries')
      .select(`
        id,
        event_type,
        status,
        status_code,
        error_message,
        attempts,
        created_at,
        delivered_at
      `)
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      webhook,
      recentDeliveries: deliveries ?? [],
    });
  } catch (error) {
    console.error('Error in GET /api/webhooks/[webhookId]:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/webhooks/[webhookId] - Update a webhook
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { webhookId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const validation = updateWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          message: 'Invalid webhook configuration',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from('webhooks')
      .select('id')
      .eq('id', webhookId)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Not found', message: 'Webhook not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    const { name, url, secret, events, enabled } = validation.data;
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (secret !== undefined) updateData.secret = secret;
    if (events !== undefined) updateData.events = events;
    if (enabled !== undefined) {
      updateData.enabled = enabled;
      // Reset failure count when re-enabling
      if (enabled) {
        updateData.failure_count = 0;
      }
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', webhookId)
      .select(`
        id,
        name,
        url,
        events,
        enabled,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      console.error('Error updating webhook:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to update webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook,
    });
  } catch (error) {
    console.error('Error in PATCH /api/webhooks/[webhookId]:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/webhooks/[webhookId] - Delete a webhook
 */
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { webhookId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Delete webhook (cascade will delete deliveries)
    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting webhook:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to delete webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook deleted',
    });
  } catch (error) {
    console.error('Error in DELETE /api/webhooks/[webhookId]:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
