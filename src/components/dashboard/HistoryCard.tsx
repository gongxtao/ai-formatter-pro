'use client';

import { useTranslations } from 'next-intl';
import { useHistoryStore, type HistoryDocument } from '@/stores/useHistoryStore';
import { useDashboardStore } from '@/stores/useDashboardStore';

interface HistoryCardProps {
  doc: HistoryDocument;
}

export function HistoryCard({ doc }: HistoryCardProps) {
  const t = useTranslations('history');
  const deleteDocument = useHistoryStore((s) => s.deleteDocument);
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);

  const handleOpen = () => {
    setPendingEditorContent(doc.content);
    window.location.href = '/dashboard/editor';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDocument(doc.id);
  };

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onClick={handleOpen}
      className="group bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-gray-900 truncate flex-1">{doc.title}</h3>
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded"
          title={t('delete')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3 line-clamp-2 leading-relaxed">{doc.thumbnail}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="px-2 py-0.5 bg-gray-100 rounded-full">{doc.category}</span>
        <span>{t('savedAt', { date: formattedDate })}</span>
      </div>
    </div>
  );
}
