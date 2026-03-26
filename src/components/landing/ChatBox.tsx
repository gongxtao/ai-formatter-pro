'use client';

import { useTranslations } from 'next-intl';
import { PlusIcon } from './icons/PlusIcon';
import { MicIcon } from './icons/MicIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { XIcon } from './icons/XIcon';

interface ChatBoxProps {
  activeDocType: string;
}

export function ChatBox({ activeDocType }: ChatBoxProps) {
  const t = useTranslations('landing.hero');

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-200 overflow-hidden text-left relative z-10">
      {/* Top Banner */}
      <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-3 border-b border-gray-100">
        <div className="flex -space-x-1">
          <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white">G</div>
          <div className="w-5 h-5 rounded bg-green-500 flex items-center justify-center text-[10px] text-white">C</div>
        </div>
        <a href="#" className="text-primary text-xs font-medium hover:underline">{t('bannerUpgrade')}</a>
        <span className="text-gray-500 text-xs">{t('bannerHint')}</span>
        <button className="ml-auto text-gray-400 hover:text-gray-600">
          <XIcon />
        </button>
      </div>

      {/* Input Area */}
      <div className="p-4">
        <textarea
          className="w-full text-base text-gray-800 placeholder-gray-400 border-none focus:ring-0 resize-none outline-none"
          rows={3}
          placeholder={t('chatPlaceholder')}
        />

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <PlusIcon />
            </button>
            <button className="px-4 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {t('tools')}
            </button>
            <button className="px-4 py-1.5 rounded-full border border-gray-200 text-sm font-medium text-primary bg-blue-50">
              {activeDocType}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <MicIcon />
            </button>
            <button className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary-hover transition-colors shadow-md">
              <ArrowRightIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
