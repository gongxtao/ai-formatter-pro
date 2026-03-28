import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Template } from '@/types/dashboard';

interface TemplatesState {
  categories: string[];
  templates: Template[];
  categoriesLoading: boolean;
  templatesLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  fetchTemplates: (category: string) => Promise<void>;
}

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set) => ({
      categories: [],
      templates: [],
      categoriesLoading: false,
      templatesLoading: false,
      error: null,

      fetchCategories: async () => {
        set({ categoriesLoading: true, error: null });
        try {
          const res = await fetch('/api/templates?type=categories');
          if (!res.ok) throw new Error('Failed to fetch categories');
          const data = await res.json();
          set({ categories: data.categories, categoriesLoading: false });
        } catch (e) {
          set({ error: (e as Error).message, categoriesLoading: false });
        }
      },

      fetchTemplates: async (category: string) => {
        set({ templatesLoading: true, error: null, templates: [] });
        try {
          const res = await fetch(`/api/templates?category=${encodeURIComponent(category)}`);
          if (!res.ok) throw new Error('Failed to fetch templates');
          const data = await res.json();
          set({ templates: data.templates, templatesLoading: false });
        } catch (e) {
          set({ error: (e as Error).message, templatesLoading: false });
        }
      },
    }),
    {
      name: 'templates-storage',
      partialize: (state) => ({
        categories: state.categories,
      }),
    }
  )
);
