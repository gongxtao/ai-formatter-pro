import type { AIModel } from '@/types/ai';

export const AI_MODELS: AIModel[] = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 128000,
  },
  {
    id: 'anthropic/claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    maxTokens: 200000,
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    maxTokens: 1048576,
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B',
    provider: 'meta',
    maxTokens: 128000,
  },
];

export const DEFAULT_MODEL = AI_MODELS[0].id;

export function getModel(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id);
}
