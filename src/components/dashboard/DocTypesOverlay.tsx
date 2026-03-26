'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { documentTypes } from '@/data/documentTypes';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';

export function DocTypesOverlay() {
  const t = useTranslations('editor');
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const [search, setSearch] = useState('');

  const filteredTypes = search
    ? documentTypes.filter((dt) =>
        t(`docTypes.${dt.key}` as 'dashboard.docTypes.businessPlan')
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : documentTypes;

  const handleSelectType = (key: string) => {
    setActiveDocType(key);
    setEditorView('templates');
    toggleDocTypesOverlay();
  };

  return (
    <div className="absolute inset-0 bg-white z-20 animate-[slideInLeft_0.25s_ease-out] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">{t('docTypePanelTitle')}</h2>
        <button
          onClick={toggleDocTypesOverlay}
          className="text-gray-400 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-0.5">
          {filteredTypes.map((dt) => (
            <button
              key={dt.key}
              onClick={() => handleSelectType(dt.key)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span>{t(`docTypes.${dt.key}` as 'dashboard.docTypes.businessPlan')}</span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
