'use client';

import { useState, useCallback } from 'react';
import { exportPdf } from '@/lib/export/pdf-export';
import { exportDocx } from '@/lib/export/docx-export';
import { exportHtml } from '@/lib/export/html-export';
import type { ExportFormat, ExportResult } from '@/lib/export/types';

const exporters: Record<
  ExportFormat,
  (options: { title: string; content: string }) => Promise<ExportResult>
> = {
  pdf: (opts) => exportPdf({ ...opts, format: 'pdf' }),
  docx: (opts) => exportDocx({ ...opts, format: 'docx' }),
  html: (opts) => exportHtml({ ...opts, format: 'html' }),
};

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportDocument = useCallback(
    async (format: ExportFormat, title: string, content: string): Promise<ExportResult> => {
      if (!content.trim()) {
        return { success: false, filename: '', format, error: 'No content to export' };
      }
      setIsExporting(true);
      try {
        const result = await exporters[format]({ title, content });
        return result;
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return { isExporting, exportDocument };
}
