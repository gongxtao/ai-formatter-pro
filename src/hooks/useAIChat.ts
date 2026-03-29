'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { StreamEvent } from '@/types/ai';

interface UseAIChatOptions {
  conversationId?: string | null;
  category?: string;
  templateId?: string | null;
  onChunk?: (html: string) => void;
}

export function useAIChat(options?: UseAIChatOptions) {
  const {
    messages,
    addMessage,
    setIsLoading,
    setStreamingContent,
    appendStreamingContent,
    finalizeStreaming,
    setConversationId,
  } = useChatStore();

  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);

  const [isLoading, setIsLoadingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const onChunkRef = useRef(options?.onChunk);

  // Keep onChunkRef up to date
  onChunkRef.current = options?.onChunk;

  const sendMessage = useCallback(
    async (
      message: string,
      sendOptions?: { contextHtml?: string; autoGenerate?: boolean; templateId?: string | null }
    ) => {
      if (!message.trim()) return;

      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      const conversationId = options?.conversationId ?? useChatStore.getState().conversationId;

      if (!conversationId) {
        setError('No active conversation');
        return;
      }

      // Add user message (skip if autoGenerate - message already exists in history)
      const isAutoGenerate = sendOptions?.autoGenerate;
      if (!isAutoGenerate) {
        addMessage({
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
        });
      }

      // Add placeholder assistant message
      addMessage({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      setIsLoading(true);
      setIsLoadingLocal(true);
      setStreamingContent('');
      setError(null);

      // Set generating state for auto-generate mode (document generation)
      if (isAutoGenerate) {
        setIsGenerating(true);
      }

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            message,
            contextHtml: sendOptions?.contextHtml,
            category: options?.category,
            templateId: sendOptions?.templateId ?? options?.templateId,
            autoGenerate: isAutoGenerate,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedHtml = ''; // Local accumulation for onChunk callback

        while (true) {
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

              switch (event.type) {
                case 'content':
                  accumulatedHtml += event.data;
                  appendStreamingContent(event.data);
                  // Call onChunk callback with accumulated HTML for real-time editor update
                  onChunkRef.current?.(accumulatedHtml);
                  break;
                case 'status':
                  // Optional: could show status in UI
                  break;
                case 'done':
                  break;
                case 'error':
                  throw new Error(event.data);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }

        finalizeStreaming();

        // Reset generating state after successful completion
        if (isAutoGenerate) {
          setIsGenerating(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Chat failed');
        setIsGenerating(false);
      } finally {
        setIsLoading(false);
        setIsLoadingLocal(false);
      }
    },
    [options?.conversationId, options?.category, options?.templateId, addMessage, setIsLoading, setStreamingContent, appendStreamingContent, finalizeStreaming, setIsGenerating],
  );

  const insertIntoEditor = useCallback(
    (content: string) => {
      setPendingEditorContent(content);
    },
    [setPendingEditorContent],
  );

  return {
    sendMessage,
    insertIntoEditor,
    isLoading,
    messages,
    error,
  };
}
