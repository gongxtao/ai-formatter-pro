import { NextRequest } from 'next/server';
import { buildGenerationMessages } from '@/lib/ai/prompt-builder';
import { streamChatCompletion } from '@/lib/ai/openrouter-client';
import { createSSEStream, sendSSEStatus, sendSSEContent, sendSSECompletion, sendSSEError } from '@/lib/ai/sse-helper';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, prompt, topic, industry, model } = body;

    if (!category || !prompt) {
      return new Response(JSON.stringify({ error: 'category and prompt are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { controller, stream } = createSSEStream();

    // Start generation in background
    (async () => {
      try {
        sendSSEStatus(controller!, 'Analyzing your request...', 10);

        const { model: selectedModel, messages } = buildGenerationMessages({
          category,
          prompt,
          topic,
          industry,
          model,
        });

        sendSSEStatus(controller!, 'Generating content...', 30);

        const generator = await streamChatCompletion({ model: selectedModel, messages });

        let accumulated = '';
        let chunkCount = 0;

        for await (const chunk of generator) {
          if (chunk.type === 'delta') {
            accumulated += chunk.data;
            chunkCount++;

            // Send periodic status updates
            if (chunkCount % 50 === 0) {
              const pct = Math.min(30 + Math.floor((chunkCount / 200) * 60), 90);
              sendSSEStatus(controller!, 'Generating content...', pct);
            }

            sendSSEContent(controller!, chunk.data);
          } else if (chunk.type === 'error') {
            sendSSEError(controller!, chunk.data);
            controller!.close();
            return;
          }
        }

        sendSSECompletion(controller!, accumulated);
        controller!.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Generation failed';
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
