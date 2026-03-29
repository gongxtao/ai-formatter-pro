'use client';

import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useHistoryStore } from '@/stores/useHistoryStore';
import { useChatStore } from '@/stores/useChatStore';
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
  const searchParams = useSearchParams();
  const t = useTranslations('editor');
  const th = useTranslations('history');
  const { toast } = useToast();

  // URL params for smart template matching flow
  const urlConversationId = searchParams.get('conversationId');
  const urlCategory = searchParams.get('category');
  const urlTemplateId = searchParams.get('templateId');
  const shouldAutoGenerate = searchParams.get('generate') === '1';

  // Store
  const editorView = useDashboardStore((s) => s.editorView);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);
  const currentEditorHtml = useDashboardStore((s) => s.currentEditorHtml);
  const setCurrentEditorHtml = useDashboardStore((s) => s.setCurrentEditorHtml);
  const pendingEditorContent = useDashboardStore((s) => s.pendingEditorContent);
  const setPendingEditorContent = useDashboardStore((s) => s.setPendingEditorContent);
  const storeIsGenerating = useDashboardStore((s) => s.isGenerating);
  const setIsGenerating = useDashboardStore((s) => s.setIsGenerating);
  const isTemplateLoading = useDashboardStore((s) => s.isTemplateLoading);
  const setIsTemplateLoading = useDashboardStore((s) => s.setIsTemplateLoading);
  const selectedTemplateId = useDashboardStore((s) => s.selectedTemplateId);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);
  const generateParams = useDashboardStore((s) => s.generateParams);
  const clearGenerateParams = useDashboardStore((s) => s.clearGenerateParams);
  const saveDocument = useHistoryStore((s) => s.saveDocument);

  // Chat store for initializing conversation
  const initConversation = useChatStore((s) => s.initConversation);
  const setConversationId = useChatStore((s) => s.setConversationId);
  const clearMessages = useChatStore((s) => s.clearMessages);

  // Track loaded conversation to avoid reloading
  const loadedConversationRef = useRef<string | null>(null);

  // Track if we've started generation for this session
  // Once generation starts, we rely on store's isGenerating state, not URL params
  const generationStartedRef = useRef(false);

  // Derive isGenerating:
  // - When first navigating with generate=1, use URL param to show initial state
  // - Once generation starts, use store's isGenerating state
  // - If store says generating is false after we started, don't use URL param anymore
  const isGenerating = generationStartedRef.current
    ? storeIsGenerating
    : (shouldAutoGenerate || storeIsGenerating);

  // Update generationStartedRef when store state changes
  useEffect(() => {
    if (storeIsGenerating) {
      generationStartedRef.current = true;
    }
  }, [storeIsGenerating]);

  // 确保 templates 数据在页面加载时获取
  useTemplates();

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
          setActiveNav('history');
          router.push('/dashboard');
          break;
      }
    },
    [router, setActiveNav, toggleDocTypesOverlay],
  );

  const handleBackToTemplates = useCallback(() => {
    setEditorView('templates');
  }, [setEditorView]);

  const handleBackToEditor = useCallback(() => {
    setEditorView('editor');
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

  // Sync currentEditorHtml from store to local content (for AI chat streaming)
  // Only update when different to avoid loops
  useEffect(() => {
    if (currentEditorHtml && currentEditorHtml !== content) {
      setContent(currentEditorHtml);
      autoSaveRef.current.schedule(currentEditorHtml);
    }
  }, [currentEditorHtml]);

  // Load template HTML when a template is selected from the dashboard or templates grid
  useEffect(() => {
    if (!selectedTemplateId) return;
    const loadTemplate = async () => {
      setIsTemplateLoading(true);
      try {
        const res = await fetch(`/api/templates?id=${selectedTemplateId}`);
        if (!res.ok) throw new Error('Failed to load template');
        const data = await res.json();
        if (data.html) {
          setContent(data.html);
          setCurrentEditorHtml(data.html);
          autoSaveRef.current.schedule(data.html);
          if (data.template?.name) setDocTitle(data.template.name);
        }
      } catch (e) {
        console.error('Failed to load template:', e);
      } finally {
        setSelectedTemplateId(null);
        setIsTemplateLoading(false);
      }
    };
    loadTemplate();
  }, [selectedTemplateId, setSelectedTemplateId, setCurrentEditorHtml, setIsTemplateLoading]);

  // Flush auto-save on unmount
  useEffect(() => {
    return () => {
      autoSaveRef.current.flush();
    };
  }, []);

  // Load conversation history from API when navigating with conversationId param
  // This supports the smart template matching flow where user is redirected from /dashboard/create
  useEffect(() => {
    const conversationId = urlConversationId || generateParams.conversationId;
    const category = urlCategory || generateParams.category;
    const templateId = urlTemplateId || generateParams.templateId;
    const isAutoGen = shouldAutoGenerate || generateParams.shouldAutoGenerate;

    if (!conversationId) return;

    // Skip if we've already loaded this conversation
    if (loadedConversationRef.current === conversationId) return;
    loadedConversationRef.current = conversationId;

    // Clear old content when loading a new conversation
    // BUT: if auto-generating, the messages are already in the chat store from CreateConversationView
    // so we only clear editor content, not messages
    setContent('');
    setCurrentEditorHtml('');
    if (!isAutoGen) {
      clearMessages();
    }

    const loadConversation = async () => {
      try {
        const res = await fetch(`/api/ai/chat/conversations/${conversationId}`);

        // Handle 404 gracefully - conversation might not exist yet
        if (res.status === 404) {
          // Just set the conversation ID, the messages will be loaded later
          // OR if auto-generating, messages are already in chat store
          setConversationId(conversationId);

          // Set category if provided
          if (category) {
            setActiveDocType(category);
            setActiveTemplateCategory(category);
          }

          // Set template ID if provided
          if (templateId) {
            setSelectedTemplateId(templateId);
          }

          return;
        }

        if (!res.ok) throw new Error('Failed to load conversation');

        const data = await res.json();
        if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
          // Initialize chat store with conversation history
          // Only if not auto-generating (messages already in store) or if store is empty
          const currentMessages = useChatStore.getState().messages;
          if (!isAutoGen || currentMessages.length === 0) {
            initConversation(conversationId, data.messages);
          } else {
            // Just set conversation ID, keep existing messages
            setConversationId(conversationId);
          }
        } else {
          // No messages yet, just set conversation ID
          setConversationId(conversationId);
        }

        // Set category if provided
        if (category) {
          setActiveDocType(category);
          setActiveTemplateCategory(category);
        }

        // Set template ID if provided (will be picked up by AIChatSidebar)
        if (templateId) {
          setSelectedTemplateId(templateId);
        }
      } catch (e) {
        console.error('Failed to load conversation:', e);
        // Don't show toast for expected cases
      }
    };

    loadConversation();

    // Clear generate params after use
    if (generateParams.conversationId) {
      clearGenerateParams();
    }
  }, [
    urlConversationId,
    urlCategory,
    urlTemplateId,
    shouldAutoGenerate,
    generateParams,
    initConversation,
    setConversationId,
    setActiveDocType,
    setActiveTemplateCategory,
    setSelectedTemplateId,
    clearGenerateParams,
    clearMessages,
    setCurrentEditorHtml,
    toast,
  ]);

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
          onBackToEditor={handleBackToEditor}
          docTitle={docTitle}
          isSaving={isSaving}
          showSavedIcon={showSavedIcon}
          handleSave={handleSave}
          editorToolbar={editorToolbar}
          isGenerating={isGenerating}
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
          </div>
        )}
      </main>
    </div>
  );
}
