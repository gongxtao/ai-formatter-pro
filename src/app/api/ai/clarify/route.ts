// src/app/api/ai/clarify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { classifyIntent } from '@/lib/ai/intent-classifier';
import {
  createSSEStream,
  sendSSEStatus,
  sendSSEEvent,
  sendSSEError,
} from '@/lib/ai/sse-helper';
import { getDefaultModel } from '@/lib/ai/llm-client';
import { applyRateLimit } from '@/lib/rate-limit';
import {
  saveMessage,
  matchTemplate,
  getCategoryDisplayName,
} from '@/lib/ai/conversation-helper';

export const runtime = 'edge';
export const maxDuration = 60;

const CLARIFY_SYSTEM_PROMPT = `You are a helpful document creation assistant helping users create documents.

Available document types: document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile

Rules:
1. Respond conversationally and helpfully in the same language as the user
2. If the user clearly wants a specific document type, confirm and say you'll help create it
3. If you need more information, ask clarifying questions
4. Keep responses concise and friendly

Examples:
User: "帮我生成一份简历" → "好的，我将为你生成一份简历。"
User: "I want a report" → "Sure, I'll create a report for you."
User: "Create a document" → "What type of document would you like? I can help with resumes, reports, proposals, and more."
User: "帮我写个东西" → "你想创建什么类型的文档？我可以帮你生成简历、报告、商业计划书等。"`;

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = applyRateLimit(request, { maxRequests: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { sessionId, conversationId, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // Input length validation
    if (message.length > 10000) {
      return NextResponse.json({ error: 'Message too long (max 10000 characters)' }, { status: 400 });
    }

    const { controller, stream } = createSSEStream();

    (async () => {
      const supabase = createServerSupabaseClient();
      const effectiveConvId = conversationId || sessionId;

      try {
        sendSSEStatus(controller!, 'Analyzing...', 10);

        // Load conversation history
        let historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        if (effectiveConvId) {
          const { data: dbMessages } = await supabase
            .from('ai_messages')
            .select('role, content')
            .eq('conversation_id', effectiveConvId)
            .order('created_at', { ascending: true })
            .limit(20);

          if (dbMessages) {
            historyMessages = dbMessages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            }));
          }

          // Save user message to database
          await saveMessage(effectiveConvId, 'user', message);
        }

        // Combine history with current message for intent classification
        const fullConversationText = historyMessages
          .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
          .join('\n') + `\n用户: ${message}`;

        // Classify intent with full context
        const intentResult = await classifyIntent(fullConversationText);

        if (intentResult.readyToGenerate && intentResult.category) {
          // Intent is clear - match template and return ready_to_generate
          sendSSEStatus(controller!, 'Matching template...', 50);
          const templateMatch = await matchTemplate(intentResult.category, message);

          const aiContent = `好的，我将为你生成${getCategoryDisplayName(intentResult.category)}文档。`;

          // Save assistant message
          if (effectiveConvId) {
            await saveMessage(effectiveConvId, 'assistant', aiContent, {
              category: intentResult.category,
            });
          }

          sendSSEEvent(controller!, {
            type: 'ready_to_generate',
            conversationId: effectiveConvId,
            category: intentResult.category,
            templateId: templateMatch?.template?.id,
            data: aiContent,
          });
          controller!.close();
          return;
        }

        // Need more clarification - stream LLM response with conversation history
        const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
        ];

        // Add conversation history
        for (const msg of historyMessages) {
          llmMessages.push({
            role: msg.role,
            content: msg.content,
          });
        }

        // Add current message
        llmMessages.push({ role: 'user', content: message });

        const generator = await streamChatCompletion({
          model: getDefaultModel(),
          messages: llmMessages,
        });

        let fullResponse = '';

        for await (const chunk of generator) {
          if (chunk.type === 'delta') {
            fullResponse += chunk.data;
            sendSSEEvent(controller!, {
              type: 'content',
              data: chunk.data,
            });
          } else if (chunk.type === 'done') {
            // Streaming complete - save and finalize
            if (effectiveConvId && fullResponse) {
              await saveMessage(effectiveConvId, 'assistant', fullResponse);
            }

            // Just signal continue, don't send the content again
            // Client already has all content from streaming
            sendSSEEvent(controller!, {
              type: 'continue',
            });
          } else if (chunk.type === 'error') {
            sendSSEError(controller!, chunk.data);
            controller!.close();
            return;
          }
        }

        controller!.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Clarify failed';
        sendSSEError(controller!, errorMessage);
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
    const errorMessage = error instanceof Error ? error.message : 'Clarify failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

