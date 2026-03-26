'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useAIGeneration } from '@/hooks/useAIGeneration';
import { GeneratingIndicator } from '@/components/ai/GeneratingIndicator';
import { XIcon } from '@/components/landing/icons/XIcon';
import { PlusIcon } from '@/components/landing/icons/PlusIcon';
import { ChevronDownIcon } from '@/components/landing/icons/ChevronDownIcon';
import { WebSearchIcon } from './icons/WebSearchIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { GenerateIcon } from './icons/GenerateIcon';

export function DashboardChatBox() {
  const t = useTranslations('dashboard');
  const tAi = useTranslations('ai');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const docTypeLabel = t(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');
  const [bannerVisible, setBannerVisible] = useState(true);
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
      <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 overflow-hidden text-left relative max-w-[840px] mx-auto">
        <div className="p-8">
          <GeneratingIndicator progress={progress} statusMessage={statusMessage} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[20px] shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 overflow-hidden text-left relative max-w-[840px] mx-auto">
      {bannerVisible && (
        <div className="bg-[#F8F9FF] px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white">G</div>
            <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-[10px] text-white">C</div>
          </div>
          <a href="#" className="text-primary text-sm font-medium hover:underline">{t('bannerUpgrade')}</a>
          <span className="text-gray-500 text-sm">{t('bannerHint')}</span>
          <button className="ml-auto text-gray-400 hover:text-gray-600" onClick={() => setBannerVisible(false)}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="p-5 pb-4">
        <div className="flex items-center flex-wrap gap-2 text-[15px] text-gray-700 mb-8">
          <span>{t('chatTopicTag', { docTypeLower: docTypeLabel.toLowerCase() })}</span>
          <span className="bg-gray-100 px-3 py-1.5 rounded-md text-gray-400 cursor-text min-w-[80px] inline-block text-center">
            {t('topic')}
          </span>
          <span>in</span>
          <span className="bg-gray-100 px-3 py-1.5 rounded-md text-gray-400 cursor-text min-w-[80px] inline-block text-center">
            {t('industry')}
          </span>
        </div>

        {/* Prompt input */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            rows={2}
            placeholder={t('searchPlaceholder')}
            className="w-full resize-none border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none placeholder:text-gray-400"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <p className="text-sm text-red-600">{tAi('errorGenerating')}</p>
            <button
              onClick={handleGenerate}
              className="text-sm text-red-600 font-medium hover:underline"
            >
              {tAi('errorRetry')}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <PlusIcon className="w-4 h-4" />
            </button>
            <button className="px-4 py-2 rounded-full border border-gray-200 text-[13px] font-medium text-primary hover:bg-gray-50 flex items-center gap-2">
              <WebSearchIcon className="w-4 h-4" />
              {t('webSearch')}
              <XIcon className="w-3 h-3 text-primary" />
            </button>
            <button className="px-4 py-2 rounded-full border border-gray-200 text-[13px] font-medium text-primary hover:bg-gray-50 flex items-center gap-2">
              <DocumentIcon className="w-4 h-4" />
              {docTypeLabel}
              <XIcon className="w-3 h-3 text-primary" />
            </button>
            <button className="px-4 py-2 rounded-full border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
              {t('lightAi')}
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim()}
              className="px-6 py-2.5 rounded-full bg-primary text-white text-[15px] font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <GenerateIcon className="w-4 h-4" />
              {t('generate')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
