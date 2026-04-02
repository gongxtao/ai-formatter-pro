'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo, type RefObject } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTranslations } from 'next-intl';
import { MiniNav } from './MiniNav';
import { AIChatSidebar } from './AIChatSidebar';
import { DocTypesOverlay } from './DocTypesOverlay';
import { EditorToolbarBar } from './EditorToolbarBar';
import { EditorTemplatesGrid } from './EditorTemplatesGrid';
import { EditorContentArea } from './EditorContentArea';
import EditorToolbar from '@/components/editor/EditorToolbar';
import type { NavItem } from '@/types/dashboard';
import type { EditablePreviewRef } from '@/components/editor/EditablePreview';
import { createAutoSave, saveToLocalStorage } from '@/lib/editor-auto-save';
import { useTemplates } from '@/hooks/useTemplates';
import { useEditorSave } from '@/hooks/useEditorSave';
import { useTemplateLoader } from '@/hooks/useTemplateLoader';

// Step 5: React.memo wrapper for EditorToolbar — prevents re-renders when parent re-renders
// but toolbar props haven't changed (iframeRef, onContentChange, disabled are all stable)
const MemoizedEditorToolbar = React.memo(function MemoizedEditorToolbar({
  iframeRef,
  onContentChange,
  disabled,
  onFloatingImageInsert,
}: {
  iframeRef: RefObject<HTMLIFrameElement>;
  onContentChange: (content: string) => void;
  disabled: boolean;
  onFloatingImageInsert: (url: string) => void;
}) {
  return (
    <EditorToolbar
      iframeRef={iframeRef}
      onContentChange={onContentChange}
      isEditing={true}
      disabled={disabled}
      onFloatingImageInsert={onFloatingImageInsert}
      refreshToken={0}
    />
  );
});

/**
 * EditorShell - Main editor layout component
 *
 * Responsibilities:
 * 1. Provide UI layout (MiniNav, Sidebar, Main area)
 * 2. Coordinate child components
 * 3. Handle navigation
 * 4. Manage editor content lifecycle (auto-save, pending content)
 *
 * Delegated to hooks:
 * - Save logic → useEditorSave (docTitle, isSaving, showSavedIcon, handleSave)
 * - Template loading → useTemplateLoader (fetches & injects template HTML)
 *
 * NOT responsible for:
 * - Conversation loading (handled by AIChatSidebar via useEditorInit)
 * - Auto-generation triggering (handled by AIChatSidebar via useEditorInit)
 * - Content subscription (handled by EditorContentArea to isolate re-renders)
 */
