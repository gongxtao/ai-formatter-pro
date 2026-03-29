// src/app/api/ai/clarify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/ai/llm-client';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';
import { classifyIntent } from '@/lib/ai/intent-classifier';

export const runtime = 'edge';
export const maxDuration = 60;

const CLARIFY_SYSTEM_PROMPT = `You are a helpful document creation assistant. Help users clarify what document they want to create.

Available document types: document, businessPlan, report, manual, caseStudy, ebook, whitePaper, marketResearch, researchPaper, proposal, budget, todoList, resume, coverLetter, letter, meetingMinutes, writer, policy, payslip, companyProfile

When the user clarifies their intent, respond with JSON ONLY:
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
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { sessionId, conversationId, message } = body;
    // sessionId is kept for backward compatibility but not used in new flow

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // If conversationId provided, save message to database
    if (conversationId) {
      const { error } = await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: message,
        content_type: 'text',
      });
      if (error) {
        console.error('Failed to save user message:', error.message);
      }
    }

    // Classify intent with the new message
    const intentResult = await classifyIntent(message);

    if (intentResult.readyToGenerate && intentResult.category) {
      // Intent is clear - return ready_to_generate
      const templateMatch = await matchTemplate(intentResult.category, message);

      // Save assistant message
      if (conversationId) {
        const { error } = await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: `好的，我将为你生成${intentResult.category}文档...`,
          content_type: 'text',
          metadata: { category: intentResult.category },
        });
        if (error) {
          console.error('Failed to save assistant message:', error.message);
        }
      }

      return NextResponse.json({
        type: 'ready_to_generate',
        conversationId,
        category: intentResult.category,
        templateId: templateMatch?.template?.id,
      });
    }

    // Need more clarification - use LLM for conversational response
    const response = await getClarificationResponse(message);

    // Save assistant message
    if (conversationId) {
      const { error } = await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: response.content || '',
        content_type: 'text',
        metadata: { quickReplies: response.quickReplies },
      });
      if (error) {
        console.error('Failed to save assistant message:', error.message);
      }
    }

    return NextResponse.json({
      type: 'continue',
      ...response,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Clarify failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function getClarificationResponse(userMessage: string): Promise<{
  content: string;
  quickReplies?: string[];
}> {
  try {
    const responseText = await chatCompletion({
      model: 'kimi-k2.5',
      messages: [
        { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        content: '你想创建什么类型的文档？',
        quickReplies: ['简历', '求职信', '报告', '商业计划'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (parsed.type === 'intent_clear') {
      return {
        content: parsed.summary || '好的，我来为你生成文档。',
      };
    }

    return {
      content: parsed.content || '你想创建什么类型的文档？',
      quickReplies: parsed.quickReplies,
    };
  } catch {
    return {
      content: '你想创建什么类型的文档？',
      quickReplies: ['简历', '求职信', '报告', '商业计划'],
    };
  }
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
