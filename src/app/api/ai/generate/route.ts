import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import {
  createSSEStream,
  sendSSEStatus,
  sendSSEEvent,
  sendSSEError,
} from '@/lib/ai/sse-helper';
import { DEFAULT_MODEL } from '@/config/ai-models';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, prompt, topic, industry, model } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const { controller, stream } = createSSEStream();

    // Start async processing
    (async () => {
      try {
        sendSSEStatus(controller!, 'Analyzing your request...', 5);

        // Step 1: Classify intent
        const intentResult = await classifyIntent(prompt, category);

        if (!intentResult.readyToGenerate) {
          // Need clarification - create conversation and return
          const conversationId = await createConversation(
            intentResult.category || category
          );

          sendSSEEvent(controller!, {
            type: 'clarification_needed',
            conversationId,
            data: intentResult.suggestedQuestion || 'What type of document would you like to create?',
            message: intentResult.suggestedQuestion || 'What type of document would you like to create?',
            quickReplies: intentResult.quickReplies || [
              'Resume',
              'Cover Letter',
              'Report',
              'Business Plan',
            ],
            sessionId: conversationId, // For backward compatibility
          });
          controller!.close();
          return;
        }

        // Ready to generate - match template
        sendSSEStatus(controller!, 'Matching template...', 20);

        const finalCategory = intentResult.category || category || 'document';
        const templateMatch = await matchTemplate(finalCategory, prompt);

        sendSSEStatus(controller!, 'Preparing to generate...', 30);

        // Create conversation
        const conversationId = await createConversation(finalCategory);

        // Save user message
        await saveUserMessage(conversationId, prompt, finalCategory);

        // Return ready_to_generate event
        sendSSEEvent(controller!, {
          type: 'ready_to_generate',
          conversationId,
          category: finalCategory,
          templateId: templateMatch?.template?.id,
          data: '', // Required by StreamEvent type
        });
        controller!.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        sendSSEError(controller!, message);
        controller!.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * Create a new conversation in Supabase
 */
async function createConversation(category?: string | null): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: null, // Anonymous users for now
      category: category || null,
      title: 'New Document',
      model: DEFAULT_MODEL,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create conversation:', error);
    throw new Error('Failed to create conversation');
  }

  return data.id;
}

/**
 * Save user message to Supabase
 */
async function saveUserMessage(
  conversationId: string,
  content: string,
  category?: string | null
): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { error } = await supabase.from('ai_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content,
    content_type: 'text',
    metadata: { category, topic: null, industry: null },
  });

  if (error) {
    console.error('Failed to save user message:', error);
    // Don't throw - this is not critical
  }
}

/**
 * Call template matching API
 */
async function matchTemplate(category: string, userPrompt: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/templates/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, userPrompt }),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error('Template matching failed:', error);
    return null;
  }
}
