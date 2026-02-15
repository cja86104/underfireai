import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
): Promise<NextResponse> {
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

    // Verify session belongs to user and is in progress
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

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Invalid state', message: 'Can only pause an active interview' },
        { status: 400 }
      );
    }

    // Update session status to paused
    const { error: updateError } = await supabase
      .from('interview_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error pausing session:', updateError);
      return NextResponse.json(
        { error: 'Database error', message: 'Failed to pause interview' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Interview paused',
    });

  } catch (error) {
    console.error('Error pausing interview:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
