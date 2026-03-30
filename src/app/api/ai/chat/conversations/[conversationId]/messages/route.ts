import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getEffectiveUserId } from '@/lib/db/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;

    const supabase = createServerSupabaseClient();

    // Verify user owns this conversation
    const userId = request.headers.get('x-user-id');
    if (userId) {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('user_id')
        .eq('id', conversationId)
        .single();
      if (conv && conv.user_id && conv.user_id !== getEffectiveUserId(userId)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
