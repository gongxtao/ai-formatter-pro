'use client';

import { useCallback } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useSSEStream } from '@/hooks/useSSEStream';

export function useAIGeneration() {
  const router = useRouter();
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);
  const setGenerationSessionId = useDashboardStore((s) => s.setGenerationSessionId);
  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);
  const isGenerating = useDashboardStore((s) => s.isGenerating);

  const { start, abort } = useSSEStream();

  const cancel = useCallback(() => {
    abort();
    setIsGenerating(false);
  }, [abort, setIsGenerating]);

  const generate = useCallback(
    async (params: {
      category: string;
      prompt: string;
      topic?: string;
      industry?: string;
      model?: string;
    }) => {
      setIsGenerating(true);

      await start('/api/ai/init', params, {
        onEvent: (event) => {
          switch (event.type) {
            case 'status':
            case 'done':
              break;
            case 'content':
            case 'completion':
              // These events are no longer produced by /api/ai/init
              // (it only returns ready_to_generate or clarification_needed)
              break;
            case 'error':
              throw new Error(event.data || 'Unknown error');
            case 'clarification_needed':
              if (event.conversationId) {
                router.push(`/create?conversationId=${event.conversationId}&message=${encodeURIComponent(params.prompt)}`);
                return true;
              }
              if (event.sessionId) {
                setGenerationSessionId(event.sessionId);
                router.push(`/create?sessionId=${event.sessionId}&message=${encodeURIComponent(params.prompt)}`);
                return true;
              }
              console.error('[useAIGeneration] clarification_needed event missing conversationId/sessionId');
              return true;
            case 'ready_to_generate':
              if (event.conversationId && event.category) {
                setGenerateParams({
                  conversationId: event.conversationId,
                  category: event.category,
                  templateId: event.templateId ?? null,
                  shouldAutoGenerate: true,
                });
                router.push('/editor');
                return true;
              }
              console.error('[useAIGeneration] ready_to_generate event missing required fields');
              return true;
          }
          return false;
        },
        onError: (err) => {
          console.error('[useAIGeneration]', err);
        },
        onComplete: () => {
          // Stream ended without a terminal event — nothing to do
        },
      });

      setIsGenerating(false);
    },
    [router, setIsGenerating, setGenerationSessionId, setGenerateParams, start],
  );

  return { generate, cancel, isGenerating };
}
