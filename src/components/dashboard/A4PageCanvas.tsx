'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import EditablePreview, { type EditablePreviewRef } from '@/components/editor/EditablePreview';
import type { FloatingImageItem } from '@/components/editor/FloatingImageLayer';
import { createAutoSave, saveToLocalStorage, loadFromLocalStorage } from '@/lib/editor-auto-save';

export function A4PageCanvas() {
  const t = useTranslations('editor');
  const pendingEditorContent = useDashboardStore((s) => s.pendingEditorContent);
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const isGenerating = useDashboardStore((s) => s.isGenerating);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);

  const [content, setContent] = useState(() => loadFromLocalStorage());
  const [floatingImages, setFloatingImages] = useState<FloatingImageItem[]>([]);
  const previewRef = useRef<EditablePreviewRef>(null);
  const autoSaveRef = useRef(createAutoSave(saveToLocalStorage, 5000));

  // Consume pending content from dashboard generation or chat insert
  useEffect(() => {
    if (pendingEditorContent) {
      setContent(pendingEditorContent);
      setCurrentEditorHtml(pendingEditorContent);
      autoSaveRef.current.schedule(pendingEditorContent);
      setPendingEditorContent(null);
    }
  }, [pendingEditorContent, setPendingEditorContent, setCurrentEditorHtml]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setCurrentEditorHtml(newContent);
    autoSaveRef.current.schedule(newContent);
  }, [setCurrentEditorHtml]);

  // Flush auto-save on unmount
  useEffect(() => {
    return () => {
      autoSaveRef.current.flush();
    };
  }, []);

  const handleAskAi = useCallback(() => {
    // Close doc types overlay if open, to show AI chat sidebar
    if (showDocTypesOverlay) {
      toggleDocTypesOverlay();
    }
  }, [showDocTypesOverlay, toggleDocTypesOverlay]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F3F4F6] p-8">
      <div className="a4-page relative group max-w-[210mm] mx-auto shadow-lg rounded-sm">
        {/* Floating AI button */}
        <button
          onClick={handleAskAi}
          className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium whitespace-nowrap hover:bg-primary-hover flex items-center gap-1.5 z-10"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t('askAiToEdit')}
        </button>

        <EditablePreview
          selectedFile="editor"
          content={content}
          onContentChange={handleContentChange}
          floatingImages={floatingImages}
          onFloatingImagesChange={setFloatingImages}
          isGenerating={isGenerating}
          initialEditing
          hideControls
          previewRef={previewRef}
        />
      </div>
    </div>
  );
}
