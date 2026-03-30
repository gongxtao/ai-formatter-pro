import { NextRequest, NextResponse } from 'next/server';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import {
  createSSEStream,
  sendSSEStatus,
  sendSSEEvent,
  sendSSEError,
} from '@/lib/ai/sse-helper';
import {
  createConversation,
  saveMessage,
  matchTemplate,
  getCategoryDisplayName,
} from '@/lib/ai/conversation-helper';
import { applyRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = applyRateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse as any;

  try {
    const body = await request.json();
    const { category, prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Input length validation
    if (prompt.length > 5000) {
      return NextResponse.json({ error: 'Prompt too long (max 5000 characters)' }, { status: 400 });
    }

    const { controller, stream } = createSSEStream();

    // Start async processing
    (async () => {
      try {
        sendSSEStatus(controller!, 'Analyzing your request...', 5);

        // Step 1: Classify intent
        const intentResult = await classifyIntent(prompt, category);

        if (!intentResult.readyToGenerate) {
          // Need clarification - create conversation and save messages
          const conversationId = await createConversation(
            intentResult.category || category
          );

          // Save user message
          await saveMessage(conversationId, 'user', prompt, {
            category: intentResult.category || category,
          });

          // Save AI clarification message
          const aiMessage = intentResult.suggestedQuestion || 'What type of document would you like to create?';
          await saveMessage(conversationId, 'assistant', aiMessage, {
            quickReplies: intentResult.quickReplies || [
              'Resume',
              'Cover Letter',
              'Report',
              'Business Plan',
            ],
          });

          sendSSEEvent(controller!, {
            type: 'clarification_needed',
            conversationId,
            data: aiMessage,
            message: aiMessage,
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
        await saveMessage(conversationId, 'user', prompt, { category: finalCategory });

        // Save assistant confirmation message
        const aiContent = `好的，我将为你生成${getCategoryDisplayName(finalCategory)}文档。`;
        await saveMessage(conversationId, 'assistant', aiContent, { category: finalCategory });

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
