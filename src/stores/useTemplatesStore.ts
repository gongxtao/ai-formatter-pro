import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Template } from '@/types/dashboard';

interface Subcategory {
  name: string;
  count: number;
}

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

interface FilterState {
  subcategory: string | null;
  search: string;
}

interface TemplatesState {
  categories: string[];
  subcategories: Subcategory[];
  templates: Template[];
  categoriesLoading: boolean;
  subcategoriesLoading: boolean;
  templatesLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  pagination: PaginationState;
  filters: FilterState;
  fetchCategories: () => Promise<void>;
  fetchSubcategories: (category: string) => Promise<void>;
  fetchTemplates: (category: string, options?: { subcategory?: string; search?: string; page?: number }) => Promise<void>;
  loadMoreTemplates: (category: string) => Promise<void>;
  setFilter: (filter: Partial<FilterState>) => void;
  resetTemplates: () => void;
}

const DEFAULT_PAGINATION: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
  hasMore: false,
};

const DEFAULT_FILTERS: FilterState = {
  subcategory: null,
  search: '',
};

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set, get) => ({
      categories: [],
      subcategories: [],
      templates: [],
      categoriesLoading: false,
      subcategoriesLoading: false,
      templatesLoading: false,
      isLoadingMore: false,
      error: null,
      pagination: DEFAULT_PAGINATION,
      filters: DEFAULT_FILTERS,

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

      fetchSubcategories: async (category: string) => {
        set({ subcategoriesLoading: true, error: null });
        try {
          const res = await fetch(`/api/templates?type=subcategories&category=${encodeURIComponent(category)}`);
          if (!res.ok) throw new Error('Failed to fetch subcategories');
          const data = await res.json();
          set({ subcategories: data.subcategories, subcategoriesLoading: false });
        } catch (e) {
          set({ error: (e as Error).message, subcategoriesLoading: false });
        }
      },

      fetchTemplates: async (category: string, options?: { subcategory?: string; search?: string; page?: number }) => {
        const { pageSize } = get().pagination;
        const subcategory = options?.subcategory ?? null;
        const search = options?.search ?? ''
        const targetPage = options?.page ?? 1

        set({
          templatesLoading: true,
          error: null,
          templates: targetPage === 1 ? [] : get().templates,
          filters: { subcategory, search },
          pagination: { ...DEFAULT_PAGINATION, page: targetPage }
        });

        try {
          const params = new URLSearchParams({
            category,
            page: String(targetPage),
            pageSize: String(pageSize),
          });
          if (subcategory) params.set('subcategory', subcategory);
          if (search.trim()) params.set('search', search.trim());

          const res = await fetch(`/api/templates?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch templates');
          const data = await res.json();

          set({
            templates: targetPage === 1 ? data.templates : [...get().templates, ...data.templates],
            templatesLoading: false,
            pagination: {
              page: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              hasMore: data.pagination.hasMore,
            },
            filters: {
              subcategory: data.filters?.subcategory ?? null,
              search: data.filters?.search ?? '',
            },
          });
        } catch (e) {
          set({ error: (e as Error).message, templatesLoading: false });
        }
      },

      loadMoreTemplates: async (category: string) => {
        const { templates, pagination, isLoadingMore, filters } = get();
        if (isLoadingMore || !pagination.hasMore) return;

        const nextPage = pagination.page + 1;
        set({ isLoadingMore: true });

        try {
          const params = new URLSearchParams({
            category,
            page: String(nextPage),
            pageSize: String(pagination.pageSize),
          });
          if (filters.subcategory) params.set('subcategory', filters.subcategory);
          if (filters.search.trim()) params.set('search', filters.search.trim());

          const res = await fetch(`/api/templates?${params.toString()}`);
          if (!res.ok) throw new Error('Failed to load more templates');
          const data = await res.json();

          set({
            templates: [...templates, ...data.templates],
            isLoadingMore: false,
            pagination: {
              page: data.pagination.page,
              pageSize: data.pagination.pageSize,
              total: data.pagination.total,
              hasMore: data.pagination.hasMore,
            },
          });
        } catch (e) {
          set({ error: (e as Error).message, isLoadingMore: false });
        }
      },

      setFilter: (filter: Partial<FilterState>) => {
        set((state) => ({
          filters: { ...state.filters, ...filter },
        }));
      },

      resetTemplates: () => {
        set({
          templates: [],
          pagination: DEFAULT_PAGINATION,
          filters: DEFAULT_FILTERS,
        });
      },
    }),
    {
      name: 'templates-storage',
      partialize: (state) => ({
        categories: state.categories,
        subcategories: state.subcategories,
      }),
    }
  )
);
