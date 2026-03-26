'use client';

import { useTranslations } from 'next-intl';

interface GeneratingIndicatorProps {
  progress?: number;
  statusMessage?: string;
}

export function GeneratingIndicator({ progress = 0, statusMessage }: GeneratingIndicatorProps) {
  const t = useTranslations('ai');

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      {/* Spinner */}
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />

      {/* Status text */}
      <p className="text-sm text-gray-500 text-center">
        {statusMessage || t('generatingContent')}
      </p>

      {/* Progress bar */}
      <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
    </div>
  );
}
