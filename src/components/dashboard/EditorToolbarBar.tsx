'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { ExportDropdown } from './ExportDropdown';

export function EditorToolbarBar() {
  const t = useTranslations('editor');
  const editorView = useDashboardStore((s) => s.editorView);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const saveDocument = useHistoryStore((s) => s.saveDocument);
  const [docTitle, setDocTitle] = useState(t('untitled'));
  const [isSaving, setIsSaving] = useState(false);

  const handleBackToTemplates = useCallback(() => {
    setEditorView('templates');
  }, [setEditorView]);

  const handleSave = useCallback(() => {
    if (!currentEditorHtml.trim()) return;
    setIsSaving(true);
    saveDocument({ title: docTitle || t('untitled'), content: currentEditorHtml, category: activeDocType });
    setTimeout(() => setIsSaving(false), 800);
  }, [currentEditorHtml, docTitle, activeDocType, saveDocument, t]);

  if (editorView === 'templates') {
    return (
      <div className="h-[68px] border-b border-gray-100 flex items-center px-6 flex-shrink-0">
        <button
          onClick={handleBackToTemplates}
          className="text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToTemplates')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0">
      {/* Action bar */}
      <div className="h-[52px] border-b border-gray-100 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToTemplates}
            className="text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToTemplates')}
          </button>
          <div className="w-px h-5 bg-gray-200" />
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="text-sm font-medium text-gray-900 bg-transparent outline-none border-none px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50 min-w-[120px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {t('save')}
          </button>
          <ExportDropdown docTitle={docTitle || t('untitled')} />
        </div>
      </div>
    </div>
  );
}
