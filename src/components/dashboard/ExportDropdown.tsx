'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useToast } from '@/components/ui/Toast';
import { exportPdf } from '@/lib/export/pdf-export';

interface ExportDropdownProps {
  docTitle: string;
  disabled?: boolean;
  /** Called before export to flush any pending content (e.g. iframe debounce) */
  onBeforeExport?: () => void;
  /** Returns the editor iframe element for WYSIWYG PDF export */
  getIframeElement?: () => HTMLIFrameElement | null;
}

export function ExportDropdown({ docTitle, disabled = false, onBeforeExport, getIframeElement }: ExportDropdownProps) {
  const t = useTranslations('editor');
  const th = useTranslations('history');
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = useCallback(async () => {
    onBeforeExport?.();
    const html = useDashboardStore.getState().currentEditorHtml;
    if (!html.trim()) {
      toast(th('exportFailed', { error: 'No content' }), 'error', 3000);
      return;
    }
    const iframeEl = getIframeElement?.() ?? undefined;
    setIsExporting(true);
    try {
      const result = await exportPdf({ title: docTitle, content: html, format: 'pdf', iframeElement: iframeEl });
      if (!result.success) {
        toast(th('exportFailed', { error: result.error || 'Unknown error' }), 'error', 3000);
      }
    } finally {
      setIsExporting(false);
    }
  }, [docTitle, onBeforeExport, getIframeElement, toast, th]);

  return (
    <button
      onClick={handleExportPdf}
      disabled={isExporting || disabled}
      className="px-4 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 3H7m5-6V4" />
        </svg>
      )}
      {t('download')}
    </button>
  );
}
