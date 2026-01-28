import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify session belongs to user and is paused
    const { data: session, error: sessionError } = await supabase
      .from('interview_sessions')
      .select('id, status')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Not found', message: 'Interview session not found' },
        { status: 404 }
      );
    }

    if (session.status !== 'paused') {
      return NextResponse.json(
        { error: 'Invalid state', message: 'Can only resume a paused interview' },
        { status: 400 }
      );
    }

    // Update session status to in_progress
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({ status: 'in_progress' })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error resuming session:', updateError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to resume interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interview resumed',
    });

  } catch (error) {
    console.error('Error resuming interview:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
