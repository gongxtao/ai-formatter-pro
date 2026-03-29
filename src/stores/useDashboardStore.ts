import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NavItem } from '@/types/dashboard';

interface DashboardState {
  activeNav: NavItem;
  setActiveNav: (nav: NavItem) => void;

  activeDocType: string;
  setActiveDocType: (key: string) => void;

  activeTemplateCategory: string;
  setActiveTemplateCategory: (key: string) => void;

  sidebarSearchQuery: string;
  setSidebarSearchQuery: (q: string) => void;

  templateSearchQuery: string;
  setTemplateSearchQuery: (q: string) => void;

  shuffleTrigger: number;
  triggerShuffle: () => void;

  selectDocType: (key: string) => void;

  activeFilterTag: string | null;
  setActiveFilterTag: (tag: string | null) => void;

  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;

  editorView: 'editor' | 'templates';
  setEditorView: (view: 'editor' | 'templates') => void;

  showDocTypesOverlay: boolean;
  toggleDocTypesOverlay: () => void;

  pendingEditorContent: string | null;
  setPendingEditorContent: (content: string | null) => void;

  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  isTemplateLoading: boolean;
  setIsTemplateLoading: (loading: boolean) => void;

  currentEditorHtml: string;
  setCurrentEditorHtml: (html: string) => void;

  generationSessionId: string | null;
  setGenerationSessionId: (id: string | null) => void;

  // New fields for generation flow
  generateParams: {
    conversationId: string | null;
    category: string | null;
    templateId: string | null;
    shouldAutoGenerate: boolean;
  };
  setGenerateParams: (params: Partial<DashboardState['generateParams']>) => void;
  clearGenerateParams: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeNav: 'document',
      setActiveNav: (nav) => set({ activeNav: nav }),

      activeDocType: '',
      setActiveDocType: (key) => set({ activeDocType: key }),

      activeTemplateCategory: '',
      setActiveTemplateCategory: (key) => set({ activeTemplateCategory: key }),

      sidebarSearchQuery: '',
      setSidebarSearchQuery: (q) => set({ sidebarSearchQuery: q }),

      templateSearchQuery: '',
      setTemplateSearchQuery: (q) => set({ templateSearchQuery: q }),

      shuffleTrigger: 0,
      triggerShuffle: () => set((s) => ({ shuffleTrigger: s.shuffleTrigger + 1 })),
      selectDocType: (key) => set((s) => ({ activeDocType: key, activeTemplateCategory: key, shuffleTrigger: s.shuffleTrigger + 1 })),

      activeFilterTag: null,
      setActiveFilterTag: (tag) => set({ activeFilterTag: tag }),

      selectedTemplateId: null,
      setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),

      editorView: 'templates',
      setEditorView: (view) => set({ editorView: view }),

      showDocTypesOverlay: false,
      toggleDocTypesOverlay: () => set((s) => ({ showDocTypesOverlay: !s.showDocTypesOverlay })),

      pendingEditorContent: null,
      setPendingEditorContent: (content) => set({ pendingEditorContent: content }),

      isGenerating: false,
      setIsGenerating: (generating) => set({ isGenerating: generating }),

      isTemplateLoading: false,
      setIsTemplateLoading: (loading) => set({ isTemplateLoading: loading }),

      currentEditorHtml: '',
      setCurrentEditorHtml: (html) => set({ currentEditorHtml: html }),

      generationSessionId: null,
      setGenerationSessionId: (id) => set({ generationSessionId: id }),

      generateParams: {
        conversationId: null,
        category: null,
        templateId: null,
        shouldAutoGenerate: false,
      },
      setGenerateParams: (params) =>
        set((state) => ({
          generateParams: { ...state.generateParams, ...params },
        })),
      clearGenerateParams: () =>
        set({
          generateParams: {
            conversationId: null,
            category: null,
            templateId: null,
            shouldAutoGenerate: false,
          },
        }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        activeDocType: state.activeDocType,
        activeTemplateCategory: state.activeTemplateCategory,
        editorView: state.editorView,
      }),
    }
  )
);
