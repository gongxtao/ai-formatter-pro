export type ExportFormat = 'pdf' | 'docx' | 'html';

export interface ExportOptions {
  title: string;
  content: string;
  format: ExportFormat;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  error?: string;
}
