// src/types/clarify.ts

/**
 * Intent classification result from /api/ai/init
 */
export interface IntentClassificationResult {
  // New fields for template matching
  readyToGenerate: boolean;
  category?: string;
  confidence: number;
  reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type';
  suggestedQuestion?: string;
  quickReplies?: string[];

  // Legacy fields for backward compatibility
  type?: string;
  needsClarification?: boolean;
  possibleTypes?: string[];
}

/**
 * SSE event types for generate API
 */
export type GenerateSSEEventType = 'status' | 'content' | 'completion' | 'done' | 'error' | 'clarification_needed';

/**
 * SSE event for generate API.
 * Extends StreamEvent from ai.ts with clarify-specific fields:
 * - sessionId: Links to ClarifySession for multi-round conversations
 * - question: AI's clarification question when needsClarification=true
 *
 * Relationship to StreamEvent:
 * - StreamEvent (ai.ts): Core SSE types for standard generation flow
 * - GenerateSSEEvent (this file): Extended for clarify flow with additional fields
 * - When clarification_needed, client should redirect to /ai-chat/[sessionId]
 */
export interface GenerateSSEEvent {
  type: GenerateSSEEventType;
  data: string;
  percentage?: number;
  sessionId?: string;
  question?: string;
  possibleTypes?: string[]; // Added for clarification_needed event
}

/**
 * Clarify session stored in memory
 * Note: createdAt uses ISO string format for JSON serialization compatibility
 */
export interface ClarifySession {
  id: string;
  originalPrompt: string;
  messages: ClarifyMessage[];
  createdAt: string;
  determinedCategory?: string;
}

/**
 * Message in clarify chat
 * Note: timestamp uses ISO string format for JSON serialization compatibility
 */
export interface ClarifyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
  timestamp: string;
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
