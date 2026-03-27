'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';

export function DocTypesOverlay() {
  const t = useTranslations('editor');
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const categories = useTemplatesStore((s) => s.categories);
  const [search, setSearch] = useState('');

  const filteredTypes = search
    ? categories.filter((cat) =>
        cat.toLowerCase().includes(search.toLowerCase())
      )
    : categories;

  const handleSelectType = (key: string) => {
    setActiveDocType(key);
    setEditorView('templates');
    toggleDocTypesOverlay();
  };

  return (
    <div className="absolute inset-0 bg-white z-20 animate-[slideInLeft_0.25s_ease-out] flex flex-col">
      {/* Header with Edit and Menu icons */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">{t('docTypePanelTitle')}</span>
        <div className="flex gap-2 text-gray-500">
          <button
            className="hover:text-gray-900 transition-colors"
            title={t('edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={toggleDocTypesOverlay}
            className="hover:text-gray-900 transition-colors"
            title={t('close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Search with rounded-full */}
      <div className="p-3 flex-shrink-0">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-9 pr-4 text-[13px] focus:ring-1 focus:ring-primary outline-none"
          />
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto pb-32">
        <div className="space-y-0.5 p-3">
          {filteredTypes.map((cat) => (
            <button
              key={cat}
              onClick={() => handleSelectType(cat)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <span>{cat}</span>
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
