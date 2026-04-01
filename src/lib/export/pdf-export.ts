import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import type { ExportOptions, ExportResult } from './types';

/** Wait for the browser to complete layout & paint */
function waitForRender(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 100);
      });
    });
  });
}

/** Extract body innerHTML from a full HTML document string (fallback path) */
function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return html;
}

/** Remove editor artifacts from a document (image resizer, contenteditable, editor styles) */
function cleanEditorArtifacts(doc: Document): void {
  const resizer = doc.getElementById('image-resizer-root');
  if (resizer) resizer.remove();
  const editorStyle = doc.getElementById('editor-style');
  if (editorStyle) editorStyle.remove();
  doc.body.removeAttribute('contenteditable');
  doc.body.style.outline = 'none';
  doc.body.style.cursor = '';
  // Remove contenteditable from all descendants
  doc.querySelectorAll('[contenteditable]').forEach((el) => el.removeAttribute('contenteditable'));
}

/**
 * WYSIWYG PDF export — renders the actual iframe content directly.
 * Creates a temporary iframe clone to avoid modifying the live editor.
 */
async function exportPdfFromIframe(
  iframe: HTMLIFrameElement,
  title: string,
): Promise<ExportResult> {
  const filename = `${title}.pdf`;
  const iframeDoc = iframe.contentDocument;
  if (!iframeDoc) {
    return { success: false, filename: '', format: 'pdf', error: 'Iframe document not accessible' };
  }

  // Capture the iframe's current viewport width (the width the user sees)
  const sourceWidth = iframe.clientWidth || iframeDoc.body.clientWidth;

  // Clone the entire HTML document content
  const htmlContent = iframeDoc.documentElement.outerHTML;

  // Create a temporary off-screen iframe for rendering
  const tempIframe = document.createElement('iframe');
  tempIframe.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    `width: ${sourceWidth}px`,
    'height: 10000px', // tall enough to avoid clipping
    'border: none',
    'z-index: -9999',
    'pointer-events: none',
  ].join(';');

  document.body.appendChild(tempIframe);

  // Write the cloned content into the temp iframe
  const tempDoc = tempIframe.contentDocument!;
  tempDoc.open();
  tempDoc.write('<!DOCTYPE html>' + htmlContent);
  tempDoc.close();

  // Remove editor-only artifacts from the temp iframe
  cleanEditorArtifacts(tempDoc);

  // Wait for the browser to fully render the content
  await waitForRender();

  // Measure the actual content height
  const contentHeight = tempDoc.body.scrollHeight;

  // Render the body to canvas via html2canvas
  const canvas = await html2canvas(tempDoc.body, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: sourceWidth,
    height: contentHeight,
    windowWidth: sourceWidth,
    windowHeight: contentHeight,
  });

  // Remove temp iframe immediately
  document.body.removeChild(tempIframe);

  // Verify canvas has content
  if (canvas.width === 0 || canvas.height === 0) {
    return { success: false, filename, format: 'pdf', error: 'Rendered canvas is empty' };
  }

  // Generate multi-page A4 PDF
  const pdf = buildPdfFromCanvas(canvas, sourceWidth);

  const pdfBlob = pdf.output('blob');
  saveAs(pdfBlob, filename);

  return { success: true, filename, format: 'pdf' };
}

/**
 * Fallback PDF export — renders from HTML string.
 * Used when iframe reference is not available.
 */
async function exportPdfFromHtml(options: ExportOptions): Promise<ExportResult> {
  const filename = `${options.title}.pdf`;
  const bodyContent = extractBodyContent(options.content);

  if (!bodyContent.trim()) {
    return { success: false, filename: '', format: 'pdf', error: 'No content to export' };
  }

  const container = document.createElement('div');
  container.innerHTML = bodyContent;
  container.style.cssText = [
    'width: 794px',
    'padding: 40px',
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
  await waitForRender();

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  document.body.removeChild(container);

  if (canvas.width === 0 || canvas.height === 0) {
    return { success: false, filename, format: 'pdf', error: 'Rendered canvas is empty' };
  }

  const pdf = buildPdfFromCanvas(canvas, 794);
  const pdfBlob = pdf.output('blob');
  saveAs(pdfBlob, filename);

  return { success: true, filename, format: 'pdf' };
}

/**
 * Build a multi-page A4 jsPDF document from a canvas.
 * Splits the canvas into A4 pages automatically.
 */
function buildPdfFromCanvas(canvas: HTMLCanvasElement, sourceWidthPx: number): jsPDF {
  const PDF_WIDTH_MM = 210;
  const PDF_HEIGHT_MM = 297;
  const MARGIN_MM = 10;
  const contentWidthMm = PDF_WIDTH_MM - MARGIN_MM * 2;
  const contentHeightMm = PDF_HEIGHT_MM - MARGIN_MM * 2;

  // Pixels per mm in the source content
  const pxPerMm = sourceWidthPx / PDF_WIDTH_MM;
  const pageHeightPx = contentHeightMm * pxPerMm;
  const totalPages = Math.ceil(canvas.height / pageHeightPx);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let page = 0; page < totalPages; page++) {
    if (page > 0) pdf.addPage();

    const sourceY = page * pageHeightPx;
    const sourceHeight = Math.min(pageHeightPx, canvas.height - sourceY);

    // Create a canvas slice for this page
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0, sourceY,
      canvas.width, sourceHeight,
      0, 0,
      pageCanvas.width, pageCanvas.height,
    );

    const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
    const destHeightMm = sourceHeight / pxPerMm;

    pdf.addImage(imgData, 'JPEG', MARGIN_MM, MARGIN_MM, contentWidthMm, destHeightMm);
  }

  return pdf;
}

export async function exportPdf(options: ExportOptions): Promise<ExportResult> {
  try {
    // WYSIWYG path: render directly from the editor iframe
    if (options.iframeElement) {
      return await exportPdfFromIframe(options.iframeElement, options.title);
    }
    // Fallback path: render from HTML string
    return await exportPdfFromHtml(options);
  } catch (e) {
    console.error('[PDF Export] Error:', e);
    return { success: false, filename: '', format: 'pdf', error: (e as Error).message };
  }
}
