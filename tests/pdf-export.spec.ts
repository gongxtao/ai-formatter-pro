import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Verifies that the html2canvas + jsPDF direct pipeline
 * (used in src/lib/export/pdf-export.ts) produces non-blank PDFs.
 *
 * This test creates a standalone HTML page with realistic content,
 * renders it via html2canvas, generates a PDF via jsPDF, and
 * verifies the output has actual content (not blank).
 */
test('PDF export produces non-blank PDF with realistic content', async ({ page }) => {
  const htmlPath = path.resolve(__dirname, 'fixtures/pdf-test.html');

  const testHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body>
  <div id="content" style="width:794px;padding:40px;font-family:sans-serif;line-height:1.6;color:#333;background:white;">
    <h1 style="color:#1e0eff;margin-bottom:16px;">项目计划书</h1>
    <h2 style="margin-top:24px;">一、项目概述</h2>
    <p>本项目旨在开发一款智能格式化工具，帮助用户快速将文本内容转换为专业的文档格式。工具支持多种文档类型，包括简历、商业计划书、报告等。</p>
    <h2>二、技术方案</h2>
    <p>采用 Next.js 框架进行开发，使用 TypeScript 作为主要开发语言。前端使用 Tailwind CSS 进行样式设计。</p>
    <table style="border-collapse:collapse;width:100%;margin:16px 0;">
      <thead><tr>
        <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">阶段</th>
        <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">内容</th>
        <th style="border:1px solid #ddd;padding:8px;background:#f5f5f5;">周期</th>
      </tr></thead>
      <tbody>
        <tr><td style="border:1px solid #ddd;padding:8px;">需求分析</td><td style="border:1px solid #ddd;padding:8px;">确定功能范围</td><td style="border:1px solid #ddd;padding:8px;">2周</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px;">设计开发</td><td style="border:1px solid #ddd;padding:8px;">核心功能实现</td><td style="border:1px solid #ddd;padding:8px;">4周</td></tr>
        <tr><td style="border:1px solid #ddd;padding:8px;">测试上线</td><td style="border:1px solid #ddd;padding:8px;">质量保证</td><td style="border:1px solid #ddd;padding:8px;">2周</td></tr>
      </tbody>
    </table>
    <h2>三、预算估算</h2>
    <ul>
      <li>开发费用：100,000</li>
      <li>服务器费用：20,000/年</li>
      <li>AI API 费用：30,000/年</li>
    </ul>
    <p style="margin-top:24px;"><strong>总计：150,000</strong></p>
  </div>
  <div id="status" style="margin:20px;padding:10px;background:#eee;">Starting...</div>
  <script type="module">
    async function testExport() {
      const el = document.getElementById('content');
      const status = document.getElementById('status');
      try {
        const h2cMod = await import('https://esm.sh/html2canvas@1.4.1');
        const html2canvas = h2cMod.default || h2cMod;
        await new Promise(r => setTimeout(r, 300));
        const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
        const ctx = canvas.getContext('2d');
        const data = ctx.getImageData(0, 0, Math.min(canvas.width, 200), Math.min(canvas.height, 200));
        let nonWhite = 0;
        for (let i = 0; i < data.data.length; i += 4) {
          if (data.data[i] < 240 || data.data[i+1] < 240 || data.data[i+2] < 240) nonWhite++;
        }
        const jspdfMod = await import('https://esm.sh/jspdf@2.5.2');
        const jsPDF = jspdfMod.jsPDF;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const PDF_W = 210, PDF_H = 297, MARGIN = 10;
        const contentW = PDF_W - MARGIN * 2;
        const pxPerMm = canvas.width / 714;
        const pageHPx = (PDF_H - MARGIN * 2) * pxPerMm;
        const totalPages = Math.ceil(canvas.height / pageHPx);
        for (let p = 0; p < totalPages; p++) {
          if (p > 0) pdf.addPage();
          const srcY = p * pageHPx;
          const srcH = Math.min(pageHPx, canvas.height - srcY);
          const pc = document.createElement('canvas');
          pc.width = canvas.width; pc.height = srcH;
          const pctx = pc.getContext('2d');
          pctx.fillStyle = '#ffffff';
          pctx.fillRect(0, 0, pc.width, pc.height);
          pctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, pc.width, srcH);
          const imgData = pc.toDataURL('image/jpeg', 0.92);
          pdf.addImage(imgData, 'JPEG', MARGIN, MARGIN, contentW, srcH / pxPerMm);
        }
        const pdfBase64 = pdf.output('datauristring');
        const pdfBytes = atob(pdfBase64.split(',')[1]).length;
        status.textContent = JSON.stringify({ canvasW: canvas.width, canvasH: canvas.height, nonWhite, totalPages, pdfSize: pdfBytes, done: true });
      } catch(e) { status.textContent = JSON.stringify({ error: e.message, stack: e.stack }); }
    }
    window.addEventListener('load', () => setTimeout(testExport, 500));
  </script>
</body></html>`;

  fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
  fs.writeFileSync(htmlPath, testHtml);

  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`);
  await page.waitForFunction(() => {
    const s = document.getElementById('status');
    if (!s) return false;
    try { const d = JSON.parse(s.textContent); return d.done === true || !!d.error; } catch { return false; }
  }, { timeout: 60000 });

  const result = await page.evaluate(() => JSON.parse(document.getElementById('status').textContent));
  console.log('PDF export test:', JSON.stringify(result));

  expect(result.error).toBeUndefined();
  expect(result.canvasW).toBeGreaterThan(0);
  expect(result.canvasH).toBeGreaterThan(0);
  expect(result.nonWhite).toBeGreaterThan(100);
  expect(result.pdfSize).toBeGreaterThan(5000);

  console.log(`PASS: ${result.canvasW}x${result.canvasH}, nonWhite=${result.nonWhite}, PDF=${result.pdfSize}B, pages=${result.totalPages}`);
  fs.unlinkSync(htmlPath);
});
