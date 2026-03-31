'use client';

import { ChatStream } from './ChatStream';

interface ChatMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export function ChatMessageBubble({
  role,
  content,
  isStreaming,
  isLoading,
  loadingText,
}: ChatMessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-gray-100 text-gray-800 rounded-bl-md prose prose-sm prose-gray max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mb-1.5 [&_p]:mb-2 [&_ul]:my-1 [&_li]:mb-0.5'
        }`}
      >
        {isUser ? (
          <span>{content}</span>
        ) : isLoading && !content ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {loadingText && <span className="text-gray-600">{loadingText}</span>}
          </div>
        ) : (
          <ChatStream content={content} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}
