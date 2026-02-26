import { type NextRequest, NextResponse } from 'next/server';
import { createClient, getCurrentUser } from '@/lib/supabase/server';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ interviewerId: string }> }
): Promise<NextResponse> {
  try {
    const { interviewerId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify the interviewer belongs to this user (custom interviewers have user_id set)
    const { data: interviewer, error: fetchError } = await supabase
      .from('interviewers')
      .select('id, user_id, is_premium')
      .eq('id', interviewerId)
      .single();

    if (fetchError || !interviewer) {
      return NextResponse.json(
        { error: 'Interviewer not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of custom interviewers (those with user_id set)
    if (!interviewer.user_id) {
      return NextResponse.json(
        { error: 'Cannot delete system interviewers' },
        { status: 403 }
      );
    }

    // Verify ownership
    if (interviewer.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Not authorized to delete this interviewer' },
        { status: 403 }
      );
    }

    // Delete the interviewer
    const { error: deleteError } = await supabase
      .from('interviewers')
      .delete()
      .eq('id', interviewerId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete interviewer error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete interviewer' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete interviewer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
