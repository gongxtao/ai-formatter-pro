'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { StreamEvent } from '@/types/ai';

export interface SSEStreamHandlers {
  /** Handle a parsed SSE event. Return true to abort reading early. */
  onEvent: (event: StreamEvent) => boolean;
  /** Called on non-abort errors */
  onError?: (error: Error) => void;
  /** Called when stream ends normally (after all events processed) */
  onComplete?: () => void;
}

/**
 * Reusable hook for SSE stream consumption.
 * Centralizes buffer management, line parsing, and abort handling
 * that was previously duplicated across useAIGeneration and CreateConversationView.
 */
export function useSSEStream() {
  const abortRef = useRef<AbortController | null>(null);

  // Abort in-flight request on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const start = useCallback(
    async (url: string, body: unknown, handlers: SSEStreamHandlers) => {
      // Abort any previous request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          if (controller.signal.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            try {
              const event: StreamEvent = JSON.parse(trimmed.slice(6));
              if (handlers.onEvent(event)) return; // early exit requested
            } catch {
              // Skip incomplete JSON chunks
            }
          }
        }

        // Process remaining buffer
        const remaining = buffer.trim();
        if (remaining.startsWith('data: ')) {
          try {
            const event: StreamEvent = JSON.parse(remaining.slice(6));
            if (handlers.onEvent(event)) return;
          } catch {
            // Skip incomplete JSON
          }
        }

        handlers.onComplete?.();
      } catch (err) {
        // Ignore abort errors — expected on navigation or re-send
        if (err instanceof DOMException && err.name === 'AbortError') return;

        const error = err instanceof Error ? err : new Error(String(err));
        handlers.onError?.(error);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    []
  );

  return { start, abort };
}
