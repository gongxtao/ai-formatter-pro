'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { StreamEvent } from '@/types/ai';

export function useAIGeneration() {
  const router = useRouter();
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);
  const setGenerationSessionId = useDashboardStore((s) => s.setGenerationSessionId);

  const [isGenerating, setIsGeneratingLocal] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (params: {
      category: string;
      prompt: string;
      topic?: string;
      industry?: string;
      model?: string;
    }) => {
      // Abort any previous generation
      abortRef.current?.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      setIsGeneratingLocal(true);
      setIsGenerating(true);
      setGeneratedContent(null);
      setProgress(0);
      setStatusMessage('Starting...');
      setError(null);

      let accumulated = '';

      try {
        const response = await fetch('/api/ai/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
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

            try {
              const event = JSON.parse(trimmed.slice(6)) as StreamEvent & { sessionId?: string; question?: string };

              switch (event.type) {
                case 'status':
                  setStatusMessage(event.data);
                  if (event.percentage) setProgress(event.percentage);
                  break;
                case 'content':
                  accumulated += event.data;
                  setGeneratedContent(accumulated);
                  break;
                case 'completion':
                  accumulated = event.data;
                  setGeneratedContent(accumulated);
                  setProgress(100);
                  break;
                case 'done':
                  setProgress(100);
                  break;
                case 'error':
                  throw new Error(event.data);
                case 'clarification_needed':
                  // Store session ID and navigate to clarify chat
                  setGenerationSessionId(event.sessionId ?? null);
                  setIsGeneratingLocal(false);
                  setIsGenerating(false);
                  router.push(`/dashboard/ai-chat/${event.sessionId}`);
                  return; // Stop processing stream
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'Unexpected end of JSON input') {
                throw e;
              }
            }
          }
        }

        // Success — store content and navigate to editor
        setPendingEditorContent(accumulated);
        router.push('/dashboard/editor');
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setIsGeneratingLocal(false);
        setIsGenerating(false);
      }
    },
    [router, setPendingEditorContent, setIsGenerating, setGenerationSessionId],
  );

  return { generate, isGenerating, generatedContent, progress, statusMessage, error };
}
