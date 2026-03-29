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

export const runtime = 'edge';
export const maxDuration = 60;

const CLARIFY_SYSTEM_PROMPT = `You are a helpful document creation assistant. Help users clarify what document they want to create.

Available document types: document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile

When the user clarifies their intent and you can determine the document type, respond with JSON ONLY:
{
  "type": "intent_clear",
  "category": "resume",
  "summary": "I'll generate a resume for you"
}

When you need more information, respond conversationally:
{
  "type": "continue",
  "content": "What type of document would you like?",
  "quickReplies": ["简历", "求职信", "报告"]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, conversationId, message } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const { controller, stream } = createSSEStream();

    (async () => {
      const supabase = createServerSupabaseClient();

      try {
        sendSSEStatus(controller!, 'Analyzing your message...', 10);

        // If conversationId provided, save message to database
        if (conversationId) {
          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'user',
            content: message,
            content_type: 'text',
          });
        }

        // Classify intent with the new message
        const intentResult = await classifyIntent(message);

        if (intentResult.readyToGenerate && intentResult.category) {
          // Intent is clear - match template and return ready_to_generate
          sendSSEStatus(controller!, 'Matching template...', 50);
          const templateMatch = await matchTemplate(intentResult.category, message);

          // Save assistant message
          const aiContent = `好的，我将为你生成${getCategoryDisplayName(intentResult.category)}文档...`;
          if (conversationId) {
            await supabase.from('ai_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: aiContent,
              content_type: 'text',
              metadata: { category: intentResult.category },
            });
          }

          sendSSEEvent(controller!, {
            type: 'ready_to_generate',
            conversationId,
            category: intentResult.category,
            templateId: templateMatch?.template?.id,
            data: aiContent,
          });
          controller!.close();
          return;
        }

        // Need more clarification - use streaming LLM for conversational response
        sendSSEStatus(controller!, 'Thinking...', 30);

        const generator = await streamChatCompletion({
          model: getDefaultModel(),
          messages: [
            { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
            { role: 'user', content: message },
          ],
        });

        let fullResponse = '';

        for await (const chunk of generator) {
          if (chunk.type === 'delta') {
            fullResponse += chunk.data;
            // Stream content to client in real-time
            sendSSEEvent(controller!, {
              type: 'content',
              data: chunk.data,
            });
          } else if (chunk.type === 'error') {
            sendSSEError(controller!, chunk.data);
            controller!.close();
            return;
          }
        }

        // Parse the complete response to determine next action
        const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);

            if (parsed.type === 'intent_clear' && parsed.category) {
              // LLM determined intent is clear - match template
              const templateMatch = await matchTemplate(parsed.category, message);

              // Save assistant message
              if (conversationId) {
                await supabase.from('ai_messages').insert({
                  conversation_id: conversationId,
                  role: 'assistant',
                  content: parsed.summary || fullResponse,
                  content_type: 'text',
                  metadata: { category: parsed.category },
                });
              }

              sendSSEEvent(controller!, {
                type: 'ready_to_generate',
                conversationId,
                category: parsed.category,
                templateId: templateMatch?.template?.id,
                data: parsed.summary || '好的，我来为你生成文档。',
              });
              controller!.close();
              return;
            }

            // Continue conversation
            if (conversationId) {
              await supabase.from('ai_messages').insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: parsed.content || fullResponse,
                content_type: 'text',
                metadata: { quickReplies: parsed.quickReplies },
              });
            }

            sendSSEEvent(controller!, {
              type: 'continue',
              data: parsed.content || fullResponse,
              content: parsed.content || fullResponse,
              quickReplies: parsed.quickReplies,
            });
            controller!.close();
            return;
          } catch {
            // JSON parse failed, treat as plain text
          }
        }

        // No valid JSON found - save and continue with plain text
        if (conversationId) {
          await supabase.from('ai_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: fullResponse,
            content_type: 'text',
          });
        }

        sendSSEEvent(controller!, {
          type: 'continue',
          data: fullResponse,
          content: fullResponse,
        });
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

function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    resume: '简历',
    coverLetter: '求职信',
    report: '报告',
    businessPlan: '商业计划',
    proposal: '提案',
    document: '文档',
  };
  return names[category] || category;
}

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
  } catch {
    return null;
  }
}
