'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAIChat } from '@/hooks/useAIChat';
import { useEditorInit } from '@/hooks/useEditorInit';
import { ChatMessageBubble } from '@/components/ai/ChatMessageBubble';
import { getUserId } from '@/lib/utils/user-id';

export function AIChatSidebar() {
  const t = useTranslations('editor');
  const ta = useTranslations('ai');
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isLoading = useChatStore((s) => s.isLoading);
  const addMessage = useChatStore((s) => s.addMessage);

  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);
  const isAutoGenerating = useDashboardStore((s) => s.isAutoGenerating);

  const { effectiveCategory, effectiveTemplateId } = useEditorInit({
    onAutoGenerate: (lastUserMessage) => {
      const msgId = crypto.randomUUID();
      addMessage({
        id: msgId,
        role: 'assistant',
        content: '',
        isStreaming: true,
      });

      sendMessage(lastUserMessage, {
        contextHtml: currentEditorHtml,
        autoGenerate: true,
        templateId: effectiveTemplateId,
        assistantMsgId: msgId,
      });
    },
  });

  const { sendMessage } = useAIChat({
    conversationId,
    category: effectiveCategory ?? undefined,
    templateId: effectiveTemplateId,
    onChunk: (html: string) => {
      setCurrentEditorHtml(html);
    },
  });

  // Initialize with greeting if empty
  useEffect(() => {
    const state = useChatStore.getState();
    if (state.messages.length === 0 && !state.conversationId) {
      fetch('/api/ai/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat', userId: getUserId() }),
      })
        .then((res) => res.json())
        .then((json) => {
          // Guard: useEditorInit may have loaded messages while we were fetching
          const currentState = useChatStore.getState();
          if (currentState.messages.length > 0 || currentState.conversationId) return;

          if (json.data?.id) {
            useChatStore.getState().setConversationId(json.data.id);
            useChatStore.getState().setMessages([
              {
                id: 'greeting',
                role: 'assistant',
                content: "Hi! I'm your AI writing assistant. How can I help you with your document today?",
              },
            ]);
          }
        })
        .catch(() => {
          // Guard: same check for fallback path
          const currentState = useChatStore.getState();
          if (currentState.messages.length > 0 || currentState.conversationId) return;

          useChatStore.getState().setMessages([
            {
              id: 'greeting',
              role: 'assistant',
              content: "Hi! I'm your AI writing assistant. How can I help you with your document today?",
            },
          ]);
        });
    }
  }, []);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    // Pass current editor content as context for AI to edit/improve
    sendMessage(text, { contextHtml: currentEditorHtml });
  }, [input, isLoading, sendMessage, currentEditorHtml]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  // Find the currently streaming message
  const streamingMessage = messages.findLast((m) => m.isStreaming);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Formatter.NET</h2>
            <p className="text-xs text-gray-500">{t('aiAssistant')}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const genStatus = msg.generationStatus;
          const isAutoGenMessage = msg.isStreaming && isAutoGenerating && !genStatus;

          // Editor-specific generation status indicators — keep inline
          if (genStatus || isAutoGenMessage) {
            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[85%] bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed">
                  {genStatus?.status === 'generating' ? (
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-gray-600">
                        {ta('generatingDocStatus', { docType: genStatus.documentType || t('document') })}
                      </span>
                    </div>
                  ) : genStatus?.status === 'completed' ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 font-medium">
                        {ta('genCompleteStatus', { docType: genStatus.documentType || t('document') })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-gray-600">{ta('generating')}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Normal messages — use shared ChatMessageBubble
          return (
            <ChatMessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.isStreaming && streamingMessage ? streamingContent : msg.content}
              isStreaming={msg.isStreaming}
            />
          );
        })}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chatPlaceholder')}
            rows={2}
            disabled={isLoading}
            className="w-full resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 pr-11 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2.5 bottom-2.5 w-7 h-7 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
