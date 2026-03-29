'use client';

import { sanitizeHtml } from '@/lib/utils/sanitize';

interface ChatStreamProps {
  content: string;
  isStreaming?: boolean;
}

export function ChatStream({ content, isStreaming }: ChatStreamProps) {
  if (!content && !isStreaming) return null;

  return (
    <span>
      <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }} />
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
      )}
    </span>
  );
}
