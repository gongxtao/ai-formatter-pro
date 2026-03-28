'use client';

import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { TemplateCard } from './TemplateCard';
import type { Template } from '@/types/dashboard';

// Maximum templates to keep in memory (5 pages × 20 items)
const MAX_TEMPLATES = 100;

// Memoized template card wrapper to prevent unnecessary re-renders
const MemoizedTemplateCard = memo(function MemoizedTemplateCard({
  template,
  onClick
}: {
  template: Template;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className="contents cursor-pointer">
      <TemplateCard template={template} />
    </div>
  );
});

export function TemplateCardGrid() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const activeTemplateCategory = useDashboardStore((s) => s.activeTemplateCategory);
  const shuffleTrigger = useDashboardStore((s) => s.shuffleTrigger);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);
  const setEditorView = useDashboardStore((s) => s.setEditorView);

  const templates = useTemplatesStore((s) => s.templates);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const isLoadingMore = useTemplatesStore((s) => s.isLoadingMore);
  const pagination = useTemplatesStore((s) => s.pagination);
  const loadMoreTemplates = useTemplatesStore((s) => s.loadMoreTemplates);

  const activeCategory = activeTemplateCategory || activeDocType;

  const [cards, setCards] = useState(templates);
  const [fading, setFading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Limit cards to MAX_TEMPLATES to prevent memory issues
  useEffect(() => {
    setCards(templates.slice(0, MAX_TEMPLATES));
  }, [templates]);

  const handleCardClick = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditorView('editor');
    router.push('/dashboard/editor');
  }, [setSelectedTemplateId, setEditorView, router]);

  const shuffleCards = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setCards((prev) => {
        const shuffled = [...prev];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      });
      setFading(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (shuffleTrigger > 0) shuffleCards();
  }, [shuffleTrigger, shuffleCards]);

  // Check if we've reached the max limit
  const hasReachedMaxLimit = templates.length >= MAX_TEMPLATES;
  const canLoadMore = pagination.hasMore && !hasReachedMaxLimit;

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

  // Manual load more when max limit reached
  const handleManualLoadMore = useCallback(() => {
    // Clear old templates and reset pagination to load fresh
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadMoreTemplates(activeCategory);
  }, [loadMoreTemplates, activeCategory]);

  if (templatesLoading) {
    return (
      <div>
        <div className="h-9 w-64 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="border border-gray-200 rounded-xl aspect-[1/1.414] bg-gray-100 animate-pulse mb-4" />
              <div className="h-4 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {cards.map((card) => (
          <MemoizedTemplateCard
            key={card.id}
            template={card}
            onClick={() => handleCardClick(card.id)}
          />
        ))}

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

        {/* Max limit reached - show manual load more button */}
        {hasReachedMaxLimit && pagination.hasMore && (
          <div className="col-span-full flex flex-col items-center justify-center py-6 gap-3">
            <p className="text-sm text-gray-500">Loaded {MAX_TEMPLATES} templates</p>
            <button
              onClick={handleManualLoadMore}
              className="px-6 py-2 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Load More Templates
            </button>
          </div>
        )}

        {/* End of list indicator */}
        {!pagination.hasMore && cards.length > 0 && (
          <div className="col-span-full flex justify-center py-4 text-sm text-gray-400">
            No more templates
          </div>
        )}

        {/* Empty state */}
        {!templatesLoading && cards.length === 0 && (
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
