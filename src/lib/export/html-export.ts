import { saveAs } from 'file-saver';
import type { ExportOptions, ExportResult } from './types';

/** Extract body innerHTML from a full HTML document string */
function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return html;
}

export async function exportHtml(options: ExportOptions): Promise<ExportResult> {
  try {
    const bodyContent = extractBodyContent(options.content);
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 210mm; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333; }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; color: #111; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    td, th { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background-color: #f5f5f5; }
    img { max-width: 100%; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const filename = `${options.title}.html`;
    saveAs(blob, filename);
    return { success: true, filename, format: 'html' };
  } catch (e) {
    return { success: false, filename: '', format: 'html', error: (e as Error).message };
  }
}
