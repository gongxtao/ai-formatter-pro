import { NextRequest } from 'next/server';
import { buildChatMessagesWithTemplate } from '@/lib/ai/prompt-builder';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import { createSSEStream, sendSSEContent, sendSSEError, sendSSEStatus } from '@/lib/ai/sse-helper';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, message, contextHtml, model, category, templateId } = body;

    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: 'conversationId and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load conversation history from Supabase
    const supabase = createServerSupabaseClient();
    const { data: dbMessages, error: historyError } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50);

    if (historyError) {
      console.error('Failed to load message history:', historyError);
      // Continue without history
    }

    const history = (dbMessages ?? []).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Load template HTML if templateId provided
    let templateHtml: string | undefined;

    if (templateId) {
      try {
        const templateRes = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates?id=${templateId}`
        );
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          templateHtml = templateData.html;
        }
      } catch (e) {
        console.error('Failed to load template:', e);
      }
    }

    // Persist user message
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: message,
      content_type: 'text',
      metadata: { category },
    });

    const { controller, stream } = createSSEStream();

    // Start streaming in background
    (async () => {
      try {
        const startTime = Date.now();

        sendSSEStatus(controller!, 'Thinking...', 10);

        const { model: selectedModel, messages } = buildChatMessagesWithTemplate({
          category,
          templateHtml,
          contextHtml,
          history,
          userMessage: message,
          model,
        });

        sendSSEStatus(controller!, 'Generating response...', 30);

        const generator = await streamChatCompletion({ model: selectedModel, messages });

        let accumulated = '';
        let chunkCount = 0;

        for await (const chunk of generator) {
          if (chunk.type === 'delta') {
            accumulated += chunk.data;
            chunkCount++;
            sendSSEContent(controller!, chunk.data);
          } else if (chunk.type === 'error') {
            sendSSEError(controller!, chunk.data);
            controller!.close();
            return;
          }
        }

        const duration = Date.now() - startTime;

        // Persist assistant message
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: accumulated,
          content_type: 'text',
          metadata: { stream_duration_ms: duration, category },
          duration_ms: duration,
          model: selectedModel,
        });

        // Send completion
        const encoder = new TextEncoder();
        controller!.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', data: '', percentage: 100 })}\n\n`,
          ),
        );
        controller!.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Chat failed';
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
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
