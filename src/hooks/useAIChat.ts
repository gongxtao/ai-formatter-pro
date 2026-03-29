'use client';

import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import type { GenerationStatus } from '@/stores/useChatStore';
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
    addMessage,
    setIsLoading,
    setStreamingContent,
    appendStreamingContent,
    finalizeStreaming,
    updateMessageGenerationStatus,
  } = useChatStore();

  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);
  const setIsAutoGenerating = useDashboardStore((s) => s.setIsAutoGenerating);

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

      const isAutoGenerate = sendOptions?.autoGenerate;

      // Track the assistant message ID for generation status updates
      let assistantMsgId = '';

      if (!isAutoGenerate) {
        addMessage({
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
        });

        assistantMsgId = `assistant-${Date.now()}`;
        addMessage({
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          isStreaming: true,
        });
      } else {
        // For auto-generate, find the existing streaming message
        const msgs = useChatStore.getState().messages;
        const streamingMsg = msgs.findLast((m) => m.isStreaming);
        if (streamingMsg) {
          assistantMsgId = streamingMsg.id;
        }
      }

      setIsLoading(true);
      setIsLoadingLocal(true);
      setStreamingContent('');
      setError(null);

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
        let accumulatedHtml = '';
        // Whether the API signalled this is a document generation (not a plain text chat)
        let isDocGeneration = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            let event: StreamEvent;
            try {
              event = JSON.parse(trimmed.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case 'generation_start':
                isDocGeneration = true;
                if (assistantMsgId) {
                  updateMessageGenerationStatus(assistantMsgId, {
                    status: 'generating',
                    documentType: event.documentType,
                  });
                }
                break;

              case 'content':
                if (event.data) {
                  accumulatedHtml += event.data;
                  // For document generation: only update editor, not chat stream
                  if (!isDocGeneration) {
                    appendStreamingContent(event.data);
                  }
                  // Always update editor via callback
                  onChunkRef.current?.(accumulatedHtml);
                }
                break;

              case 'generation_complete':
                if (assistantMsgId) {
                  updateMessageGenerationStatus(assistantMsgId, {
                    status: 'completed',
                    documentType: event.documentType,
                  });
                }
                break;

              case 'status':
                break;

              case 'done':
                break;

              case 'error':
                throw new Error(event.data || 'Unknown error');
            }
          }
        }

        // Finalize: sync accumulated content into the message
        // For doc generation the content goes to editor only, clear the streaming content
        finalizeStreaming();

        if (isAutoGenerate) {
          setIsGenerating(false);
          setIsAutoGenerating(false);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;

        const errMsg = err instanceof Error ? err.message : 'Chat failed';
        setError(errMsg);

        // Mark generation as failed if it was generating
        if (assistantMsgId) {
          const msgs = useChatStore.getState().messages;
          const msg = msgs.find((m) => m.id === assistantMsgId);
          if (msg?.generationStatus?.status === 'generating') {
            updateMessageGenerationStatus(assistantMsgId, null);
          }
        }

        setIsGenerating(false);
        setIsAutoGenerating(false);
      } finally {
        setIsLoading(false);
        setIsLoadingLocal(false);
      }
    },
    [
      options?.conversationId,
      options?.category,
      options?.templateId,
      addMessage,
      setIsLoading,
      setStreamingContent,
      appendStreamingContent,
      finalizeStreaming,
      updateMessageGenerationStatus,
      setIsGenerating,
      setIsAutoGenerating,
    ],
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
    error,
  };
}
