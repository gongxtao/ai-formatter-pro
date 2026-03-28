import type { StreamEvent } from '@/types/ai';
import type { GenerateSSEEvent } from '@/types/clarify';

export function createSSEStream(): {
  controller: ReadableStreamDefaultController | null;
  stream: ReadableStream<Uint8Array>;
} {
  let controller: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
  });

  return { controller, stream };
}

export function sendSSEEvent(
  controller: ReadableStreamDefaultController,
  event: StreamEvent,
): void {
  const data = JSON.stringify(event);
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

export function sendSSEError(
  controller: ReadableStreamDefaultController,
  message: string,
): void {
  sendSSEEvent(controller, { type: 'error', data: message });
}

export function sendSSEStatus(
  controller: ReadableStreamDefaultController,
  message: string,
  percentage: number,
): void {
  sendSSEEvent(controller, { type: 'status', data: message, percentage });
}

export function sendSSEContent(
  controller: ReadableStreamDefaultController,
  content: string,
): void {
  sendSSEEvent(controller, { type: 'content', data: content });
}

export function sendSSECompletion(
  controller: ReadableStreamDefaultController,
  fullContent: string,
): void {
  sendSSEEvent(controller, { type: 'completion', data: fullContent, percentage: 100 });
  sendSSEEvent(controller, { type: 'done', data: '', percentage: 100 });
}

export function sendSSEClarificationNeeded(
  controller: ReadableStreamDefaultController,
  sessionId: string,
  question: string,
  possibleTypes: string[] = [],
): void {
  const event: GenerateSSEEvent = {
    type: 'clarification_needed',
    data: question,
    sessionId,
    question,
  };
  // Note: possibleTypes is not in GenerateSSEEvent, but we include it in the raw event for client use
  const data = JSON.stringify({ ...event, possibleTypes });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}
