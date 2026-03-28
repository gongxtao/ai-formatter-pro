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
