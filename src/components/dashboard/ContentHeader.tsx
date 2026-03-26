'use client';

import { useTranslations } from 'next-intl';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';

export function ContentHeader() {
  const t = useTranslations('dashboard');

  return (
    <header className="w-full bg-white border-b border-gray-200 h-[68px] flex items-center justify-between px-8 sticky top-0 z-50 flex-shrink-0">
      <div className="cursor-pointer flex items-center">
        <span className="text-xl font-bold tracking-tighter text-gray-900 uppercase">
          <span className="text-primary">AI Formatter</span>
        </span>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-gray-600 hover:text-gray-900">
          <SearchIcon className="w-5 h-5" />
        </button>
        <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
          {t('pricing')}
        </button>
        <button className="text-sm font-medium text-gray-700 hover:text-gray-900">
          {t('signUp')}
        </button>
      </div>
    </header>
  );
}
