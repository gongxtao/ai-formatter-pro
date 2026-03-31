/**
 * Unified LLM Client
 *
 * Automatically switches between OpenRouter and direct OpenAI API
 * based on environment variables.
 *
 * Configuration:
 * - OPENAI_API_KEY: If set, uses direct OpenAI API
 * - OPENROUTER_API_KEY: If set (and OPENAI_API_KEY not set), uses OpenRouter
 *
 * Optional:
 * - OPENAI_API_URL: Custom API endpoint (default: OpenAI's API)
 * - OPENAI_MODEL: Default model for OpenAI (default: gpt-4o)
 */

import { streamChatCompletion as streamOpenRouter, chatCompletion as chatOpenRouter } from './openrouter-client';
import { streamChatCompletionOpenAI, chatCompletionOpenAI, isOpenAIDirectMode, getOpenAIModel } from './openai-client';

export type LLMProvider = 'openai' | 'openrouter';

interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  data: string;
}

/**
 * Get the current LLM provider based on environment variables
 */
export function getLLMProvider(): LLMProvider {
  if (isOpenAIDirectMode()) {
    return 'openai';
  }
  return 'openrouter';
}

/**
 * Get the default model for the current provider
 * - OpenAI direct mode: uses OPENAI_MODEL env or 'kimi-k2.5'
 * - OpenRouter mode: uses 'openai/gpt-4o'
 */
export function getDefaultModel(): string {
  if (isOpenAIDirectMode()) {
    return getOpenAIModel();
  }
  return 'kimi-k2.5';
}

/**
 * Get the effective model name
 * For OpenAI direct mode, can override with OPENAI_MODEL env var
 */
export function getEffectiveModel(requestedModel: string): string {
  if (isOpenAIDirectMode()) {
    // In OpenAI mode, use the model from env if not explicitly overridden
    const envModel = getOpenAIModel();
    // If requested model is a default/placeholder, use env model
    if (requestedModel === 'openai/gpt-4o' || requestedModel === 'openai/gpt-4o-mini') {
      // Strip the 'openai/' prefix for direct OpenAI calls
      return envModel;
    }
    // Strip provider prefix for OpenAI direct mode
    if (requestedModel.startsWith('openai/')) {
      return requestedModel.slice(7);
    }
    return requestedModel;
  }
  return requestedModel;
}

/**
 * Unified streaming chat completion
 * Automatically routes to the appropriate provider
 */
export async function streamChatCompletion(
  params: ChatCompletionParams,
): Promise<AsyncGenerator<StreamChunk>> {
  const effectiveModel = getEffectiveModel(params.model);

  if (isOpenAIDirectMode()) {
    return streamChatCompletionOpenAI({
      ...params,
      model: effectiveModel,
    });
  }

  return streamOpenRouter(params);
}

/**
 * Unified non-streaming chat completion
 * Automatically routes to the appropriate provider
 */
export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<string> {
  const effectiveModel = getEffectiveModel(params.model);

  if (isOpenAIDirectMode()) {
    return chatCompletionOpenAI({
      ...params,
      model: effectiveModel,
    });
  }

  return chatOpenRouter(params);
}

/**
 * Check if LLM is properly configured
 */
export function isLLMConfigured(): boolean {
  return !!(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);
}

/**
 * Get configuration status for debugging
 */
export function getLLMConfigStatus(): {
  provider: LLMProvider;
  isConfigured: boolean;
  model: string;
  apiUrl?: string;
} {
  const provider = getLLMProvider();
  const isConfigured = isLLMConfigured();

  return {
    provider,
    isConfigured,
    model: provider === 'openai' ? getOpenAIModel() : 'openai/gpt-4o',
    apiUrl: provider === 'openai' ? process.env.OPENAI_API_URL : undefined,
  };
}
