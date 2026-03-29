'use client';

import { useTranslations } from 'next-intl';
import { ExportDropdown } from './ExportDropdown';

interface EditorToolbarBarProps {
  editorView: 'editor' | 'templates';
  onBackToTemplates: () => void;
  onBackToEditor: () => void;
  docTitle: string;
  isSaving: boolean;
  showSavedIcon: boolean;
  handleSave: () => void;
  editorToolbar: React.ReactNode;
  isGenerating?: boolean;
}

export function EditorToolbarBar({
  editorView,
  onBackToTemplates,
  onBackToEditor,
  docTitle,
  isSaving,
  showSavedIcon,
  handleSave,
  editorToolbar,
  isGenerating = false,
}: EditorToolbarBarProps) {
  const t = useTranslations('editor');
  const th = useTranslations('history');

  // 模板视图：只显示返回编辑器按钮
  if (editorView === 'templates') {
    return (
      <div className="h-[50px] border-b border-gray-100 flex items-center px-6 flex-shrink-0 bg-white">
        <button
          onClick={onBackToEditor}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('backToEditor')}
        </button>
      </div>
    );
  }

  // 编辑器视图：两行工具栏
  return (
    <div className="flex flex-col bg-white border-b border-gray-200 shrink-0">
      {/* First row: Back & Actions */}
      <header className="h-[50px] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToTemplates}
            disabled={isGenerating}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToTemplates')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || isGenerating}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm12 0c0 1.1-.9 2-2 2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            ) : showSavedIcon ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            )}
            {t('save')}
          </button>
          <ExportDropdown docTitle={docTitle || t('untitled')} disabled={isGenerating} />
        </div>
      </header>

      {/* Second row: Formatting toolbar */}
      {editorToolbar && (
        <div className="flex items-center justify-center gap-1 px-4 py-1.5 bg-[#F9FAFB] border-t border-gray-200 overflow-x-auto hide-scrollbar text-gray-600">
          {editorToolbar}
        </div>
      )}
    </div>
  );
}
