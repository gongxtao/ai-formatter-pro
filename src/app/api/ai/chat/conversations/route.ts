import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { getDefaultModel } from '@/lib/ai/llm-client';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, title, model, userId } = body;

    // Generate anonymous user ID if not provided (database requires non-null user_id)
    // Use Web Crypto API (available in edge runtime)
    // Note: user_id column is UUID type, so no prefix allowed
    const effectiveUserId = userId ?? crypto.randomUUID();

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: effectiveUserId,
        category: category ?? null,
        title: title ?? 'New Conversation',
        model: model ?? getDefaultModel(),

      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
