'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useExport } from '@/hooks/useExport';
import { useDashboardStore } from '@/stores/useDashboardStore';
import type { ExportFormat } from '@/lib/export/types';

interface ExportDropdownProps {
  docTitle: string;
}

const formats: { key: ExportFormat; label: string; color: string }[] = [
  { key: 'pdf', label: 'PDF', color: 'text-red-500' },
  { key: 'docx', label: 'DOCX', color: 'text-blue-500' },
  { key: 'html', label: 'HTML', color: 'text-orange-500' },
];

export function ExportDropdown({ docTitle }: ExportDropdownProps) {
  const t = useTranslations('editor');
  const { isExporting, exportDocument } = useExport();
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleExport = async (format: ExportFormat) => {
    setIsOpen(false);
    await exportDocument(format, docTitle, currentEditorHtml);
  };

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
      >
        {isExporting ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
        {isExporting ? t('exporting') : t('download')}
      </button>
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg animate-[fade_0.15s_ease-in-out]">
          {formats.map((fmt, i) => (
            <div key={fmt.key}>
              {i > 0 && <div className="my-1 h-px bg-gray-200" />}
              <button
                onClick={() => handleExport(fmt.key)}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <svg className={`w-4 h-4 ${fmt.color}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
                {fmt.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
