'use client';

import { useState, type RefObject } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslations } from 'next-intl';
import EditablePreview from '@/components/editor/EditablePreview';
import type { FloatingImageItem } from '@/components/editor/FloatingImageLayer';
import type { EditablePreviewRef } from '@/components/editor/EditablePreview';

interface EditorContentAreaProps {
  isTemplateLoading: boolean;
  isGenerating: boolean;
  previewRef: RefObject<EditablePreviewRef | null>;
  onContentChange: (content: string) => void;
  onIframeReady: (ref: RefObject<HTMLIFrameElement>) => void;
}

/**
 * EditorContentArea — isolates `currentEditorHtml` subscription
 * so EditorShell doesn't re-render on every keystroke.
 */
export function EditorContentArea({
  isTemplateLoading,
  isGenerating,
  previewRef,
  onContentChange,
  onIframeReady,
}: EditorContentAreaProps) {
  const t = useTranslations('editor');

  // Subscribe to content HERE — changes only trigger this component to re-render
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);

  // Floating images state — tied to content lifecycle
  const [floatingImages, setFloatingImages] = useState<FloatingImageItem[]>([]);

  return (
    <div className="relative flex-1">
      {isTemplateLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <span className="text-sm text-gray-600">{t('loadingTemplate')}</span>
          </div>
        </div>
      )}
      <EditablePreview
        selectedFile="editor"
        content={currentEditorHtml}
        onContentChange={onContentChange}
        floatingImages={floatingImages}
        onFloatingImagesChange={setFloatingImages}
        isGenerating={isGenerating}
        initialEditing
        hideControls
        hideToolbar
        previewRef={previewRef}
        onIframeReady={onIframeReady}
      />
    </div>
  );
}
