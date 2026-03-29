import { getDefaultModel } from '@/lib/ai/llm-client';
import { createServerSupabaseClient } from '@/lib/db/supabase-server';

/**
 * Default system prompt used when category is not found in database
 */
const DEFAULT_SYSTEM_PROMPT = `You are a professional document writer. Generate a well-structured document as valid HTML5 only (no markdown fences, no backticks). Use semantic elements: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <blockquote>, <strong>, <em>. Use inline styles for basic formatting (font-size, color, margin). Output ONLY the HTML content, no explanations.`;

/**
 * Valid document types - must match categories in template_categories table
 */
export const VALID_DOCUMENT_TYPES = [
  'document',
  'businessPlan',
  'report',
  'manual',
  'caseStudy',
  'ebook',
  'whitePaper',
  'marketResearch',
  'researchPaper',
  'proposal',
  'budget',
  'todoList',
  'resume',
  'coverLetter',
  'letter',
  'meetingMinutes',
  'writer',
  'policy',
  'payslip',
  'companyProfile',
];

/**
 * Check if a category is a valid document type
 */
export function isValidDocumentType(category: string): boolean {
  return VALID_DOCUMENT_TYPES.includes(category);
}

interface GenerationParams {
  category: string;
  prompt: string;
  topic?: string;
  industry?: string;
  model?: string;
}

export function buildGenerationMessages(params: GenerationParams): {
  model: string;
  messages: Array<{ role: string; content: string }>;
} {
  // Note: This synchronous function uses the default prompt.
  // For database-fetched prompts, use buildGenerationMessagesAsync
  const systemPrompt = DEFAULT_SYSTEM_PROMPT;

  let userContent = params.prompt;
  if (params.topic) {
    userContent = `Topic: ${params.topic}\n\n${userContent}`;
  }
  if (params.industry) {
    userContent = `Industry: ${params.industry}\n\n${userContent}`;
  }

  return {
    model: params.model ?? getDefaultModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

interface ChatParams {
  category?: string;
  contextHtml?: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  model?: string;
}

export function buildChatMessages(params: ChatParams): {
  model: string;
  messages: Array<{ role: string; content: string }>;
} {
  const systemParts: string[] = [];

  if (params.category) {
    systemParts.push(DEFAULT_SYSTEM_PROMPT);
  } else {
    systemParts.push(
      `You are a helpful AI writing assistant. Help users edit and improve their documents.
When asked to edit or modify content, respond with the updated HTML only (no markdown fences, no backticks).
Use semantic HTML elements: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <table>, <blockquote>, <strong>, <em>.
Use inline styles for formatting.`,
    );
  }

  if (params.contextHtml) {
    systemParts.push(
      `\n\nThe user is currently working on the following document. When they ask you to edit, revise, or improve it, provide the complete updated HTML:\n\n<document>\n${params.contextHtml}\n</document>`,
    );
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemParts.join('') },
  ];

  // Add history (skip system messages, limit last 20 messages for context)
  const recentHistory = params.history
    .filter((m) => m.role !== 'system')
    .slice(-20);

  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add current user message
  messages.push({ role: 'user', content: params.userMessage });

  return {
    model: params.model ?? getDefaultModel(),
    messages,
  };
}

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
    systemParts.push(DEFAULT_SYSTEM_PROMPT);
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
    model: params.model ?? getDefaultModel(),
    messages,
  };
}

/**
 * Get system prompt from database by category
 */
export async function getSystemPrompt(category: string): Promise<string> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from('template_categories')
    .select('system_prompt')
    .eq('category', category)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    console.warn('getSystemPrompt: falling back to default prompt for category:', category, error?.message);
    return DEFAULT_SYSTEM_PROMPT;
  }

  return data.system_prompt;
}

/**
 * Build generation messages with database-fetched system prompt
 */
export async function buildGenerationMessagesAsync(params: GenerationParams): Promise<{
  model: string;
  messages: Array<{ role: string; content: string }>;
}> {
  const systemPrompt = await getSystemPrompt(params.category);

  let userContent = params.prompt;
  if (params.topic) {
    userContent = `Topic: ${params.topic}\n\n${userContent}`;
  }
  if (params.industry) {
    userContent = `Industry: ${params.industry}\n\n${userContent}`;
  }

  return {
    model: params.model ?? getDefaultModel(),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  };
}

/**
 * Build chat messages with template style injection
 */
export async function buildChatMessagesWithTemplateStyle(params: {
  category: string;
  templateHtml?: string;
  contextHtml?: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  model?: string;
  isAutoGenerate?: boolean;
}): Promise<{
  model: string;
  messages: Array<{ role: string; content: string }>;
}> {
  const systemPrompt = await getSystemPrompt(params.category);

  const systemParts: string[] = [systemPrompt];

  // Inject template style for first generation
  if (params.isAutoGenerate && params.templateHtml) {
    systemParts.push(`

IMPORTANT: Generate content that matches this template's style and structure:

<template_structure>
${params.templateHtml.substring(0, 2000)}
</template_structure>

Maintain the template's:
1. Heading hierarchy and formatting
2. Section structure
3. Overall style and tone`);
  }

  // Add current document context
  if (params.contextHtml) {
    systemParts.push(`

Current document content for reference:
<context>
${params.contextHtml}
</context>`);
  }

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemParts.join('\n') },
  ];

  // Filter out system messages and limit to last 20 messages
  const recentHistory = params.history
    .filter((m) => m.role !== 'system')
    .slice(-20);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  // Add user message
  messages.push({ role: 'user', content: params.userMessage });

  return {
    model: params.model ?? getDefaultModel(),
    messages,
  };
}
