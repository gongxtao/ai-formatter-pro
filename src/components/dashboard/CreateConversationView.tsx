'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useChatStore } from '@/stores/useChatStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { getUserId } from '@/lib/utils/user-id';

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialMessageSentRef = useRef(false);

  const conversationId = useChatStore((s) => s.conversationId);
  const messages = useChatStore((s) => s.messages);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);

  const setGenerateParams = useDashboardStore((s) => s.setGenerateParams);

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

        const data = await response.json();

        if (data.type === 'ready_to_generate') {
          // Intent is clear - navigate to editor
          addMessage({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: `好的，我将为你生成文档...`,
          });

          setGenerateParams({
            conversationId,
            category: data.category,
            templateId: data.templateId,
            shouldAutoGenerate: true,
          });

          router.push('/dashboard/editor');
        } else {
          // Continue conversation
          addMessage({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.content,
          });
        }
      } catch (error) {
        console.error('Clarify error:', error);
        addMessage({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，出了点问题。请重试。',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, conversationId, addMessage, setGenerateParams, router]
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
  }, [messages]);

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      {/* MiniNav placeholder */}
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0" />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col max-w-2xl mx-auto py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8 px-4">
          创建文档
        </h1>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 py-8">
              <p>描述你想创建的文档，我会帮你选择合适的模板...</p>
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
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                <span className="animate-pulse">思考中...</span>
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
              placeholder="描述你想创建的文档..."
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
