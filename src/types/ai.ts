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
  type: 'content' | 'status' | 'completion' | 'done' | 'error';
  data: string;
  percentage?: number;
}
