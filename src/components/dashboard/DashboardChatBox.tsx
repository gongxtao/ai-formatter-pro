'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { GeneratingIndicator } from '@/components/ai/GeneratingIndicator';
import { XIcon } from '@/components/landing/icons/XIcon';
import { PlusIcon } from '@/components/landing/icons/PlusIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { GenerateIcon } from './icons/GenerateIcon';

export function DashboardChatBox() {
  const t = useTranslations('dashboard');
  const tAi = useTranslations('ai');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const docTypeLabel = t(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');
  const [prompt, setPrompt] = useState('');

  const { generate, isGenerating, progress, statusMessage, error } = useAIGeneration();

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate({
      category: activeDocType,
      prompt: prompt.trim(),
    });
  };

  if (isGenerating) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-[840px] mx-auto">
        <GeneratingIndicator progress={progress} statusMessage={statusMessage} />
      </div>
    );
  }

  return (
    <div className="max-w-[840px] mx-auto">
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
          <p className="text-sm text-red-600">{tAi('errorGenerating')}</p>
          <button
            onClick={handleGenerate}
            className="text-sm text-red-600 font-medium hover:underline"
          >
            {tAi('errorRetry')}
          </button>
        </div>
      )}

      {/* Unified chat input container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col gap-4 relative">
        {/* Top: Text Input */}
        <div className="w-full pl-1">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent outline-none text-gray-700 text-base placeholder:text-gray-400 resize-none min-h-[48px]"
            rows={2}
          />
        </div>

        {/* Purple dot on the right side */}
        <div className="absolute right-6 top-[35%] w-1.5 h-1.5 rounded-full bg-indigo-600"></div>

        {/* Bottom: Tools */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-5">
            {/* Plus button */}
            <button className="text-gray-600 hover:text-gray-900 transition-colors">
              <PlusIcon className="w-5 h-5" />
            </button>

            {/* Document type selector */}
            <button className="flex items-center gap-1.5 text-blue-600 transition-colors text-sm font-medium">
              <DocumentIcon className="w-4 h-4" />
              <span>{docTypeLabel}</span>
              <XIcon className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {/* AI Model selector */}
            <button className="flex items-center gap-1 text-sm text-gray-700 font-medium hover:text-gray-900 transition-colors">
              Light AI
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Mic button */}
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
            
            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#2B00FF] hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <GenerateIcon className="w-4 h-4" />
              <span>{t('generate')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
