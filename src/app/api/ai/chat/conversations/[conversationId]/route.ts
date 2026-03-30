import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getEffectiveUserId } from '@/lib/db/supabase-server';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = createServerSupabaseClient();

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Verify user ownership
    const userId = request.headers.get('x-user-id');
    if (userId && conversation.user_id && conversation.user_id !== getEffectiveUserId(userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get messages
    const { data: messages, error: msgError } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation,
      messages: messages || [],
    });
  } catch (error) {
    console.error('Failed to load conversation:', error);
    return NextResponse.json({ error: 'Failed to load conversation' }, { status: 500 });
  }
}
