'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { TemplateCard } from './TemplateCard';
import { TemplateFilterBar } from './TemplateFilterBar';

export function EditorTemplatesGrid() {
  const t = useTranslations('editor');
  const tDash = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const activeFilterTag = useDashboardStore((s) => s.activeFilterTag);
  const templateSearchQuery = useDashboardStore((s) => s.templateSearchQuery);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);
  const templates = useTemplatesStore((s) => s.templates);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const docTypeLabel = tDash(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeFilterTag) {
      result = result.filter((tpl) => tpl.subcategory === activeFilterTag);
    }
    if (templateSearchQuery.trim()) {
      const q = templateSearchQuery.toLowerCase();
      result = result.filter((tpl) =>
        tpl.name.toLowerCase().includes(q) ||
        tpl.description?.toLowerCase().includes(q) ||
        tpl.subcategory?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [templates, activeFilterTag, templateSearchQuery]);

  const handleStartFromScratch = () => {
    setEditorView('editor');
  };

  return (
    <div className="flex-1 overflow-y-auto pt-8 pb-20 px-8 text-left bg-white">
      <h2 className="text-[28px] font-bold text-gray-900 mb-6 tracking-tight">
        {tDash('templatesTitle', { docType: docTypeLabel })}
      </h2>

      <TemplateFilterBar />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
        {/* Start from scratch card */}
        <div className="group cursor-pointer" onClick={handleStartFromScratch}>
          <div className="border-2 border-dashed border-gray-300 rounded-xl aspect-[1/1.414] relative flex flex-col items-center justify-center gap-3 group-hover:border-primary group-hover:bg-blue-50/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-primary transition-colors">
              {t('startFromScratch')}
            </span>
          </div>
          <h3 className="font-medium text-[15px] text-gray-900 group-hover:text-primary transition-colors text-center px-2 mt-4">
            {t('startFromScratch')}
          </h3>
        </div>

        {/* Template cards */}
        {templatesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="border border-gray-200 rounded-xl aspect-[1/1.414] bg-gray-100 animate-pulse mb-4" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
            </div>
          ))
        ) : (
          filteredTemplates.map((card) => (
            <div key={card.id} onClick={() => {
              setSelectedTemplateId(card.id);
              setEditorView('editor');
            }}>
              <TemplateCard template={card} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
