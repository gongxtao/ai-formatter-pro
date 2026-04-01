import { saveAs } from 'file-saver';
import type { ExportOptions, ExportResult } from './types';

/**
 * Server-side PDF export — sends HTML to /api/export/pdf where headless
 * Chromium renders a true vector PDF (selectable text, perfect WYSIWYG).
 *
 * Falls back to browser print dialog if the server API is unavailable.
 */

/** Clean editor artifacts from HTML before sending to server */
function cleanHtml(html: string): string {
  return html
    .replace(/<div[^>]*id="image-resizer-root"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi, '')
    .replace(/<style[^>]*id="editor-style"[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*contenteditable="[^"]*"/gi, '')
    .replace(/\s*outline:\s*[^;"]+;?/gi, '')
    .replace(/\s*cursor:\s*(text|move|default)\s*!?important?;?/gi, '');
}

/**
 * Primary path: server-side Chromium PDF generation.
 * POSTs the HTML to /api/export/pdf and downloads the returned PDF.
 */
async function exportViaServerApi(
  html: string,
  title: string,
): Promise<ExportResult> {
  const filename = `${title}.pdf`;

  const response = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errData.error || `Server returned ${response.status}`);
  }

  const blob = await response.blob();
  saveAs(blob, filename);
  return { success: true, filename, format: 'pdf' };
}

/**
 * Fallback: open content in a new window and trigger browser print.
 * User can "Save as PDF" from the print dialog for perfect vector output.
 */
async function exportViaPrint(
  html: string,
  title: string,
): Promise<ExportResult> {
  const cleanContent = cleanHtml(html);

  const printHtml = `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 15mm; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Segoe UI", Tahoma, sans-serif;
    line-height: 1.6;
    color: #333;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  img { max-width: 100%; }
  table { border-collapse: collapse; width: 100%; }
  td, th { border: 1px solid #ddd; padding: 8px; }
</style>
</head><body>${cleanContent}</body></html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    return {
      success: false,
      filename: '',
      format: 'pdf',
      error: 'Popup blocked. Please allow popups for this site.',
    };
  }

  printWindow.document.write(printHtml);
  printWindow.document.close();

  // Wait for content to render, then trigger print
  await new Promise<void>((resolve) => {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        resolve();
      }, 500);
    };
    // Fallback if onload already fired
    setTimeout(resolve, 2000);
  });

  return { success: true, filename: `${title}.pdf`, format: 'pdf' };
}

/**
 * Main export function.
 * Tries server-side API first, falls back to browser print dialog.
 */
export async function exportPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    // Try server-side Chromium rendering (best quality)
    return await exportViaServerApi(options.content, options.title);
  } catch (serverError) {
    console.warn('[PDF Export] Server API failed, falling back to print:', serverError);

    // Fallback: browser print dialog
    try {
      return await exportViaPrint(options.content, options.title);
    } catch (printError) {
      console.error('[PDF Export] All methods failed:', printError);
      return {
        success: false,
        filename: '',
        format: 'pdf',
        error: (serverError as Error).message,
      };
    }
  }
}
