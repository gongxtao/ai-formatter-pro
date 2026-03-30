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
    cancel() {
      // Ensure controller reference is cleared when stream is cancelled
      // to allow garbage collection
      controller = null;
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

export function sendSSEGenerationStart(
  controller: ReadableStreamDefaultController,
  documentType: string,
): void {
  sendSSEEvent(controller, { type: 'generation_start', documentType });
}

export function sendSSEGenerationComplete(
  controller: ReadableStreamDefaultController,
  documentType: string,
): void {
  sendSSEEvent(controller, { type: 'generation_complete', documentType });
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
    possibleTypes,
  };
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`));
}
