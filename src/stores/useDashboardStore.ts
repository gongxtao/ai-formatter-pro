import { create } from 'zustand';
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

  editorView: 'editor' | 'templates';
  setEditorView: (view: 'editor' | 'templates') => void;

  showDocTypesOverlay: boolean;
  toggleDocTypesOverlay: () => void;

  pendingEditorContent: string | null;
  setPendingEditorContent: (content: string | null) => void;

  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;

  currentEditorHtml: string;
  setCurrentEditorHtml: (html: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeNav: 'document',
  setActiveNav: (nav) => set({ activeNav: nav }),

  activeDocType: 'businessPlan',
  setActiveDocType: (key) => set({ activeDocType: key }),

  activeTemplateCategory: 'resume',
  setActiveTemplateCategory: (key) => set({ activeTemplateCategory: key }),

  sidebarSearchQuery: '',
  setSidebarSearchQuery: (q) => set({ sidebarSearchQuery: q }),

  templateSearchQuery: '',
  setTemplateSearchQuery: (q) => set({ templateSearchQuery: q }),

  shuffleTrigger: 0,
  triggerShuffle: () => set((s) => ({ shuffleTrigger: s.shuffleTrigger + 1 })),

  editorView: 'editor',
  setEditorView: (view) => set({ editorView: view }),

  showDocTypesOverlay: false,
  toggleDocTypesOverlay: () => set((s) => ({ showDocTypesOverlay: !s.showDocTypesOverlay })),

  pendingEditorContent: null,
  setPendingEditorContent: (content) => set({ pendingEditorContent: content }),

  isGenerating: false,
  setIsGenerating: (generating) => set({ isGenerating: generating }),

  currentEditorHtml: '',
  setCurrentEditorHtml: (html) => set({ currentEditorHtml: html }),
}));
