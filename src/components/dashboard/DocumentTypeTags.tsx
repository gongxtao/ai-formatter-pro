'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { documentTypes } from '@/data/documentTypes';
import { DocumentIcon } from './icons/DocumentIcon';
import { ScrollRightIcon } from './icons/ScrollRightIcon';

export function DocumentTypeTags() {
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const triggerShuffle = useDashboardStore((s) => s.triggerShuffle);
  const scrollRef = useRef<HTMLDivElement>(null);

  const tagTypes = documentTypes.filter((dt) => !dt.hasChevron).slice(1, 8);

  const handleScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-6 flex items-center gap-2 max-w-[840px] mx-auto relative">
      <div ref={scrollRef} className="flex gap-2.5 overflow-x-auto hide-scrollbar flex-1 pb-1">
        {tagTypes.map((dt) => {
          const isActive = activeDocType === dt.key;
          return (
            <button
              key={dt.key}
              onClick={() => {
                setActiveDocType(dt.key);
                triggerShuffle();
              }}
              className={`whitespace-nowrap px-5 py-2 rounded-full border text-sm font-medium flex items-center gap-2 ${
                isActive
                  ? 'border-primary bg-[#F8F9FF] text-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <DocumentIcon className="w-4 h-4" />
              {t(dt.labelKey)}
            </button>
          );
        })}
      </div>
      <button
        onClick={handleScroll}
        className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-white shadow-sm flex-shrink-0 z-10 hover:bg-gray-50"
      >
        <ScrollRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
}
