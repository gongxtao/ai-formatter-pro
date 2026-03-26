import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  Packer,
} from 'docx';
import { saveAs } from 'file-saver';
import type { ExportOptions, ExportResult } from './types';

function parseHtml(html: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const children = convertChildren(doc.body.childNodes);
  return new Document({
    sections: [{ children }],
  });
}

function convertChildren(nodes: NodeListOf<ChildNode>): (Paragraph | Table)[] {
  const result: (Paragraph | Table)[] = [];
  nodes.forEach((node) => {
    const converted = convertNode(node);
    if (converted) result.push(...converted);
  });
  return result;
}

function convertNode(node: Node): (Paragraph | Table)[] | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent?.trim();
    if (!text) return null;
    return [new Paragraph({ children: [new TextRun(text)] })];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();

  if (tag === 'H1') return [makeHeading(el, HeadingLevel.HEADING_1)];
  if (tag === 'H2') return [makeHeading(el, HeadingLevel.HEADING_2)];
  if (tag === 'H3') return [makeHeading(el, HeadingLevel.HEADING_3)];
  if (tag === 'H4') return [makeHeading(el, HeadingLevel.HEADING_4)];
  if (tag === 'H5') return [makeHeading(el, HeadingLevel.HEADING_5)];
  if (tag === 'H6') return [makeHeading(el, HeadingLevel.HEADING_6)];

  if (tag === 'P' || tag === 'DIV') return [makeParagraph(el)];
  if (tag === 'UL' || tag === 'OL') return convertList(el);
  if (tag === 'TABLE') return [convertTable(el)];
  if (tag === 'BR') return [new Paragraph({ children: [] })];

  return convertChildren(el.childNodes);
}

function makeHeading(el: HTMLElement, level: (typeof HeadingLevel)[keyof typeof HeadingLevel]): Paragraph {
  const runs = convertInline(el.childNodes);
  return new Paragraph({ heading: level, children: runs });
}

function makeParagraph(el: HTMLElement): Paragraph {
  const runs = convertInline(el.childNodes);
  return new Paragraph({ children: runs });
}

function convertInline(nodes: NodeListOf<ChildNode>): TextRun[] {
  const runs: TextRun[] = [];
  nodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text) runs.push(new TextRun(text));
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tag = el.tagName.toUpperCase();
      const bold = tag === 'STRONG' || tag === 'B';
      const italics = tag === 'EM' || tag === 'I';

      const childText = convertInline(el.childNodes);
      if (childText.length > 0) {
        if (bold || italics) {
          childText.forEach((run) => {
            if (bold) (run as unknown as { bold?: boolean }).bold = true;
            if (italics) (run as unknown as { italics?: boolean }).italics = true;
          });
        }
        runs.push(...childText);
      }
    }
  });
  return runs;
}

function convertList(el: HTMLElement): Paragraph[] {
  const items: Paragraph[] = [];
  el.querySelectorAll(':scope > li').forEach((li) => {
    const runs = convertInline(li.childNodes);
    items.push(new Paragraph({ bullet: { level: 0 }, children: runs }));
  });
  return items;
}

function convertTable(el: HTMLElement): Table {
  const rows: TableRow[] = [];
  el.querySelectorAll(':scope > thead > tr, :scope > tbody > tr, :scope > tr').forEach((tr) => {
    const cells: TableCell[] = [];
    tr.querySelectorAll(':scope > td, :scope > th').forEach((td) => {
      const runs = convertInline(td.childNodes);
      cells.push(
        new TableCell({
          children: [new Paragraph({ children: runs })],
          width: { size: 100 / Math.max(tr.querySelectorAll(':scope > td, :scope > th').length, 1), type: WidthType.PERCENTAGE },
        }),
      );
    });
    rows.push(new TableRow({ children: cells }));
  });
  return new Table({ rows });
}

export async function exportDocx(options: ExportOptions): Promise<ExportResult> {
  try {
    const doc = parseHtml(options.content);
    const blob = await Packer.toBlob(doc);
    const filename = `${options.title}.docx`;
    saveAs(blob, filename);
    return { success: true, filename, format: 'docx' };
  } catch (e) {
    return { success: false, filename: '', format: 'docx', error: (e as Error).message };
  }
}
