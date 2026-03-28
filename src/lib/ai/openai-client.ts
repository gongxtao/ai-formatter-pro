/**
 * OpenAI Protocol Client
 *
 * Direct OpenAI API client for users who want to use OpenAI directly
 * instead of through OpenRouter.
 *
 * Environment Variables:
 * - OPENAI_API_URL: API endpoint (default: https://api.openai.com/v1/chat/completions)
 * - OPENAI_API_KEY: Your OpenAI API key
 * - OPENAI_MODEL: Model to use (default: gpt-4o)
 */

const DEFAULT_OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

interface ChatCompletionParams {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  data: string;
}

/**
 * Check if OpenAI direct mode is configured
 */
export function isOpenAIDirectMode(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get the configured OpenAI model
 */
export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

/**
 * Get the configured OpenAI API URL
 */
export function getOpenAIApiUrl(): string {
  return process.env.OPENAI_API_URL || DEFAULT_OPENAI_URL;
}

/**
 * Stream chat completion using OpenAI API directly
 */
export async function streamChatCompletionOpenAI(
  params: ChatCompletionParams,
): Promise<AsyncGenerator<StreamChunk>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const apiUrl = getOpenAIApiUrl();
  const model = params.model || getOpenAIModel();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      stream: true,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  if (!response.body) {
    throw new Error('No response body from OpenAI');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  async function* generate(): AsyncGenerator<StreamChunk> {
    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { type: 'done', data: '' };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              yield { type: 'delta', data: content };
            }

            // Check for finish_reason
            const finishReason = parsed.choices?.[0]?.finish_reason;
            if (finishReason) {
              yield { type: 'done', data: '' };
              return;
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
      yield { type: 'done', data: '' };
    } catch (error) {
      yield {
        type: 'error',
        data: error instanceof Error ? error.message : 'Stream error',
      };
    }
  }

  return generate();
}

/**
 * Non-streaming chat completion using OpenAI API directly
 */
export async function chatCompletionOpenAI(
  params: ChatCompletionParams,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const apiUrl = getOpenAIApiUrl();
  const model = params.model || getOpenAIModel();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: params.messages,
      stream: false,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      extra_body: {
        enable_thinking: false
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? '';
}
