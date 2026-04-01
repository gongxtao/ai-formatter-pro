'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { useRouter } from '@/i18n/navigation';
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
import { createAutoSave, saveToLocalStorage } from '@/lib/editor-auto-save';
import { useTemplates } from '@/hooks/useTemplates';

/**
 * EditorShell - Main editor layout component
 *
 * Responsibilities:
 * 1. Provide UI layout (MiniNav, Sidebar, Main area)
 * 2. Coordinate child components
 * 3. Handle navigation
 * 4. Manage editor content lifecycle (auto-save, pending content)
 * 5. Load templates when selected
 *
 * NOT responsible for:
 * - Conversation loading (handled by AIChatSidebar via useEditorInit)
 * - Auto-generation triggering (handled by AIChatSidebar via useEditorInit)
 */
export function EditorShell() {
  const router = useRouter();
  const t = useTranslations('editor');
  const th = useTranslations('history');
  const { toast } = useToast();

  // Read-only selectors
  const editorView = useDashboardStore((s) => s.editorView);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const pendingEditorContent = useDashboardStore((s) => s.pendingEditorContent);
  const isGenerating = useDashboardStore((s) => s.isGenerating);
  const isAutoGenerating = useDashboardStore((s) => s.isAutoGenerating);
  const isTemplateLoading = useDashboardStore((s) => s.isTemplateLoading);
  const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId);
  const saveDocument = useHistoryStore((s) => s.saveDocument);

  // Refs
  const lastConversationRef = useRef<string | null>(null);
  const previewRef = useRef<EditablePreviewRef | null>(null);
  const autoSaveRef = useRef(createAutoSave(saveToLocalStorage, 5000));

  // Local state
  const [docTitle, setDocTitle] = useState(t('untitled'));
  const [showSavedIcon, setShowSavedIcon] = useState(false);
  const [floatingImages, setFloatingImages] = useState<FloatingImageItem[]>([]);
  const [iframeRef, setIframeRef] = useState<RefObject<HTMLIFrameElement> | null>(null);

  // Ensure templates data is loaded
  useTemplates();

  // Initialize editor content on mount
  // Only restore from localStorage when explicitly re-entering with pending content
  // (e.g. from history). Normal navigation from other pages starts with blank editor.
  // Content is injected via pendingEditorContent, selectedTemplateId, or AI generation.
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

      // 只要触发导航，就切换到编辑器视图
      useDashboardStore.getState().setEditorView('editor');
    },
    [router],
  );

  const handleBackToTemplates = useCallback(() => {
    useDashboardStore.getState().setEditorView('templates');
  }, []);

  const handleBackToEditor = useCallback(() => {
    useDashboardStore.getState().setEditorView('editor');
  }, []);

  const handleSave = useCallback(() => {
    // Flush pending debounced content from iframe before reading from store
    previewRef.current?.flushContent?.();
    // Read fresh content from store after flush
    const html = useDashboardStore.getState().currentEditorHtml;
    if (!html.trim()) {
      toast(t('noContentToSave'), 'info', 2000);
      return;
    }
    const ok = saveDocument({ title: docTitle || t('untitled'), content: html, category: activeDocType });
    if (ok) {
      setShowSavedIcon(true);
      setTimeout(() => setShowSavedIcon(false), 2000);
      toast(th('saved'), 'success', 2000);
    } else {
      toast(th('storageFull'), 'error', 3000);
    }
  }, [docTitle, activeDocType, saveDocument, t, th, toast]);

  // Content change handler — single source of truth via store
  const handleContentChange = useCallback((newContent: string) => {
    useDashboardStore.getState().setCurrentEditorHtml(newContent);
    autoSaveRef.current.schedule(newContent);
  }, []);

  // Receive iframe ref from A4PageCanvas
  const handleIframeReady = useCallback((ref: RefObject<HTMLIFrameElement>) => {
    if (ref && ref.current) {
      setIframeRef(ref);
    }
  }, []);

  // Consume pending content from generation or chat insert
  useEffect(() => {
    if (pendingEditorContent) {
      const dashStore = useDashboardStore.getState();
      dashStore.setCurrentEditorHtml(pendingEditorContent);
      autoSaveRef.current.schedule(pendingEditorContent);
      dashStore.setPendingEditorContent(null);
    }
  }, [pendingEditorContent]);

  // Clear editor when navigating to a new conversation (store-driven)
  useEffect(() => {
    const store = useDashboardStore.getState();
    const convId = store.generateParams.conversationId;
    if (convId && convId !== lastConversationRef.current) {
      lastConversationRef.current = convId;
      store.setCurrentEditorHtml('');
    }
  }, []);

  // Load template HTML when a template is selected
  useEffect(() => {
    if (!selectedTemplateId) return;
    const loadTemplate = async () => {
      const dashStore = useDashboardStore.getState();
      dashStore.setIsTemplateLoading(true);
      try {
        const res = await fetch(`/api/templates?id=${selectedTemplateId}`);
        if (!res.ok) throw new Error('Failed to load template');
        const data = await res.json();
        if (data.html) {
          dashStore.setCurrentEditorHtml(data.html);
          autoSaveRef.current.schedule(data.html);
          if (data.template?.name) setDocTitle(data.template.name);
        }
      } catch (e) {
        console.error('Failed to load template:', e);
      } finally {
        dashStore.setSelectedTemplateId(null);
        dashStore.setIsTemplateLoading(false);
      }
    };
    loadTemplate();
  }, [selectedTemplateId]);

  // Combined generating state for UI
  const showGeneratingState = isGenerating || isAutoGenerating;

  // Render EditorToolbar only when iframeRef is ready
  const editorToolbar = iframeRef ? (
    <EditorToolbar
      iframeRef={iframeRef}
      onContentChange={handleContentChange}
      isEditing={true}
      disabled={!currentEditorHtml}
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

      {/* Sidebar - AIChatSidebar handles its own initialization */}
      <aside className="w-[348px] bg-white border-r border-gray-100 h-full flex-shrink-0 relative overflow-hidden">
        {showDocTypesOverlay ? <DocTypesOverlay /> : <AIChatSidebar />}
      </aside>

      {/* Main area */}
      <main className="flex-1 min-w-0 bg-[#F3F4F6] h-screen flex flex-col">
        <EditorToolbarBar
          editorView={editorView}
          onBackToTemplates={handleBackToTemplates}
          onBackToEditor={handleBackToEditor}
          docTitle={docTitle}
          isSaving={false}
          showSavedIcon={showSavedIcon}
          handleSave={handleSave}
          editorToolbar={editorToolbar}
          isGenerating={showGeneratingState}
          onBeforeExport={() => previewRef.current?.flushContent?.()}
          getIframeElement={() => previewRef.current?.getIframeRef?.()?.current ?? null}
        />

        {editorView === 'templates' ? (
          <EditorTemplatesGrid />
        ) : (
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
              onContentChange={handleContentChange}
              floatingImages={floatingImages}
              onFloatingImagesChange={setFloatingImages}
              isGenerating={showGeneratingState}
              initialEditing
              hideControls
              hideToolbar
              previewRef={previewRef}
              onIframeReady={handleIframeReady}
            />
          </div>
        )}
      </main>
    </div>
  );
}
