import { NextRequest } from 'next/server';
import { buildChatMessagesWithTemplateStyle } from '@/lib/ai/prompt-builder';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import { createSSEStream, sendSSEContent, sendSSEError, sendSSEEvent, sendSSEGenerationComplete, sendSSEGenerationStart, sendSSEStatus } from '@/lib/ai/sse-helper';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { applyRateLimit } from '@/lib/rate-limit';

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    resume: '简历',
    coverLetter: '求职信',
    report: '报告',
    businessPlan: '商业计划',
    proposal: '提案',
    contract: '合同',
    letter: '信函',
    meetingMinutes: '会议纪要',
    researchPaper: '研究论文',
    whitePaper: '白皮书',
    ebook: '电子书',
    caseStudy: '案例研究',
    manual: '手册',
    marketResearch: '市场调研',
    budget: '预算',
    todoList: '待办清单',
    document: '文档',
  };
  return labels[category] || '文档';
}

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = applyRateLimit(request, { maxRequests: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { conversationId, message, contextHtml, model, category, templateId, autoGenerate } = body;

    if (!conversationId || !message) {
      return new Response(JSON.stringify({ error: 'conversationId and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Input length validation
    if (message.length > 10000) {
      return new Response(JSON.stringify({ error: 'Message too long (max 10000 characters)' }), {
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

    // Persist user message (skip for autoGenerate - already saved during generate phase)
    if (!autoGenerate) {
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        content_type: 'text',
        metadata: { category },
      });
    }

    const { controller, stream } = createSSEStream();

    // Start streaming in background
    (async () => {
      let accumulated = '';
      let selectedModel = model;
      try {
        const startTime = Date.now();

        sendSSEStatus(controller!, 'Thinking...', 10);

        const result = await buildChatMessagesWithTemplateStyle({
          category: category || 'document',
          templateHtml,
          contextHtml,
          history,
          userMessage: message,
          model,
          isAutoGenerate: autoGenerate,
        });
        selectedModel = result.model;

        sendSSEStatus(controller!, 'Generating response...', 30);

        // Signal document generation start so client can show status instead of raw HTML
        const docLabel = getCategoryLabel(category || 'document');
        sendSSEGenerationStart(controller!, docLabel);

        const generator = await streamChatCompletion({ model: selectedModel, messages: result.messages });

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

        // Signal document generation complete
        sendSSEGenerationComplete(controller!, docLabel);

        // Send completion
        const encoder = new TextEncoder();
        controller!.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'done', data: '', percentage: 100 })}\n\n`,
          ),
        );
        controller!.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Chat failed';
        sendSSEError(controller!, msg);
        controller!.close();
      } finally {
        // Always persist accumulated content, even on client disconnect
        if (accumulated && conversationId) {
          try {
            await supabase.from('ai_messages').insert({
              conversation_id: conversationId,
              role: 'assistant',
              content: accumulated,
              content_type: 'text',
              metadata: { category },
              model: selectedModel,
            });
          } catch (persistError) {
            console.error('Failed to persist assistant message:', persistError);
          }
        }
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
