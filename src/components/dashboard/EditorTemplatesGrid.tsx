'use client';

import { useRef, useEffect, useCallback, memo } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { TemplateCard } from './TemplateCard';
import { TemplateFilterBar } from './TemplateFilterBar';
import type { Template } from '@/types/dashboard';

// Maximum templates to keep in memory
const MAX_TEMPLATES = 100;

// Memoized template card wrapper
const MemoizedTemplateCard = memo(function MemoizedTemplateCard({
  template,
  onClick
}: {
  template: Template;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick}>
      <TemplateCard template={template} />
    </div>
  );
});

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

  // Limit templates to prevent memory issues
  const visibleTemplates = templates.slice(0, MAX_TEMPLATES);
  const hasReachedMaxLimit = templates.length >= MAX_TEMPLATES;
  const canLoadMore = pagination.hasMore && !hasReachedMaxLimit;

  // Intersection observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleStartFromScratch = useCallback(() => {
    setEditorView('editor');
  }, [setEditorView]);

  const handleTemplateClick = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditorView('editor');
  }, [setSelectedTemplateId, setEditorView]);

  // Infinite scroll: observe load more trigger
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !canLoadMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && canLoadMore && !isLoadingMore) {
          loadMoreTemplates(activeCategory);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [canLoadMore, isLoadingMore, loadMoreTemplates, activeCategory]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 px-8 text-left bg-[#FAFAFA]">
      <TemplateFilterBar />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
        {/* Start from scratch card */}
        <div className="group cursor-pointer" onClick={handleStartFromScratch}>
          <div className="border-2 border-dashed border-gray-300 rounded-xl aspect-[1/1.414] relative flex flex-col items-center justify-center gap-3 group-hover:border-primary group-hover:bg-blue-50/30 transition-colors duration-200 will-change-[border-color,background-color]">
            <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors duration-200">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-600 group-hover:text-primary transition-colors duration-150">
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
          visibleTemplates.map((card) => (
            <MemoizedTemplateCard
              key={card.id}
              template={card}
              onClick={() => handleTemplateClick(card.id)}
            />
          ))
        )}

        {/* Load more trigger (infinite scroll sentinel) */}
        <div ref={loadMoreRef} className="col-span-full flex justify-center py-4">
          {isLoadingMore ? (
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : canLoadMore ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : null}
        </div>

        {/* Max limit reached - show indicator */}
        {hasReachedMaxLimit && pagination.hasMore && (
          <div className="col-span-full flex flex-col items-center justify-center py-6 gap-2">
            <p className="text-sm text-gray-500">Loaded {MAX_TEMPLATES} templates</p>
            <button
              onClick={() => loadMoreTemplates(activeCategory)}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Continue Loading
            </button>
          </div>
        )}

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
