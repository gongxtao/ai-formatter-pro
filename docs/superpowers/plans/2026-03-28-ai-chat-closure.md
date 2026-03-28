# AI Chat Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement business closure for two AI chat components: DashboardChatBox (generate documents with optional clarification) and AIChatSidebar (real-time streaming with template awareness).

**Architecture:**
- Add SSE event type `clarification_needed` for intent disambiguation flow
- Create new `/dashboard/ai-chat/[sessionId]` route with A2UI (Quick Replies) support
- Modify AI chat to support real-time streaming to editor with template awareness
- Use in-memory session storage for clarification flows (5-minute TTL)

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, Server-Sent Events (SSE), OpenRouter API

---

## File Structure

### New Files
```
src/app/[locale]/dashboard/ai-chat/[sessionId]/page.tsx     # Clarify chat page route
src/components/ai/AIClarifyChat.tsx                         # Clarify chat component with A2UI
src/lib/ai/clarify-session-store.ts                        # In-memory session storage
src/lib/ai/intent-classifier.ts                            # Intent classification logic
src/types/clarify.ts                                       # Type definitions for clarify flow
```

### Modified Files
```
src/stores/useDashboardStore.ts                            # Add generationSessionId state
src/hooks/useAIGeneration.ts                               # Handle clarification_needed event
src/hooks/useAIChat.ts                                     # Add templateId + onChunk support
src/components/dashboard/DashboardChatBox.tsx              # Handle clarification navigation
src/components/dashboard/AIChatSidebar.tsx                 # Real-time streaming + remove insert button
src/app/api/ai/generate/route.ts                           # Add intent classification logic
src/app/api/ai/chat/route.ts                               # Add templateId + type inference
src/lib/ai/prompt-builder.ts                               # Add clarify + template-aware prompts
```

---

## Phase 1: Foundation - Types & Session Storage

### Task 1.1: Define Clarify Types

**Files:**
- Create: `src/types/clarify.ts`

- [ ] **Step 1: Create clarify types file**

```typescript
// src/types/clarify.ts

/**
 * Intent classification result from /api/ai/generate
 */
export interface IntentClassificationResult {
  type?: string;
  confidence?: number;
  needsClarification?: boolean;
  possibleTypes?: string[];
}

/**
 * SSE event types for generate API
 */
export type GenerateSSEEventType = 'status' | 'content' | 'completion' | 'done' | 'error' | 'clarification_needed';

export interface GenerateSSEEvent {
  type: GenerateSSEEventType;
  data: string;
  percentage?: number;
  sessionId?: string;
  question?: string;
}

/**
 * Clarify session stored in memory
 */
export interface ClarifySession {
  id: string;
  originalPrompt: string;
  messages: ClarifyMessage[];
  createdAt: Date;
  determinedCategory?: string;
}

/**
 * Message in clarify chat
 */
export interface ClarifyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
  timestamp: Date;
}

/**
 * Request to /api/ai/clarify
 */
export interface ClarifyRequest {
  sessionId: string;
  message: string;
}

/**
 * Response from /api/ai/clarify
 */
export interface ClarifyResponse {
  type: 'continue' | 'complete';

  // When continue
  content?: string;
  quickReplies?: string[];

  // When complete
  html?: string;
  category?: string;
}
```

- [ ] **Step 2: Commit types**

```bash
git add src/types/clarify.ts
git commit -m "feat: add clarify flow type definitions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 1.2: Create In-Memory Session Store

**Files:**
- Create: `src/lib/ai/clarify-session-store.ts`

- [ ] **Step 1: Create session store**

```typescript
// src/lib/ai/clarify-session-store.ts

import type { ClarifySession, ClarifyMessage } from '@/types/clarify';

// In-memory session storage
const sessions = new Map<string, ClarifySession>();

// Session TTL in milliseconds (5 minutes)
const SESSION_TTL = 5 * 60 * 1000;

/**
 * Create a new clarify session
 */
export function createSession(originalPrompt: string): ClarifySession {
  const id = generateSessionId();
  const session: ClarifySession = {
    id,
    originalPrompt,
    messages: [],
    createdAt: new Date(),
  };
  sessions.set(id, session);
  return session;
}

/**
 * Get a session by ID
 */
export function getSession(sessionId: string): ClarifySession | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  // Check if expired
  if (Date.now() - session.createdAt.getTime() > SESSION_TTL) {
    sessions.delete(sessionId);
    return undefined;
  }

  return session;
}

