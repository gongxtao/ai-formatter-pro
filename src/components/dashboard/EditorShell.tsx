'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from 'next-intl';
import { MiniNav } from './MiniNav';
import { AIChatSidebar } from './AIChatSidebar';
import { DocTypesOverlay } from './DocTypesOverlay';
import { EditorToolbarBar } from './EditorToolbarBar';
import { EditorTemplatesGrid } from './EditorTemplatesGrid';
import EditablePreview from '@/components/editor/EditablePreview';
import EditorToolbar from '@/components/editor/EditorToolbar';
import type { NavItem } from '@/types/dashboard';
import type { FloatingImageItem } from '@/components/editor/FloatingImageLayer';
import type { EditablePreviewRef } from '@/components/editor/EditablePreview';
import { createAutoSave, saveToLocalStorage, loadFromLocalStorage } from '@/lib/editor-auto-save';
import { useTemplates } from '@/hooks/useTemplates';

export function EditorShell() {
  const router = useRouter();
  const t = useTranslations('editor');
  const th = useTranslations('history');
  const { toast } = useToast();

  // Store
  const editorView = useDashboardStore((s) => s.editorView);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);
  const pendingEditorContent = useDashboardStore((s) => s.pendingEditorContent);
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const isGenerating = useDashboardStore((s) => s.isGenerating);
  const saveDocument = useHistoryStore((s) => s.saveDocument);

  // Local state
  const [docTitle, setDocTitle] = useState(t('untitled'));
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedIcon, setShowSavedIcon] = useState(false);
  const [content, setContent] = useState(() => loadFromLocalStorage());
  const [floatingImages, setFloatingImages] = useState<FloatingImageItem[]>([]);
  const [iframeRef, setIframeRef] = useState<RefObject<HTMLIFrameElement> | null>(null);
  const previewRef = useRef<EditablePreviewRef | null>(null);
  const autoSaveRef = useRef(createAutoSave(saveToLocalStorage, 5000));

  // Handlers
  const handleNav = useCallback(
    (key: NavItem) => {
      switch (key) {
        case 'home':
          setActiveNav('home');
          router.push('/dashboard');
          break;
        case 'document':
          toggleDocTypesOverlay();
          break;
        case 'templates':
          setActiveNav('templates');
          router.push('/dashboard');
          break;
        case 'history':
          // Already in editor
          break;
      }
    },
    [router, setActiveNav, toggleDocTypesOverlay],
  );

  const handleBackToTemplates = useCallback(() => {
    setEditorView('templates');
  }, [setEditorView]);

  const handleSave = useCallback(() => {
    if (!currentEditorHtml.trim()) return;
    setIsSaving(true);
    const ok = saveDocument({ title: docTitle || t('untitled'), content: currentEditorHtml, category: activeDocType });
    setIsSaving(false);
    if (ok) {
      setShowSavedIcon(true);
      setTimeout(() => setShowSavedIcon(false), 2000);
      toast(th('saved'), 'success', 2000);
    } else {
      toast(th('storageFull'), 'error', 3000);
    }
  }, [currentEditorHtml, docTitle, activeDocType, saveDocument, t, th, toast]);

  // Content change handler
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setCurrentEditorHtml(newContent);
    autoSaveRef.current.schedule(newContent);
  }, [setCurrentEditorHtml]);

  // Receive iframe ref directly from A4PageCanvas when iframe is ready
  const handleIframeReady = useCallback((ref: RefObject<HTMLIFrameElement>) => {
    if (ref && ref.current) {
      setIframeRef(ref);
    }
  }, []);

  // Consume pending content from generation or chat insert
  useEffect(() => {
    if (pendingEditorContent) {
      setContent(pendingEditorContent);
      setCurrentEditorHtml(pendingEditorContent);
      autoSaveRef.current.schedule(pendingEditorContent);
      setPendingEditorContent(null);
    }
  }, [pendingEditorContent, setPendingEditorContent, setCurrentEditorHtml]);

  // Flush auto-save on unmount
  useEffect(() => {
    return () => {
      autoSaveRef.current.flush();
    };
  }, []);

  // Render EditorToolbar only when iframeRef is ready
  const editorToolbar = iframeRef ? (
    <EditorToolbar
      iframeRef={iframeRef}
      onContentChange={handleContentChange}
      isEditing={true}
      disabled={!content}
      onFloatingImageInsert={(url) => previewRef.current?.insertFloatingImage(url)}
      refreshToken={0}
    />
  ) : (
    <div className="flex items-center justify-center h-10 text-gray-400 text-xs">
      Loading editor...
    </div>
  );

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      {/* MiniNav */}
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0 relative z-10">
        <MiniNav onNavigate={handleNav} />
      </aside>

      {/* Sidebar */}
      <aside className="w-[348px] bg-white border-r border-gray-100 h-full flex-shrink-0 relative overflow-hidden">
        {showDocTypesOverlay ? <DocTypesOverlay /> : <AIChatSidebar />}
      </aside>

      {/* Main area */}
      <main className="flex-1 min-w-0 bg-[#F3F4F6] h-screen flex flex-col">
        <EditorToolbarBar
          editorView={editorView}
          onBackToTemplates={handleBackToTemplates}
          docTitle={docTitle}
          isSaving={isSaving}
          showSavedIcon={showSavedIcon}
          handleSave={handleSave}
          editorToolbar={editorToolbar}
        />

        {editorView === 'templates' ? (
          <EditorTemplatesGrid />
        ) : (
          <EditablePreview
            selectedFile="editor"
            content={content}
            onContentChange={handleContentChange}
            floatingImages={floatingImages}
            onFloatingImagesChange={setFloatingImages}
            isGenerating={isGenerating}
            initialEditing
            hideControls
            hideToolbar
            previewRef={previewRef}
            onIframeReady={handleIframeReady}
          />
        )}
      </main>
    </div>
  );
}
