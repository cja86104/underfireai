/**
 * UnderFireAI - Webhook Test API
 *
 * Send a test webhook to verify configuration.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { sendTestWebhook } from '@/lib/webhooks';

interface RouteParams {
  params: Promise<{ webhookId: string }>;
}

/**
 * POST /api/webhooks/[webhookId]/test - Send a test webhook
 */
export async function POST(
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

    const result = await sendTestWebhook(webhookId, user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Test webhook delivered successfully',
        statusCode: result.statusCode,
        deliveryId: result.deliveryId,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Test webhook delivery failed',
        error: result.error,
        statusCode: result.statusCode,
        deliveryId: result.deliveryId,
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/webhooks/[webhookId]/test:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Failed to send test webhook' },
      { status: 500 }
    );
  }
}