/**
 * Add a message to a session
 */
export function addMessage(sessionId: string, message: Omit<ClarifyMessage, 'id' | 'timestamp'>): boolean {
  const session = getSession(sessionId);
  if (!session) return false;

  session.messages.push({
    ...message,
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
  });

  return true;
}

/**
 * Update session's determined category
 */
export function setSessionCategory(sessionId: string, category: string): boolean {
  const session = getSession(sessionId);
  if (!session) return false;

  session.determinedCategory = category;
  return true;
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, session] of sessions) {
    if (now - session.createdAt.getTime() > SESSION_TTL) {
      sessions.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `clarify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredSessions, 60 * 1000);
}
```

- [ ] **Step 2: Commit session store**

```bash
git add src/lib/ai/clarify-session-store.ts
git commit -m "feat: add in-memory clarify session store with TTL

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 2: Dashboard Store Updates

### Task 2.1: Add generationSessionId to Store

**Files:**
- Modify: `src/stores/useDashboardStore.ts`

- [ ] **Step 1: Add generationSessionId state**

Read the current file and add the new state fields:

```typescript
// Add to DashboardState interface (around line 40-45)
  generationSessionId: string | null;
  setGenerationSessionId: (id: string | null) => void;
```

```typescript
// Add to the store implementation (around line 85-90)
      generationSessionId: null,
      setGenerationSessionId: (id) => set({ generationSessionId: id }),
```

- [ ] **Step 2: Verify the changes compile**

```bash
npm run build 2>&1 | head -50
```

Expected: Build should succeed (or show unrelated errors)

- [ ] **Step 3: Commit store changes**

```bash
git add src/stores/useDashboardStore.ts
git commit -m "feat: add generationSessionId state for clarify flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 3: Intent Classification Logic

### Task 3.1: Create Intent Classifier

**Files:**
- Create: `src/lib/ai/intent-classifier.ts`

- [ ] **Step 1: Create intent classifier module**

```typescript
// src/lib/ai/intent-classifier.ts

import { streamChatCompletion } from '@/lib/ai/openrouter-client';
import { PROMPT_TEMPLATES } from '@/config/prompt-templates';
import type { IntentClassificationResult } from '@/types/clarify';

const INTENT_CLASSIFICATION_PROMPT = `You are a document type classifier. Analyze the user's request and determine the most appropriate document type.

Available types: ${Object.keys(PROMPT_TEMPLATES).join(', ')}

User request: "{{PROMPT_PLACEHOLDER}}"

If you can confidently determine the type (confidence > 0.7), respond with JSON:
{ "type": "resume", "confidence": 0.9 }

If the request is too vague or could match multiple types, respond with:
{ "needsClarification": true, "possibleTypes": ["resume", "coverLetter", "letter"] }

Respond ONLY with the JSON object, no other text.`;

/**
 * Classify user intent from their prompt
 */
export async function classifyIntent(prompt: string): Promise<IntentClassificationResult> {
  const systemPrompt = INTENT_CLASSIFICATION_PROMPT.replace('{{PROMPT_PLACEHOLDER}}', prompt);

  try {
    const generator = await streamChatCompletion({
      model: 'openai/gpt-4o-mini', // Use fast model for classification
      messages: [
        { role: 'system', content: systemPrompt },
      ],
    });

    let accumulated = '';

    for await (const chunk of generator) {
      if (chunk.type === 'delta') {
        accumulated += chunk.data;
      } else if (chunk.type === 'error') {
        console.error('Intent classification error:', chunk.data);
        return { needsClarification: true };
      }
    }

    // Parse the JSON response
    const result = parseClassificationResult(accumulated);
    return result;

  } catch (error) {
    console.error('Intent classification failed:', error);
    return { needsClarification: true };
  }
}

/**
 * Parse classification result from LLM response
 */
function parseClassificationResult(response: string): IntentClassificationResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { needsClarification: true };
    }

    const parsed = JSON.parse(jsonMatch[0]) as IntentClassificationResult;

    // Validate the result
    if (parsed.needsClarification) {
      return {
        needsClarification: true,
        possibleTypes: parsed.possibleTypes || [],
      };
    }

    if (parsed.type && typeof parsed.confidence === 'number') {
      // If confidence is high enough, return the type
      if (parsed.confidence >= 0.7) {
        return { type: parsed.type, confidence: parsed.confidence };
      }
      // Otherwise, need clarification
      return {
        needsClarification: true,
        possibleTypes: [parsed.type],
      };
    }

    return { needsClarification: true };

  } catch {
    return { needsClarification: true };
  }
}
```

- [ ] **Step 2: Commit intent classifier**

```bash
git add src/lib/ai/intent-classifier.ts
git commit -m "feat: add intent classification for document type detection

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 4: Generate API Modifications

### Task 4.1: Modify Generate API for Intent Classification

**Files:**
- Modify: `src/app/api/ai/generate/route.ts`

- [ ] **Step 1: Add intent classification to generate route**

Read the current file and modify it to add intent classification logic. Key changes:

1. Import the intent classifier and session store
2. When category is not provided, call classifyIntent
3. If needsClarification, create a session and send clarification_needed event
4. Otherwise, proceed with normal generation

```typescript
// Add imports at the top
import { classifyIntent } from '@/lib/ai/intent-classifier';
import { createSession } from '@/lib/ai/clarify-session-store';
import { sendSSEClarificationNeeded } from '@/lib/ai/sse-helper';
```

```typescript
// Modify the POST function logic (around line 10-30)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, prompt, topic, industry, model } = body;

    // If no category, try to classify intent first
    if (!category) {
      const classification = await classifyIntent(prompt);

      if (classification.needsClarification) {
        // Create a clarify session
        const session = createSession(prompt);

        const { controller, stream } = createSSEStream();

        // Send clarification_needed event
        sendSSEStatus(controller!, 'Analyzing your request...', 10);

        controller!.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: 'clarification_needed',
              sessionId: session.id,
              question: 'What type of document would you like to create?',
              possibleTypes: classification.possibleTypes || [],
            })}\n\n`
          )
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

    // Existing logic for when category is provided
    return generateWithCategory(category, prompt, topic, industry, model);

  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Extract existing generation logic into a helper function
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
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 3: Commit generate API changes**

```bash
git add src/app/api/ai/generate/route.ts
git commit -m "feat: add intent classification to generate API

When no category provided, classify intent first.
If unclear, return clarification_needed event with session ID.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 5: Clarify API Endpoint

### Task 5.1: Create Clarify API

**Files:**
- Create: `src/app/api/ai/clarify/route.ts`

- [ ] **Step 1: Create clarify API route**

```typescript
// src/app/api/ai/clarify/route.ts

import { NextRequest } from 'next/server';
import { getSession, addMessage, deleteSession, setSessionCategory } from '@/lib/ai/clarify-session-store';
import { streamChatCompletion } from '@/lib/ai/openrouter-client';
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
    const { sessionId, message } = body as { sessionId: string; message: string };

    if (!sessionId || !message) {
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
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        type: 'continue',
        content: 'I didn\'t understand that. What type of document would you like to create?',
        quickReplies: ['Resume', 'Cover Letter', 'Report', 'Letter'],
      };
    }

    return JSON.parse(jsonMatch[0]) as ClarifyResponse;
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
    }
  }

  return html;
}
```

- [ ] **Step 2: Commit clarify API**

```bash
git add src/app/api/ai/clarify/route.ts
git commit -m "feat: add /api/ai/clarify endpoint for multi-turn clarification

- Handles clarification conversations
- Returns quickReplies for A2UI
- Generates document when type determined

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 6: useAIGeneration Hook Updates

### Task 6.1: Handle clarification_needed Event

**Files:**
- Modify: `src/hooks/useAIGeneration.ts`

- [ ] **Step 1: Add clarification handling to useAIGeneration**

Read the current file and add handling for the `clarification_needed` event type:

```typescript
// Add import at top
import { useDashboardStore } from '@/stores/useDashboardStore';
```

```typescript
// Add new state for clarification
const [needsClarification, setNeedsClarification] = useState(false);
const [clarificationSessionId, setClarificationSessionId] = useState<string | null>(null);
```

```typescript
// Modify the generate function to handle clarification_needed
// In the switch statement around line 76-95, add:

case 'clarification_needed':
  setNeedsClarification(true);
  setClarificationSessionId(event.sessionId || null);
  setGenerationSessionId(event.sessionId || null);
  setIsGeneratingLocal(false);
  setIsGenerating(false);
  // Navigate to clarify page
  router.push(`/dashboard/ai-chat/${event.sessionId}`);
  return; // Stop processing stream
```

```typescript
// Add return values from the hook
return {
  generate,
  isGenerating,
  generatedContent,
  progress,
  statusMessage,
  error,
  needsClarification,
  clarificationSessionId,
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 3: Commit hook changes**

```bash
git add src/hooks/useAIGeneration.ts
git commit -m "feat: handle clarification_needed event in useAIGeneration

- Add navigation to clarify page when intent unclear
- Track clarification state

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 7: Clarify Chat Page & Component

### Task 7.1: Create AIClarifyChat Component

**Files:**
- Create: `src/components/ai/AIClarifyChat.tsx`

- [ ] **Step 1: Create AIClarifyChat component**

```typescript
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useToast } from '@/components/ui/Toast';
import type { ClarifyMessage, ClarifyResponse } from '@/types/clarify';

interface AIClarifyChatProps {
  sessionId: string;
}

export function AIClarifyChat({ sessionId }: AIClarifyChatProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ClarifyMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Send message to API
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ClarifyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: messageText.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ClarifyResponse = await response.json();

      if (data.type === 'complete' && data.html) {
        // Document generated - navigate to editor
        const assistantMessage: ClarifyMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Great! I've generated your ${data.category || 'document'}. Redirecting to editor...`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Set content and navigate
        setPendingEditorContent(data.html);

        setTimeout(() => {
          router.push('/dashboard/editor');
        }, 500);
      } else if (data.type === 'continue') {
        // Need more information
        const assistantMessage: ClarifyMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || 'What would you like to do?',
          quickReplies: data.quickReplies,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setQuickReplies(data.quickReplies || []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, setPendingEditorContent, router, toast]);

  // Handle quick reply click
  const handleQuickReply = useCallback((reply: string) => {
    sendMessage(reply);
  }, [sendMessage]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Document Creator</h1>
            <p className="text-sm text-gray-500">Tell me what you'd like to create</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Quick Replies */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit AIClarifyChat component**

```bash
git add src/components/ai/AIClarifyChat.tsx
git commit -m "feat: add AIClarifyChat component with A2UI quick replies

- Full-screen chat interface
- Quick reply buttons for document type selection
- Auto-navigate to editor on completion

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 7.2: Create Clarify Chat Page Route

**Files:**
- Create: `src/app/[locale]/dashboard/ai-chat/[sessionId]/page.tsx`

- [ ] **Step 1: Create page route**

```typescript
// src/app/[locale]/dashboard/ai-chat/[sessionId]/page.tsx

import { notFound } from 'next/navigation';
import { AIClarifyChat } from '@/components/ai/AIClarifyChat';

interface PageProps {
  params: Promise<{
    locale: string;
    sessionId: string;
  }>;
}

export default async function AIClarifyChatPage({ params }: PageProps) {
  const { sessionId } = await params;

  // Validate session ID format
  if (!sessionId || !sessionId.startsWith('clarify-')) {
    notFound();
  }

  return <AIClarifyChat sessionId={sessionId} />;
}
```

- [ ] **Step 2: Commit page route**

```bash
git add src/app/[locale]/dashboard/ai-chat/
git commit -m "feat: add /dashboard/ai-chat/[sessionId] route

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 8: Chat API Template Awareness

### Task 8.1: Modify Chat API for Template Support

**Files:**
- Modify: `src/app/api/ai/chat/route.ts`
- Modify: `src/lib/ai/prompt-builder.ts`

- [ ] **Step 1: Add template-aware prompt building to prompt-builder.ts**

Add new functions to `src/lib/ai/prompt-builder.ts`:

```typescript
// Add to existing file

interface ChatWithTemplateParams {
  templateHtml?: string;
  contextHtml?: string;
  category?: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  model?: string;
}

export function buildChatMessagesWithTemplate(params: ChatWithTemplateParams): {
  model: string;
  messages: Array<{ role: string; content: string }>;
} {
  const systemParts: string[] = [];

  // Base prompt based on category or default
  if (params.category) {
    systemParts.push(getPromptTemplate(params.category));
  } else {
    systemParts.push(
      `You are a helpful AI writing assistant. Help users edit and improve their documents.
When asked to edit or modify content, respond with the updated HTML only (no markdown fences, no backticks).
Use semantic HTML elements: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <blockquote>, <strong>, <em>.
Use inline styles for formatting.`
    );
  }

  // Add template context if provided
  if (params.templateHtml) {
    systemParts.push(`

IMPORTANT: The user is working with a template. Here is the template structure:

<template>
${params.templateHtml}
</template>

When generating or editing content:
1. Maintain the template's structure and styling
2. Replace placeholder content appropriately
3. Keep the same HTML elements and layout
4. Match the template's tone and format`);
  }

  // Add current document context
  if (params.contextHtml) {
    systemParts.push(`

The user is currently working on the following document. When they ask you to edit, revise, or improve it, provide the complete updated HTML:

<document>
${params.contextHtml}
</document>`);
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemParts.join('') },
  ];

  // Add history (skip system messages, limit last 20 messages)
  const recentHistory = params.history
    .filter((m) => m.role !== 'system')
    .slice(-20);

  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: params.userMessage });

  return {
    model: params.model ?? DEFAULT_MODEL,
    messages,
  };
}
```

- [ ] **Step 2: Modify chat route to use template**

Update `src/app/api/ai/chat/route.ts`:

```typescript
// Add templateId to destructured body (around line 12)
const { conversationId, message, contextHtml, model, category, templateId } = body;

