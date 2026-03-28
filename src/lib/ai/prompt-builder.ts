import { getPromptTemplate } from '@/config/prompt-templates';
import { DEFAULT_MODEL } from '@/config/ai-models';

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
  const systemPrompt = getPromptTemplate(params.category);

  let userContent = params.prompt;
  if (params.topic) {
    userContent = `Topic: ${params.topic}\n\n${userContent}`;
  }
  if (params.industry) {
    userContent = `Industry: ${params.industry}\n\n${userContent}`;
  }

  return {
    model: params.model ?? DEFAULT_MODEL,
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
    systemParts.push(getPromptTemplate(params.category));
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
    model: params.model ?? DEFAULT_MODEL,
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
