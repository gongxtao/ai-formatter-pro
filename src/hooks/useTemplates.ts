'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';

export function useTemplates() {
  const categories = useTemplatesStore((s) => s.categories);
  const subcategories = useTemplatesStore((s) => s.subcategories);
  const templates = useTemplatesStore((s) => s.templates);
  const categoriesLoading = useTemplatesStore((s) => s.categoriesLoading);
  const subcategoriesLoading = useTemplatesStore((s) => s.subcategoriesLoading);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const isLoadingMore = useTemplatesStore((s) => s.isLoadingMore);
  const error = useTemplatesStore((s) => s.error);
  const pagination = useTemplatesStore((s) => s.pagination);
  const filters = useTemplatesStore((s) => s.filters);
  const fetchCategories = useTemplatesStore((s) => s.fetchCategories);
  const fetchSubcategories = useTemplatesStore((s) => s.fetchSubcategories);
  const fetchTemplates = useTemplatesStore((s) => s.fetchTemplates);
  const loadMoreTemplates = useTemplatesStore((s) => s.loadMoreTemplates);
  const setFilter = useTemplatesStore((s) => s.setFilter);
  const resetTemplates = useTemplatesStore((s) => s.resetTemplates);

  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const activeTemplateCategory = useDashboardStore((s) => s.activeTemplateCategory);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);

  const initialized = useRef(false);

  // Fetch categories on mount
  useEffect(() => {
    if (categories.length === 0 && !categoriesLoading && !error) {
      fetchCategories();
    }
  }, [categories.length, categoriesLoading, error, fetchCategories]);

  // Initialize activeDocType with first category after categories load
  useEffect(() => {
    if (!categoriesLoading && categories.length > 0 && !initialized.current) {
      initialized.current = true;

      const isValidDocType = categories.includes(activeDocType);
      const isValidTemplateCategory = categories.includes(activeTemplateCategory);

      if (!isValidDocType) {
        setActiveDocType(categories[0]);
      }
      if (!isValidTemplateCategory) {
        setActiveTemplateCategory(categories[0]);
      }
    }
  }, [categories, categoriesLoading, activeDocType, activeTemplateCategory, setActiveDocType, setActiveTemplateCategory]);

  // Get active category
  const activeCategory = activeTemplateCategory || activeDocType;

  // Fetch subcategories when category changes
  useEffect(() => {
    if (activeCategory && categories.includes(activeCategory)) {
      fetchSubcategories(activeCategory);
    }
  }, [activeCategory, categories, fetchSubcategories]);

  // Fetch templates when category changes (initial load only, filters handled separately)
  useEffect(() => {
    if (activeCategory && categories.includes(activeCategory)) {
      fetchTemplates(activeCategory);
    }
  }, [activeCategory, categories, fetchTemplates]);

  const loadMore = useCallback(() => {
    if (activeCategory && categories.includes(activeCategory)) {
      loadMoreTemplates(activeCategory);
    }
  }, [activeCategory, categories, loadMoreTemplates]);

  // Apply filter and refetch templates
  const applyFilter = useCallback(
    (newFilter: { subcategory?: string | null; search?: string }) => {
      if (activeCategory && categories.includes(activeCategory)) {
        const mergedFilter = {
          subcategory: newFilter.subcategory !== undefined ? (newFilter.subcategory ?? undefined) : filters.subcategory ?? undefined,
          search: newFilter.search !== undefined ? newFilter.search : filters.search,
        };
        fetchTemplates(activeCategory, mergedFilter);
      }
    },
    [activeCategory, categories, filters, fetchTemplates]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    if (activeCategory && categories.includes(activeCategory)) {
      fetchTemplates(activeCategory, { subcategory: undefined, search: '' });
    }
  }, [activeCategory, categories, fetchTemplates]);

  return {
    categories,
    subcategories,
    templates,
    categoriesLoading,
    subcategoriesLoading,
    templatesLoading,
    isLoadingMore,
    error,
    pagination,
    filters,
    loadMore,
    applyFilter,
    clearFilters,
    setFilter,
    resetTemplates,
    activeCategory,
  };
}