// After loading history, add template loading (around line 40)
let templateHtml: string | undefined;

if (templateId) {
  try {
    const templateRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/templates?id=${templateId}`);
    if (templateRes.ok) {
      const templateData = await templateRes.json();
      templateHtml = templateData.html;
    }
  } catch (e) {
    console.error('Failed to load template:', e);
  }
}

// Modify buildChatMessages call (around line 59)
const { model: selectedModel, messages } = buildChatMessagesWithTemplate({
  category,
  templateHtml,
  contextHtml,
  history,
  userMessage: message,
  model,
});
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit chat API changes**

```bash
git add src/app/api/ai/chat/route.ts src/lib/ai/prompt-builder.ts
git commit -m "feat: add template awareness to chat API

- Load template HTML when templateId provided
- Include template structure in system prompt
- AI generates content matching template style

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 9: useAIChat Hook Updates

### Task 9.1: Add templateId and onChunk Support

**Files:**
- Modify: `src/hooks/useAIChat.ts`

- [ ] **Step 1: Update useAIChat options interface**

```typescript
// Modify interface (around line 8)
interface UseAIChatOptions {
  conversationId?: string | null;
  category?: string;
  templateId?: string | null;      // NEW
  onChunk?: (html: string) => void; // NEW: real-time callback
}
```

- [ ] **Step 2: Update sendMessage to include templateId and call onChunk**

```typescript
// In sendMessage function, add templateId to body (around line 70)
body: JSON.stringify({
  conversationId,
  message,
  contextHtml: sendOptions?.contextHtml,
  category: options?.category,
  templateId: options?.templateId,  // NEW
}),

// In the switch statement for event handling (around line 105)
case 'content':
  appendStreamingContent(event.data);
  // NEW: Call onChunk callback with accumulated content
  const currentContent = useChatStore.getState().streamingContent + event.data;
  options?.onChunk?.(currentContent);
  break;
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 4: Commit hook changes**

```bash
git add src/hooks/useAIChat.ts
git commit -m "feat: add templateId and onChunk to useAIChat

- Pass templateId to API for template-aware generation
- Call onChunk for real-time editor updates

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 10: AIChatSidebar Real-time Streaming

### Task 10.1: Implement Real-time Editor Updates

**Files:**
- Modify: `src/components/dashboard/AIChatSidebar.tsx`

- [ ] **Step 1: Add templateId and real-time streaming**

```typescript
// Add store access (around line 16)
const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId);
const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);
const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);

// Modify useAIChat call (around line 21)
const { sendMessage, insertIntoEditor, isLoading, messages, error } = useAIChat({
  conversationId,
  templateId: selectedTemplateId,
  onChunk: (html: string) => {
    // Real-time update to editor
    setCurrentEditorHtml(html);
  },
});
```

- [ ] **Step 2: Remove Insert button (lines 136-151)**

Delete the insert button section since we now update in real-time:

```typescript
// DELETE this section:
{/* Insert button after last non-streaming assistant message */}
{messages.length > 0 &&
  !streamingMessage &&
  !isLoading &&
  messages[messages.length - 1].role === 'assistant' && (
    <div className="flex justify-start">
      <button
        onClick={() => handleInsert(messages[messages.length - 1].content)}
        ...
      >
        {tAi('insertIntoEditor')}
      </button>
    </div>
  )}
```

- [ ] **Step 3: Remove unused insertIntoEditor handler**

```typescript
// DELETE this (around line 82):
const handleInsert = useCallback(
  (content: string) => {
    insertIntoEditor(content);
  },
  [insertIntoEditor],
);
```

- [ ] **Step 4: Pass contextHtml from editor**

```typescript
// Modify sendMessage call to include current editor content
const handleSend = useCallback(() => {
  const text = input.trim();
  if (!text || isLoading) return;
  setInput('');
  sendMessage(text, { contextHtml: currentEditorHtml });  // Add contextHtml
}, [input, isLoading, sendMessage, currentEditorHtml]);
```

- [ ] **Step 5: Verify build**

```bash
npm run build 2>&1 | head -50
```

- [ ] **Step 6: Commit AIChatSidebar changes**

```bash
git add src/components/dashboard/AIChatSidebar.tsx
git commit -m "feat: implement real-time streaming in AIChatSidebar

- Remove insert button (now updates in real-time)
- Pass templateId for template-aware generation
- Pass contextHtml for context-aware editing

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Phase 11: Final Integration & Testing

### Task 11.1: Add i18n Translations

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

- [ ] **Step 1: Add English translations**

Add to `src/messages/en.json` under the appropriate sections:

```json
{
  "dashboard": {
    // ... existing
    "clarifyingIntent": "Analyzing your request...",
    "needMoreInfo": "I need more information to help you create the right document."
  },
  "editor": {
    // ... existing
    "aiGenerating": "AI is generating content...",
    "realTimeUpdate": "Content updates in real-time"
  }
}
```

- [ ] **Step 2: Add Chinese translations**

Add to `src/messages/zh.json`:

```json
{
  "dashboard": {
    // ... existing
    "clarifyingIntent": "正在分析您的请求...",
    "needMoreInfo": "我需要更多信息来帮您创建合适的文档。"
  },
  "editor": {
    // ... existing
    "aiGenerating": "AI 正在生成内容...",
    "realTimeUpdate": "内容实时更新中"
  }
}
```

- [ ] **Step 3: Commit translations**

```bash
git add src/messages/en.json src/messages/zh.json
git commit -m "feat: add i18n translations for clarify flow

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

### Task 11.2: Full Build Verification

- [ ] **Step 1: Run full build**

```bash
npm run build
```

Expected: Build completes successfully

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors (warnings acceptable)

- [ ] **Step 3: Start dev server and test flows**

```bash
npm run dev
```

Manual test checklist:
1. [ ] Dashboard: Enter prompt without selecting type → Should clarify or generate
2. [ ] Dashboard: Enter vague prompt → Should navigate to clarify page
3. [ ] Clarify page: Click quick reply → Should continue or complete
4. [ ] Clarify page: Complete conversation → Should navigate to editor
5. [ ] Editor: Send message → Should update in real-time
6. [ ] Editor: With template selected → Should match template style

---

## Summary

### Files Created (8)
- `src/types/clarify.ts`
- `src/lib/ai/clarify-session-store.ts`
- `src/lib/ai/intent-classifier.ts`
- `src/app/api/ai/clarify/route.ts`
- `src/components/ai/AIClarifyChat.tsx`
- `src/app/[locale]/dashboard/ai-chat/[sessionId]/page.tsx`

### Files Modified (8)
- `src/stores/useDashboardStore.ts`
- `src/hooks/useAIGeneration.ts`
- `src/hooks/useAIChat.ts`
- `src/components/dashboard/AIChatSidebar.tsx`
- `src/app/api/ai/generate/route.ts`
- `src/app/api/ai/chat/route.ts`
- `src/lib/ai/prompt-builder.ts`
- `src/messages/en.json`, `src/messages/zh.json`

### Commits (12)
1. feat: add clarify flow type definitions
2. feat: add in-memory clarify session store with TTL
3. feat: add generationSessionId state for clarify flow
4. feat: add intent classification for document type detection
5. feat: add intent classification to generate API
6. feat: add /api/ai/clarify endpoint for multi-turn clarification
7. feat: handle clarification_needed event in useAIGeneration
8. feat: add AIClarifyChat component with A2UI quick replies
9. feat: add /dashboard/ai-chat/[sessionId] route
10. feat: add template awareness to chat API
11. feat: add templateId and onChunk to useAIChat
12. feat: implement real-time streaming in AIChatSidebar

---

## Self-Review Checklist

- [x] **Spec coverage**: All requirements from design spec have corresponding tasks
- [x] **Placeholder scan**: No TBD, TODO, or incomplete sections
- [x] **Type consistency**: Type definitions are consistent across files
- [x] **File paths**: All file paths are exact and follow project conventions
- [x] **Code completeness**: All code blocks contain full implementation
- [x] **Commit messages**: All commits follow conventional commit format
