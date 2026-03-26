const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SITE_URL = 'https://ai-formatter.com';

interface ChatCompletionParams {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

interface StreamChunk {
  type: 'delta' | 'done' | 'error';
  data: string;
}

export async function streamChatCompletion(
  params: ChatCompletionParams,
): Promise<AsyncGenerator<StreamChunk>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': 'AI Formatter',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
  }

  if (!response.body) {
    throw new Error('No response body from OpenRouter');
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

export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': 'AI Formatter',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorBody}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content ?? '';
}
