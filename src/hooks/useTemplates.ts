'use client';

import { useEffect, useRef } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';

export function useTemplates() {
  const categories = useTemplatesStore((s) => s.categories);
  const templates = useTemplatesStore((s) => s.templates);
  const categoriesLoading = useTemplatesStore((s) => s.categoriesLoading);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const error = useTemplatesStore((s) => s.error);
  const fetchCategories = useTemplatesStore((s) => s.fetchCategories);
  const fetchTemplates = useTemplatesStore((s) => s.fetchTemplates);

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

      // Check if current activeDocType exists in categories
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

  // Fetch templates when active doc type or template category changes
  useEffect(() => {
    const category = activeTemplateCategory || activeDocType;
    if (category && categories.includes(category)) {
      fetchTemplates(category);
    }
  }, [activeDocType, activeTemplateCategory, categories, fetchTemplates]);

  return { categories, templates, categoriesLoading, templatesLoading, error };
}
