import { NextRequest } from 'next/server';
import { buildGenerationMessages } from '@/lib/ai/prompt-builder';
import { streamChatCompletion } from '@/lib/ai/openrouter-client';
import { createSSEStream, sendSSEStatus, sendSSEContent, sendSSECompletion, sendSSEError, sendSSEClarificationNeeded } from '@/lib/ai/sse-helper';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import { createSession } from '@/lib/ai/clarify-session-store';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, prompt, topic, industry, model } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If no category, try to classify intent first
    if (!category) {
      const classification = await classifyIntent(prompt);

      if (classification.needsClarification) {
        // Create a clarify session
        const session = createSession(prompt);

        const { controller, stream } = createSSEStream();

        // Send clarification_needed event
        sendSSEStatus(controller!, 'Analyzing your request...', 10);
        sendSSEClarificationNeeded(
          controller!,
          session.id,
          'What type of document would you like to create?',
          classification.possibleTypes || []
        );
        controller!.close();

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
      }

      // Use the classified type
      const classifiedCategory = classification.type || 'document';
      return generateWithCategory(classifiedCategory, prompt, topic, industry, model);
    }

    // Category provided, proceed directly
    return generateWithCategory(category, prompt, topic, industry, model);

  } catch (error) {
    console.error('Generate API error:', error);
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function generateWithCategory(
  category: string,
  prompt: string,
  topic?: string,
  industry?: string,
  model?: string
) {
  const { controller, stream } = createSSEStream();

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
}
