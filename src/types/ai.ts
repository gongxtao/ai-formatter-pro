export interface AIModel {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
}

export interface ChatMessage {
  id?: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  content_type?: 'text' | 'html' | 'json';
  timestamp?: string;
}

export interface GenerationRequest {
  category: string;
  prompt: string;
  templateId?: string;
  model?: string;
}

export interface StreamEvent {
  type: 'content' | 'status' | 'completion' | 'done' | 'error' | 'clarification_needed' | 'ready_to_generate';
  data: string;
  percentage?: number;
  sessionId?: string;  // For clarification_needed
  question?: string;   // For clarification_needed
  possibleTypes?: string[]; // For clarification_needed
  conversationId?: string; // For ready_to_generate and clarification_needed
  category?: string; // For ready_to_generate
  templateId?: string; // For ready_to_generate
  message?: string; // For clarification_needed
  quickReplies?: string[]; // For clarification_needed
}
