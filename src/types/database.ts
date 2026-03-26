// ========================================
// Database types (matches Supabase schema)
// ========================================

export interface Template {
  id: string;
  category: string;
  subcategory: string | null;
  name: string;
  description: string | null;
  slug: string;
  thumbnail_url: string;
  raw_thumbnail_url: string | null;
  html_url: string;
  tags: string[];
  popularity: number;
  is_premium: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserHistory {
  id: string;
  user_id: string;
  category: string;
  template_id: string | null;
  conversation_id: string | null;
  title: string;
  content_url: string;
  overlay_url: string | null;
  thumbnail_url: string | null;
  file_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  category: string | null;
  title: string;
  model: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  content_type: 'text' | 'html' | 'json';
  token_count: number | null;
  model: string | null;
  duration_ms: number | null;
  metadata: AIMessageMetadata;
  created_at: string;
}

export interface AIMessageMetadata {
  category?: string;
  template_id?: string;
  generation_id?: string;
  stream_duration_ms?: number;
}
