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
  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);

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
              const event: StreamEvent = JSON.parse(trimmed.slice(6));

              switch (event.type) {
                case 'status':
                  if (event.data) setStatusMessage(event.data);
                  if (event.percentage) setProgress(event.percentage);
                  break;
                case 'content':
                  if (event.data) {
                    accumulated += event.data;
                    setGeneratedContent(accumulated);
                  }
                  break;
                case 'completion':
                  if (event.data) {
                    accumulated = event.data;
                    setGeneratedContent(accumulated);
                  }
                  setProgress(100);
                  break;
                case 'done':
                  setProgress(100);
                  break;
                case 'error':
                  throw new Error(event.data || 'Unknown error');
                case 'clarification_needed':
                  // Navigate to create page with conversation ID and original prompt
                  if (event.conversationId) {
                    setIsGeneratingLocal(false);
                    setIsGenerating(false);
                    router.push(`/dashboard/create?conversationId=${event.conversationId}&message=${encodeURIComponent(params.prompt)}`);
                    return;
                  }
                  // Fallback to legacy sessionId-based route
                  if (event.sessionId) {
                    setGenerationSessionId(event.sessionId);
                    setIsGeneratingLocal(false);
                    setIsGenerating(false);
                    router.push(`/dashboard/create?sessionId=${event.sessionId}&message=${encodeURIComponent(params.prompt)}`);
                    return;
                  }
                  throw new Error('clarification_needed event missing conversationId/sessionId');
                case 'ready_to_generate':
                  // Server has matched a template, navigate to editor with params
                  if (event.conversationId && event.category) {
                    // Keep isGenerating true - the editor will handle the actual generation
                    // and reset isGenerating when complete
                    setIsGeneratingLocal(false);
                    // Store params for EditorShell to pick up
                    setGenerateParams({
                      conversationId: event.conversationId,
                      category: event.category,
                      templateId: event.templateId ?? null,
                      shouldAutoGenerate: true,
                    });
                    router.push(
                      `/dashboard/editor?conversationId=${event.conversationId}&category=${event.category}${event.templateId ? `&templateId=${event.templateId}` : ''}&generate=1`
                    );
                    return;
                  }
                  throw new Error('ready_to_generate event missing required fields');
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
    [router, setPendingEditorContent, setIsGenerating, setGenerationSessionId, setGenerateParams],
  );

  return { generate, isGenerating, generatedContent, progress, statusMessage, error };
}
