import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import type { ExportOptions, ExportResult } from './types';

/** Extract body innerHTML from a full HTML document string */
function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  // If no <body> tag, return as-is (already body content)
  return html;
}

/** Wait for the browser to complete layout & paint */
function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Extra tick for CSS resolution
        setTimeout(resolve, 50);
      });
    });
  });
}

export async function exportPdf(options: ExportOptions): Promise<ExportResult> {
  const filename = `${options.title}.pdf`;

  try {
    const bodyContent = extractBodyContent(options.content);

    if (!bodyContent.trim()) {
      return { success: false, filename: '', format: 'pdf', error: 'No content to export' };
    }

    // Create a properly-styled container for rendering
    const container = document.createElement('div');
    container.innerHTML = bodyContent;
    container.style.cssText = [
      'width: 794px',              // ~210mm at 96dpi
      'padding: 40px',             // margins
      'font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
      'line-height: 1.6',
      'color: #333',
      'background: white',
      'position: fixed',
      'top: 0',
      'left: 0',
      'z-index: -9999',
      'overflow: hidden',
    ].join(';');

    document.body.appendChild(container);

    // Wait for the browser to lay out and paint the content
    await waitForRender();

    // Render the container to a canvas using html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    // Remove container immediately after canvas capture
    document.body.removeChild(container);

    // Verify canvas has content
    if (canvas.width === 0 || canvas.height === 0) {
      return { success: false, filename, format: 'pdf', error: 'Rendered canvas is empty' };
    }

    // Create PDF from canvas — A4 dimensions in mm
    const PDF_WIDTH_MM = 210;
    const PDF_HEIGHT_MM = 297;
    const MARGIN_MM = 10;
    const contentWidthMm = PDF_WIDTH_MM - MARGIN_MM * 2;
    const contentHeightMm = PDF_HEIGHT_MM - MARGIN_MM * 2;

    // Scale: how many mm per canvas pixel
    const pxPerMm = canvas.width / (794 - 80); // content area width in px (794 - 2*40 padding)
    const imgWidthMm = canvas.width / pxPerMm;
    const imgHeightMm = canvas.height / pxPerMm;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Split canvas into A4 pages
    const pageHeightPx = contentHeightMm * pxPerMm;
    const totalPages = Math.ceil(canvas.height / pageHeightPx);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) pdf.addPage();

      // Calculate the source slice for this page
      const sourceY = page * pageHeightPx;
      const sourceHeight = Math.min(pageHeightPx, canvas.height - sourceY);

      // Create a temporary canvas for this page slice
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      const ctx = pageCanvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(
        canvas,
        0, sourceY,                    // source x, y
        canvas.width, sourceHeight,    // source width, height
        0, 0,                          // dest x, y
        pageCanvas.width, pageCanvas.height, // dest width, height
      );

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      const destHeightMm = sourceHeight / pxPerMm;

      pdf.addImage(
        imgData,
        'JPEG',
        MARGIN_MM,
        MARGIN_MM,
        contentWidthMm,
        destHeightMm,
      );
    }

    // Save the PDF
    const pdfBlob = pdf.output('blob');
    saveAs(pdfBlob, filename);

    return { success: true, filename, format: 'pdf' };
  } catch (e) {
    console.error('[PDF Export] Error:', e);
    return { success: false, filename, format: 'pdf', error: (e as Error).message };
  }
}