export function EditorShell() {
  const router = useRouter();
  const t = useTranslations('editor');

  // Read-only selectors (currentEditorHtml removed — subscribed in EditorContentArea)
  const editorView = useDashboardStore((s) => s.editorView);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const pendingEditorContent = useDashboardStore((s) => s.pendingEditorContent);
  const isGenerating = useDashboardStore((s) => s.isGenerating);
  const isAutoGenerating = useDashboardStore((s) => s.isAutoGenerating);
  const isTemplateLoading = useDashboardStore((s) => s.isTemplateLoading);
  const conversationId = useDashboardStore((s) => s.generateParams.conversationId);

  // Refs
  const lastConversationRef = useRef<string | null>(null);
  const previewRef = useRef<EditablePreviewRef | null>(null);
  const autoSaveRef = useRef(createAutoSave(saveToLocalStorage, 5000));
  // iframeRef stored as state so it's safe to read during render (useMemo)
  // — avoids "Cannot access refs during render" lint error from React 19
  const [iframeRefObj, setIframeRefObj] = useState<RefObject<HTMLIFrameElement> | null>(null);
  // Derived from store — avoids setState in effects (React 19 cascading-render warning)
  const hasContent = useDashboardStore((s) => !!s.currentEditorHtml);

  // Extracted hooks
  const { docTitle, setDocTitle, isSaving, showSavedIcon, handleSave } = useEditorSave({ previewRef });

  useTemplateLoader({
    autoSaveRef: autoSaveRef as React.RefObject<{ schedule: (content: string) => void; cancel: () => void; flush: () => void }>,
    onDocTitleChange: setDocTitle,
  });

  // Ensure templates data is loaded
  useTemplates();

  // Initialize editor content on mount
  useEffect(() => {
    const store = useDashboardStore.getState();
    if (store.generateParams.shouldAutoGenerate) return;
    if (store.pendingEditorContent) return;
    if (store.selectedTemplateId) return;
    // Blank editor for normal navigation — no localStorage restore
  }, []);

  // Flush auto-save on unmount
  useEffect(() => {
    const autoSave = autoSaveRef.current;
    return () => autoSave.flush();
  }, []);

  // Handle navigation from MiniNav
  const handleNav = useCallback(
    (key: NavItem) => {
      const dashStore = useDashboardStore.getState();
      switch (key) {
        case 'home':
          dashStore.setActiveNav('home');
          router.push('/');
          break;
        case 'document':
          dashStore.setActiveNav('document');
          dashStore.toggleDocTypesOverlay();
          dashStore.setEditorView('editor');
          break;
        case 'templates':
          dashStore.setActiveNav('templates');
          router.push('/');
          break;
        case 'history':
          dashStore.setActiveNav('history');
          router.push('/');
          break;
      }
    },
    [router],
  );

  const handleBackToTemplates = useCallback(() => {
    useDashboardStore.getState().setEditorView('templates');
  }, []);

  const handleBackToEditor = useCallback(() => {
    useDashboardStore.getState().setEditorView('editor');
  }, []);

  // Content change handler — updates store + schedules auto-save
  const handleContentChange = useCallback((newContent: string) => {
    useDashboardStore.getState().setCurrentEditorHtml(newContent);
    autoSaveRef.current.schedule(newContent);
  }, []);

  // Receive iframe ref from EditablePreview
  const handleIframeReady = useCallback((ref: RefObject<HTMLIFrameElement>) => {
    if (ref && ref.current) {
      setIframeRefObj(ref);
    }
  }, []);

  // Consume pending content from generation or chat insert
  // (Step 6: destructured store actions for clarity)
  useEffect(() => {
    if (pendingEditorContent) {
      const { setCurrentEditorHtml, setPendingEditorContent } = useDashboardStore.getState();
      setCurrentEditorHtml(pendingEditorContent);
      autoSaveRef.current.schedule(pendingEditorContent);
      setPendingEditorContent(null);
    }
  }, [pendingEditorContent]);

  // Clear editor when navigating to a new conversation
  useEffect(() => {
    if (conversationId && conversationId !== lastConversationRef.current) {
      lastConversationRef.current = conversationId;
      autoSaveRef.current.cancel();
      useDashboardStore.getState().setCurrentEditorHtml('');
    }
  }, [conversationId]);

  // Combined generating state for UI
  const showGeneratingState = isGenerating || isAutoGenerating;

  // Memoized export callbacks (stable — refs don't change identity)
  const onBeforeExport = useCallback(() => {
    previewRef.current?.flushContent?.();
  }, []);

  const getIframeElement = useCallback(() => {
    return previewRef.current?.getIframeRef?.()?.current ?? null;
  }, []);

  // Memoized editor toolbar — iframeRefObj is state (safe to read in useMemo)
  const editorToolbar = useMemo(() => {
    if (!iframeRefObj) {
      return (
        <div className="flex items-center justify-center h-10 text-gray-400 text-xs">
          Loading editor...
        </div>
      );
    }
    return (
      <MemoizedEditorToolbar
        iframeRef={iframeRefObj}
        onContentChange={handleContentChange}
        disabled={!hasContent}
        onFloatingImageInsert={(url) => previewRef.current?.insertFloatingImage(url)}
      />
    );
  }, [iframeRefObj, handleContentChange, hasContent]);

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      {/* MiniNav */}
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0 relative z-10">
        <MiniNav onNavigate={handleNav} />
      </aside>

      {/* Sidebar - AIChatSidebar handles its own initialization */}
      <aside className="w-[348px] bg-white border-r border-gray-100 h-full flex-shrink-0 relative overflow-hidden">
        {showDocTypesOverlay ? <DocTypesOverlay /> : <AIChatSidebar />}
      </aside>

      {/* Main area */}
      <main className="flex-1 min-w-0 h-screen flex flex-col">
        <EditorToolbarBar
          editorView={editorView}
          onBackToTemplates={handleBackToTemplates}
          onBackToEditor={handleBackToEditor}
          docTitle={docTitle}
          isSaving={isSaving}
          showSavedIcon={showSavedIcon}
          handleSave={handleSave}
          editorToolbar={editorToolbar}
          isGenerating={showGeneratingState}
          onBeforeExport={onBeforeExport}
          getIframeElement={getIframeElement}
        />

        {editorView === 'templates' ? (
          <EditorTemplatesGrid />
        ) : (
          <EditorContentArea
            isTemplateLoading={isTemplateLoading}
            isGenerating={showGeneratingState}
            previewRef={previewRef}
            onContentChange={handleContentChange}
            onIframeReady={handleIframeReady}
          />
        )}
      </main>
    </div>
  );
}
