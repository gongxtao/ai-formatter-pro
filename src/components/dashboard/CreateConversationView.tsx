'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { MiniNav } from './MiniNav';
import { getUserId } from '@/lib/utils/user-id';
import type { NavItem } from '@/types/dashboard';

interface CreateConversationViewProps {
  initialConversationId?: string;
  initialMessage?: string;
}

export function CreateConversationView({
  initialConversationId,
  initialMessage,
}: CreateConversationViewProps) {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);
  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);
  const categories = useTemplatesStore((s) => s.categories);
  const resetTemplates = useTemplatesStore((s) => s.resetTemplates);

  // Handle navigation from MiniNav
  const handleNav = useCallback(
    (key: NavItem) => {
      setActiveNav(key);

      if (key === 'home') {
        setActiveFilterTag(null);
        resetTemplates();
        if (categories.length > 0) {
          setActiveDocType(categories[0]);
          setActiveTemplateCategory(categories[0]);
        }
        router.push('/dashboard');
      } else {
        router.push(`/dashboard?view=${key}`);
      }
    },
    [setActiveNav, setActiveFilterTag, setActiveDocType, setActiveTemplateCategory, resetTemplates, categories, router]
  );

  // Initialize conversation
  useEffect(() => {
    const init = async () => {
      if (isInitialized) return;

      if (initialConversationId) {
        setConversationId(initialConversationId);
        // Load messages from database
        try {
          const res = await fetch(`/api/ai/chat/conversations/${initialConversationId}/messages`);
          if (res.ok) {
            const data = await res.json();
            setMessages(data.data || []);
          }
        } catch (e) {
          console.error('Failed to load messages:', e);
        }
      } else {
        // Create new conversation
        try {
          const res = await fetch('/api/ai/chat/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'New Document', userId: getUserId() }),
          });
          const data = await res.json();
          if (data.data?.id) {
            setConversationId(data.data.id);
          }
        } catch (e) {
          console.error('Failed to create conversation:', e);
        }
      }

      setIsInitialized(true);
    };

    init();
  }, [initialConversationId, setConversationId, setMessages, isInitialized]);

  // Send initial message if provided
  useEffect(() => {
    if (
      initialMessage &&
      conversationId &&
      messages.length === 0 &&
      !initialMessageSentRef.current &&
      isInitialized
    ) {
      initialMessageSentRef.current = true;
      handleSend(initialMessage);
    }
  }, [initialMessage, conversationId, messages.length, isInitialized]);

  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText || input).trim();
      if (!text || isLoading || !conversationId) return;

      setInput('');
      setIsLoading(true);
      setStreamingContent('');

      // Add user message to UI
      addMessage({
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      });

      try {
        const response = await fetch('/api/ai/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            message: text,
          }),
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';

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
              const event = JSON.parse(trimmed.slice(6));

              if (event.type === 'content') {
                // Accumulate streaming content
                accumulatedContent += event.data;
                setStreamingContent(accumulatedContent);
              }

              if (event.type === 'ready_to_generate') {
                // Intent is clear - finalize streaming message and navigate to editor
                const finalContent = accumulatedContent || event.data || t('generatingDocument');

                // Clear streaming state first
                setStreamingContent('');

                // Add final message
                addMessage({
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: finalContent,
                });

                setGenerateParams({
                  conversationId,
                  category: event.category,
                  templateId: event.templateId,
                  shouldAutoGenerate: true,
                });

                setIsLoading(false);
                router.push('/dashboard/editor');
                return;
              }

              if (event.type === 'continue') {
                // Continue conversation - streaming content is already displayed
                // Just finalize by moving streaming content to messages
                if (accumulatedContent) {
                  addMessage({
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: accumulatedContent,
                  });
                  setStreamingContent('');
                }
              }

              if (event.type === 'error') {
                setStreamingContent('');
                addMessage({
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: event.data || t('errorOccurred'),
                });
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        // If we still have streaming content but no final event, add it as a message
        if (accumulatedContent) {
          setStreamingContent('');
          addMessage({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: accumulatedContent,
          });
        }
      } catch (error) {
        console.error('Clarify error:', error);
        setStreamingContent('');
        addMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: t('errorOccurred'),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, conversationId, addMessage, setGenerateParams, router, t]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0">
        <MiniNav onNavigate={handleNav} />
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8 px-4">
          {t('createDocument')}
        </h1>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-4">
          {messages.length === 0 && !isLoading && !streamingContent && (
            <div className="text-center text-gray-500 py-8">
              <p>{t('describeDocument')}</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {/* Streaming content - show in real-time */}
          {streamingContent && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed">
                {streamingContent}
              </div>
            </div>
          )}
          {/* Loading indicator - only show when no streaming content yet */}
          {isLoading && !streamingContent && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                <span className="animate-pulse">{t('thinking')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('describeDocumentPlaceholder')}
              rows={2}
              disabled={isLoading}
              className="w-full resize-none border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-40"
              aria-label="Send message"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
