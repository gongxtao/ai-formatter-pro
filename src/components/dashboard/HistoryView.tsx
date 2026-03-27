'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Input } from '@/components/ui/Input';
import { HistoryCard } from './HistoryCard';

export function HistoryView() {
  const t = useTranslations('history');
  const documents = useHistoryStore((s) => s.documents);
  const loadDocuments = useHistoryStore((s) => s.loadDocuments);
  const searchQuery = useHistoryStore((s) => s.searchQuery);
  const setSearchQuery = useHistoryStore((s) => s.setSearchQuery);
  const filteredDocuments = useHistoryStore((s) => s.filteredDocuments);
  const setEditorView = useDashboardStore((s) => s.setEditorView);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadDocuments();
    setMounted(true);
  }, [loadDocuments]);

  const filtered = useMemo(() => filteredDocuments(), [filteredDocuments, documents, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('title')}</h2>

        <div className="relative mb-6">
          <svg className="absolute left-3 top-[38px] w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="!pl-10 !bg-gray-50"
            aria-label={t('searchPlaceholder')}
          />
        </div>

        {filtered.length === 0 && documents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">{t('emptyTitle')}</p>
            <p className="text-xs mt-1 mb-4">{t('emptyDescription')}</p>
            <button
              onClick={() => setEditorView('templates')}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
            >
              {t('emptyCta')}
            </button>
          </div>
        )}

        {filtered.length === 0 && documents.length > 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p className="text-sm">{t('noResults')}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <HistoryCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
