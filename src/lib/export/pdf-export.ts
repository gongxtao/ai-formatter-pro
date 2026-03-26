import type { ExportOptions, ExportResult } from './types';

export async function exportPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    const html2pdf = (await import('html2pdf.js')).default;

    const container = document.createElement('div');
    container.innerHTML = options.content;
    container.style.width = '210mm';
    container.style.padding = '20mm';
    container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    container.style.lineHeight = '1.6';
    container.style.color = '#333';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.background = 'white';

    document.body.appendChild(container);

    const filename = `${options.title}.pdf`;

    await html2pdf()
      .set({
        margin: [10, 10, 10, 10],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(container)
      .save();

    document.body.removeChild(container);

    return { success: true, filename, format: 'pdf' };
  } catch (e) {
    return { success: false, filename: '', format: 'pdf', error: (e as Error).message };
  }
}
