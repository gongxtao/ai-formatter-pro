'use client';

import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';

interface EditorInitOptions {
  conversationId: string | null;
  category: string | null;
  templateId: string | null;
  shouldAutoGenerate: boolean;
  /** Called exactly once when auto-generation should fire after init completes. */
  onAutoGenerate?: (lastUserMessage: string) => void;
}

/**
 * Hook to handle editor initialization:
 * 1. Load conversation from API if not already in chat store
 * 2. Set document type and template
 * 3. Trigger auto-generation if needed (fires exactly once via ref guard)
 */
export function useEditorInit(options: EditorInitOptions) {
  const { conversationId, category, templateId, shouldAutoGenerate } = options;

  const initConversation = useChatStore((s) => s.initConversation);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const chatConversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);

  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);
  const setIsAutoGenerating = useDashboardStore((s) => s.setIsAutoGenerating);
  const clearGenerateParams = useDashboardStore((s) => s.clearGenerateParams);
  const generateParams = useDashboardStore((s) => s.generateParams);

  // Track if initialization is complete
  const initCompleteRef = useRef(false);
  // Track if we've triggered auto-generation
  const autoGenerateTriggeredRef = useRef(false);
  // Keep latest callback via ref to avoid stale closures and dependency churn
  const onAutoGenerateRef = useRef(options.onAutoGenerate);
  onAutoGenerateRef.current = options.onAutoGenerate;

  // Effective values (URL params > generateParams)
  const effectiveConvId = conversationId || generateParams.conversationId;
  const effectiveCategory = category || generateParams.category;
  const effectiveTemplateId = templateId || generateParams.templateId;
  const effectiveShouldAutoGen = shouldAutoGenerate || generateParams.shouldAutoGenerate;

  // Initialize conversation and trigger auto-generation
  useEffect(() => {
    if (!effectiveConvId || initCompleteRef.current) return;

    // Trigger auto-generate (fires exactly once via ref guard)
    const tryAutoGenerate = () => {
      if (!effectiveShouldAutoGen) return;
      if (autoGenerateTriggeredRef.current) return;
      autoGenerateTriggeredRef.current = true;

      const lastUserMsg = [...useChatStore.getState().messages]
        .reverse()
        .find((m) => m.role === 'user')?.content;
      if (lastUserMsg && onAutoGenerateRef.current) {
        setIsAutoGenerating(true);
        onAutoGenerateRef.current(lastUserMsg);
      }
    };

    // Check if chat store already has this conversation's messages
    const hasMessagesInStore = chatConversationId === effectiveConvId && messages.length > 0;

    if (hasMessagesInStore) {
      initCompleteRef.current = true;

      if (effectiveCategory) {
        setActiveDocType(effectiveCategory);
        setActiveTemplateCategory(effectiveCategory);
      }
      if (effectiveTemplateId) {
        setSelectedTemplateId(effectiveTemplateId);
      }
      if (generateParams.conversationId) {
        clearGenerateParams();
      }

      // Messages already loaded — trigger synchronously
      tryAutoGenerate();
      return;
    }

    // Dashboard flow: load conversation from API
    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/ai/chat/conversations/${effectiveConvId}`);

        if (res.status === 404) {
          setConversationId(effectiveConvId);
        } else if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            initConversation(effectiveConvId, data.messages);
          } else {
            setConversationId(effectiveConvId);
          }
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
        setConversationId(effectiveConvId);
      }

      if (effectiveCategory) {
        setActiveDocType(effectiveCategory);
        setActiveTemplateCategory(effectiveCategory);
      }
      if (effectiveTemplateId) {
        setSelectedTemplateId(effectiveTemplateId);
      }

      initCompleteRef.current = true;

      if (generateParams.conversationId) {
        clearGenerateParams();
      }

      // Trigger after async load completes
      tryAutoGenerate();
    };

    loadConversation();
  }, [
    effectiveConvId,
    effectiveCategory,
    effectiveTemplateId,
    effectiveShouldAutoGen,
    chatConversationId,
    messages.length,
    initConversation,
    setConversationId,
    setActiveDocType,
    setActiveTemplateCategory,
    setSelectedTemplateId,
    setIsAutoGenerating,
    clearGenerateParams,
    generateParams.conversationId,
  ]);

  return {
    effectiveCategory,
    effectiveTemplateId,
  };
}
