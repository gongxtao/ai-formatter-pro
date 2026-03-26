'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';
import { ScrollRightIcon } from './icons/ScrollRightIcon';

const filterLabels = {
  businessPlan: ['Business Plan', 'One Page Business Plan', 'Coffee Shop Business Plan', 'Restaurant Business Plan', 'Food Business Plan', 'Real Estate Business Plan', 'Executive Summary Business Plan'],
  resume: ['Resume', 'Simple Resume', 'High School Resume', 'Actor Resume', 'Accountant Resume', 'Academic Resume', 'Professional Resume'],
};

export function TemplateFilterBar() {
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const templateSearchQuery = useDashboardStore((s) => s.templateSearchQuery);
  const setTemplateSearchQuery = useDashboardStore((s) => s.setTemplateSearchQuery);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filters = filterLabels[activeDocType as keyof typeof filterLabels] || filterLabels.businessPlan;

  const handleScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative mb-8 pb-4 flex items-center sticky top-0 bg-[#FAFAFA] z-40 py-4">
      <div ref={scrollRef} className="flex items-center gap-3 overflow-x-auto hide-scrollbar flex-1 pr-10">
        <div className="relative min-w-[240px]">
          <SearchIcon className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder={t('templateSearchPlaceholder')}
            value={templateSearchQuery}
            onChange={(e) => setTemplateSearchQuery(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
        {filters.map((f, i) => (
          <button
            key={f}
            className={`whitespace-nowrap font-medium px-2 ${
              i === 0
                ? 'px-5 py-2 bg-blue-50 text-primary rounded-full text-sm'
                : 'text-[15px] text-gray-600 hover:text-gray-900'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-l from-white via-white to-transparent pl-8 pb-4">
        <button
          onClick={handleScroll}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-900 z-10"
        >
          <ScrollRightIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
