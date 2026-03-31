'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useToast } from '@/components/ui/Toast';
import type { ClarifyMessage, ClarifyResponse } from '@/types/clarify';

interface AIClarifyChatProps {
  sessionId: string;
}

export function AIClarifyChat({ sessionId }: AIClarifyChatProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ClarifyMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  // Send message to API
  const sendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ClarifyMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: messageText.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: ClarifyResponse = await response.json();

      if (data.type === 'complete' && data.html) {
        // Document generated - navigate to editor
        const assistantMessage: ClarifyMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `Great! I've generated your ${data.category || 'document'}. Redirecting to editor...`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);

        // Set content and navigate
        setPendingEditorContent(data.html);

        setTimeout(() => {
          router.push('/editor');
        }, 500);
      } else if (data.type === 'continue') {
        // Need more information
        const assistantMessage: ClarifyMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.content || 'What would you like to do?',
          quickReplies: data.quickReplies,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setQuickReplies(data.quickReplies || []);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      toast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, setPendingEditorContent, router, toast]);

  // Handle quick reply click
  const handleQuickReply = useCallback((reply: string) => {
    sendMessage(reply);
  }, [sendMessage]);

  // Handle form submit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }, [input, sendMessage]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-[#2B00FF] rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Document Creator</h1>
            <p className="text-sm text-gray-500">Tell me what you&apos;d like to create</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4" aria-live="polite" aria-label="Chat messages">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-[#2B00FF] text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Quick Replies */}
                {msg.quickReplies && msg.quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickReply(reply)}
                        disabled={isLoading}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors disabled:opacity-50"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start" role="status" aria-label="AI is thinking">
              <div className="bg-white text-gray-800 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              aria-label="Message input"
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2B00FF]/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-6 py-3 bg-[#2B00FF] text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
