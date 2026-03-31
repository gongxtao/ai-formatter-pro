'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useHistoryStore, type HistoryDocument } from '@/stores/useHistoryStore';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface HistoryCardProps {
  doc: HistoryDocument;
}

export function HistoryCard({ doc }: HistoryCardProps) {
  const t = useTranslations('history');
  const tc = useTranslations('common');
  const deleteDocument = useHistoryStore((s) => s.deleteDocument);
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { toast } = useToast();

  const handleOpen = () => {
    setPendingEditorContent(doc.content);
    window.location.href = '/editor';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleOpen();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleDeleteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = () => {
    const ok = deleteDocument(doc.id);
    if (ok) {
      setShowDeleteModal(false);
    } else {
      toast(tc('storageFull') || 'Storage is full. Cannot delete document.', 'error', 3000);
    }
  };

  const formattedDate = new Date(doc.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <div
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className="group bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-medium text-gray-900 truncate flex-1">{doc.title}</h3>
          <button
            onClick={handleDeleteClick}
            onKeyDown={handleDeleteKeyDown}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
            title={t('delete')}
            aria-label={t('delete')}
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

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title={t('deleteConfirmTitle')}
      >
        <p className="text-sm text-gray-600 mb-6">{t('deleteConfirm')}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>
            {tc('cancel')}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={confirmDelete}
          >
            {t('delete')}
          </Button>
        </div>
      </Modal>
    </>
  );
}
