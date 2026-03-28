// src/app/api/ai/clarify/route.ts

import { NextRequest } from 'next/server';
import { getSession, addMessage, deleteSession, setSessionCategory } from '@/lib/ai/clarify-session-store';
import { streamChatCompletion } from '@/lib/ai/llm-client';
import { PROMPT_TEMPLATES, getPromptTemplate } from '@/config/prompt-templates';
import type { ClarifyResponse } from '@/types/clarify';

export const runtime = 'edge';
export const maxDuration = 60;

const CLARIFY_SYSTEM_PROMPT = `You are a helpful document creation assistant. Your goal is to help users create documents.

First, determine what type of document the user wants to create.
Available types: ${Object.keys(PROMPT_TEMPLATES).join(', ')}

If you need more information to determine the document type, ask a clear question.
When asking, provide relevant options as quick replies.

When you have enough information, respond with JSON ONLY:
{
  "type": "complete",
  "category": "resume",
  "summary": "Brief summary of what you'll generate"
}

When you need more info, respond with JSON ONLY:
{
  "type": "continue",
  "content": "What type of document would you like to create?",
  "quickReplies": ["Resume", "Cover Letter", "Report", "Letter"]
}

IMPORTANT: Always respond with valid JSON only. No markdown, no code blocks.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Runtime validation
    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { sessionId, message } = body;

    if (!sessionId || typeof sessionId !== 'string' || !message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'sessionId and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the session
    const session = getSession(sessionId);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add user message to session
    addMessage(sessionId, { role: 'user', content: message });

    // Build messages for LLM
    const messages = [
      { role: 'system', content: CLARIFY_SYSTEM_PROMPT },
      { role: 'user', content: `Original request: ${session.originalPrompt}` },
      ...session.messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Call LLM
    const generator = await streamChatCompletion({
      model: 'openai/gpt-4o-mini',
      messages,
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      } else if (chunk.type === 'error') {
        return new Response(
          JSON.stringify({ error: chunk.data }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse the response
    const response = parseClarifyResponse(accumulated);

    // Add assistant message to session
    addMessage(sessionId, {
      role: 'assistant',
      content: response.content || `Generating ${response.category}...`,
      quickReplies: response.quickReplies
    });

    // If complete, generate the document
    if (response.type === 'complete' && response.category) {
      setSessionCategory(sessionId, response.category);

      // Generate the actual document
      const generatedHtml = await generateDocument(response.category, session);

      // Clean up session
      deleteSession(sessionId);

      return new Response(
        JSON.stringify({
          type: 'complete',
          html: generatedHtml,
          category: response.category,
        } as ClarifyResponse),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return continue response
    return new Response(
      JSON.stringify(response as ClarifyResponse),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Clarify failed';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Parse clarify response from LLM
 */
function parseClarifyResponse(response: string): ClarifyResponse {
  const validTypes = Object.keys(PROMPT_TEMPLATES);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        type: 'continue',
        content: 'I didn\'t understand that. What type of document would you like to create?',
        quickReplies: ['Resume', 'Cover Letter', 'Report', 'Letter'],
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate category if present
    if (parsed.type === 'complete' && parsed.category && !validTypes.includes(parsed.category)) {
      parsed.category = 'document'; // fallback to generic
    }

    return parsed as ClarifyResponse;
  } catch {
    return {
      type: 'continue',
      content: 'I didn\'t understand that. What type of document would you like to create?',
      quickReplies: ['Resume', 'Cover Letter', 'Report', 'Letter'],
    };
  }
}

/**
 * Generate the actual document
 */
async function generateDocument(category: string, session: { originalPrompt: string; messages: Array<{ role: string; content: string }> }): Promise<string> {
  const systemPrompt = getPromptTemplate(category);

  // Build user message with context
  const userContext = session.messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `${session.originalPrompt}\n\n${userContext}` },
  ];

  const generator = await streamChatCompletion({
    model: 'openai/gpt-4o',
    messages,
  });

  let html = '';

  for await (const chunk of generator) {
    if (chunk.type === 'delta') {
      html += chunk.data;
    } else if (chunk.type === 'error') {
      throw new Error(`Document generation failed: ${chunk.data}`);
    }
  }

  return html;
}
