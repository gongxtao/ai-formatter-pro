'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';

interface EditorInitOptions {
  onAutoGenerate?: (lastUserMessage: string) => void;
}

// Module-level guard: survives React 18 Strict Mode unmount/remount cycle
const processedConversations = new Set<string>();

export function useEditorInit(options: EditorInitOptions) {
  // Keep latest callback via ref to avoid stale closures
  const onAutoGenerateRef = useRef(options.onAutoGenerate);
  useEffect(() => {
    onAutoGenerateRef.current = options.onAutoGenerate;
  });

  const generateParams = useDashboardStore((s) => s.generateParams);

  const chatConversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);

  // Effective values (store only)
  const effectiveConvId = generateParams.conversationId;
  const effectiveCategory = generateParams.category;
  const effectiveTemplateId = generateParams.templateId;
  const effectiveShouldAutoGen = generateParams.shouldAutoGenerate;

  // Initialize conversation and trigger auto-generation
  useEffect(() => {
    if (!effectiveConvId) return;

    // Module-level guard prevents double-trigger in Strict Mode
    if (processedConversations.has(effectiveConvId)) return;

    const dashStore = useDashboardStore.getState();

    // Trigger auto-generate (fires exactly once via module-level guard)
    const tryAutoGenerate = () => {
      if (!effectiveShouldAutoGen) return;
      if (processedConversations.has(effectiveConvId)) return;
      processedConversations.add(effectiveConvId);

      // Clear params immediately to prevent re-entry
      dashStore.clearGenerateParams();

      const lastUserMsg = [...useChatStore.getState().messages]
        .reverse()
        .find((m) => m.role === 'user')?.content;
      if (lastUserMsg && onAutoGenerateRef.current) {
        dashStore.setIsAutoGenerating(true);
        onAutoGenerateRef.current(lastUserMsg);
      }
    };

    // Check if chat store already has this conversation's messages
    const hasMessagesInStore = chatConversationId === effectiveConvId && messages.length > 0;

    if (hasMessagesInStore) {
      if (effectiveCategory) {
        dashStore.setActiveDocType(effectiveCategory);
        dashStore.setActiveTemplateCategory(effectiveCategory);
      }
      if (effectiveTemplateId) {
        dashStore.setSelectedTemplateId(effectiveTemplateId);
      }

      tryAutoGenerate();
      return;
    }

    // Dashboard flow: load conversation from API
    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/ai/chat/conversations/${effectiveConvId}`);

        if (res.status === 404) {
          useChatStore.getState().setConversationId(effectiveConvId);
        } else if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            useChatStore.getState().initConversation(effectiveConvId, data.messages);
          } else {
            useChatStore.getState().setConversationId(effectiveConvId);
          }
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
        useChatStore.getState().setConversationId(effectiveConvId);
      }

      if (effectiveCategory) {
        dashStore.setActiveDocType(effectiveCategory);
        dashStore.setActiveTemplateCategory(effectiveCategory);
      }
      if (effectiveTemplateId) {
        dashStore.setSelectedTemplateId(effectiveTemplateId);
      }

      tryAutoGenerate();
    };

    loadConversation();
  }, [effectiveConvId, effectiveCategory, effectiveTemplateId, effectiveShouldAutoGen, chatConversationId, messages.length]);

  return {
    effectiveCategory,
    effectiveTemplateId,
  };
}
