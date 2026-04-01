export type ExportFormat = 'pdf' | 'docx' | 'html';

export interface ExportOptions {
  title: string;
  content: string;
  format: ExportFormat;
  /** When available, PDF export renders the iframe directly for true WYSIWYG */
  iframeElement?: HTMLIFrameElement;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  error?: string;
}
