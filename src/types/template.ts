// src/types/template.ts

/**
 * Template category from database
 */
export interface TemplateCategory {
  id: string;
  category: string;
  name: string;
  name_en: string | null;
  description: string | null;
  system_prompt: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Template match request
 */
export interface TemplateMatchRequest {
  category: string;
  userPrompt: string;
  limit?: number;
}

/**
 * Template match response
 */
export interface TemplateMatchResponse {
  template: {
    id: string;
    name: string;
    category: string;
    subcategory: string | null;
    tags: string[];
    html_url: string;
    thumbnail_url: string;
  };
  score: number;
}

/**
 * Intent classification result
 */
export interface IntentClassificationResult {
  readyToGenerate: boolean;
  category?: string;
  confidence: number;
  reason?: 'unclear_intent' | 'insufficient_content' | 'unknown_type';
  suggestedQuestion?: string;
  quickReplies?: string[];
}
