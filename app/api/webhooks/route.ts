/**
 * UnderFireAI - Webhook Management API
 *
 * CRUD operations for user webhook configurations.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100).default('Default Webhook'),
  url: z.string().url().refine(
    (url) => url.startsWith('https://') || url.startsWith('http://localhost'),
    'URL must use HTTPS (except localhost for testing)'
  ),
  secret: z.string().min(16).max(256).optional(),
  events: z.array(z.enum(['session.completed'])).default(['session.completed']),
  enabled: z.boolean().default(true),
});

/**
 * GET /api/webhooks - List all webhooks for the current user
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    const { data: webhooks, error } = await supabase
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
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching webhooks:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to fetch webhooks' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      webhooks: webhooks ?? [],
      count: webhooks?.length ?? 0,
    });
  } catch (error) {
    console.error('Error in GET /api/webhooks:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/webhooks - Create a new webhook
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const validation = createWebhookSchema.safeParse(body);

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

    const { name, url, secret, events, enabled } = validation.data;

    const supabase = await createClient();

    // Check webhook limit (max 5 per user)
    const { count } = await supabase
      .from('webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        {
          error: 'Limit exceeded',
          message: 'Maximum 5 webhooks allowed per user',
        },
        { status: 400 }
      );
    }

    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhooks')
      .insert({
        user_id: user.id,
        name,
        url,
        secret: secret ?? null,
        events,
        enabled,
      })
      .select(`
        id,
        name,
        url,
        events,
        enabled,
        created_at
      `)
      .single();

    if (error) {
      console.error('Error creating webhook:', error);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to create webhook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      webhook,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/webhooks:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
