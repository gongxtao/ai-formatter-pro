'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { TemplateCard } from './TemplateCard';
import { TemplateFilterBar } from './TemplateFilterBar';

export function EditorTemplatesGrid() {
  const t = useTranslations('editor');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const activeTemplateCategory = useDashboardStore((s) => s.activeTemplateCategory);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);

  const templates = useTemplatesStore((s) => s.templates);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const isLoadingMore = useTemplatesStore((s) => s.isLoadingMore);
  const pagination = useTemplatesStore((s) => s.pagination);
  const loadMoreTemplates = useTemplatesStore((s) => s.loadMoreTemplates);

  const activeCategory = activeTemplateCategory || activeDocType;

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleStartFromScratch = () => {
    setEditorView('editor');
  };

  // Infinite scroll: observe load more trigger
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !pagination.hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !isLoadingMore) {
          loadMoreTemplates(activeCategory);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pagination.hasMore, isLoadingMore, loadMoreTemplates, activeCategory]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 px-8 text-left bg-[#FAFAFA]">
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

        {/* Loading skeletons */}
        {templatesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="border border-gray-200 rounded-xl aspect-[1/1.414] bg-gray-100 animate-pulse mb-4" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
            </div>
          ))
        ) : (
          templates.map((card) => (
            <div key={card.id} onClick={() => {
              setSelectedTemplateId(card.id);
              setEditorView('editor');
            }}>
              <TemplateCard template={card} />
            </div>
          ))
        )}

        {/* Load more trigger (infinite scroll sentinel) */}
        <div ref={loadMoreRef} className="col-span-full flex justify-center py-4">
          {isLoadingMore ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : pagination.hasMore && !templatesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : null}
        </div>

        {/* End of list indicator */}
        {!pagination.hasMore && templates.length > 0 && !templatesLoading && (
          <div className="col-span-full flex justify-center py-4 text-sm text-gray-400">
            No more templates
          </div>
        )}

        {/* Empty state */}
        {!templatesLoading && templates.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
            <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">No templates found</p>
          </div>
        )}
      </div>
    </div>
  );
}
