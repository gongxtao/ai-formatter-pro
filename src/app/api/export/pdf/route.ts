import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Server-side PDF generation via headless Chromium.
 * Uses @sparticuz/chromium on Vercel, local Chrome in development.
 */

const PRINT_CSS = `
  @page {
    size: A4;
    margin: 0;
  }
  html, body {
    width: 210mm;
    margin: 0 auto;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    padding: 15mm;
    box-sizing: border-box;
  }
  /* Match editor iframe: reset block margins so template controls spacing */
  body p, body div, body h1, body h2, body h3, body h4, body h5, body h6, body blockquote {
    margin: 0;
  }
  img {
    max-width: 100%;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  td, th {
    border: 1px solid #ddd;
    padding: 8px;
  }
`;

async function getBrowser() {
  const puppeteer = await import('puppeteer-core');

  if (process.env.VERCEL === '1') {
    // Serverless: use @sparticuz/chromium
    const chromium = (await import('@sparticuz/chromium')).default;
    return puppeteer.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: find system Chrome
  const fs = await import('fs');
  const possiblePaths = [
    process.env.CHROME_PATH,
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ].filter(Boolean) as string[];

  let execPath: string | undefined;
  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        execPath = p;
        break;
      }
    } catch {
      // skip
    }
  }

  if (!execPath) {
    throw new Error(
      'Chrome not found. Install Chrome or set CHROME_PATH env variable.',
    );
  }

  return puppeteer.default.launch({
    executablePath: execPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { html } = body as { html: string };

    if (!html || !html.trim()) {
      return NextResponse.json(
        { error: 'No HTML content provided' },
        { status: 400 },
      );
    }

    const browser = await getBrowser();

    try {
      const page = await browser.newPage();

      // Build complete HTML document with print styles
      const fullHtml = html.includes('<html')
        ? html
        : `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${PRINT_CSS}</style></head><body>${html}</body></html>`;

      await page.setContent(fullHtml, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Generate vector PDF via Chromium's built-in PDF renderer
      // Margins handled by CSS (body padding 15mm), not Puppeteer — avoids double-stacking
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
        printBackground: true,
        preferCSSPageSize: true,
      });

      return new NextResponse(Buffer.from(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="document.pdf"',
        },
      });
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error('[PDF API] Error:', e);
    return NextResponse.json(
      { error: (e as Error).message || 'PDF generation failed' },
      { status: 500 },
    );
  }
}
