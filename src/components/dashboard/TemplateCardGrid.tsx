'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { TemplateCard } from './TemplateCard';

export function TemplateCardGrid() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const activeFilterTag = useDashboardStore((s) => s.activeFilterTag);
  const templateSearchQuery = useDashboardStore((s) => s.templateSearchQuery);
  const shuffleTrigger = useDashboardStore((s) => s.shuffleTrigger);
  const setSelectedTemplateId = useDashboardStore((s) => s.setSelectedTemplateId);
  const docTypeLabel = t(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');
  const templates = useTemplatesStore((s) => s.templates);
  const templatesLoading = useTemplatesStore((s) => s.templatesLoading);
  const [cards, setCards] = useState(templates);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setCards(templates);
  }, [templates]);

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

  const filteredCards = useMemo(() => {
    let result = cards;
    if (activeFilterTag) {
      result = result.filter((card) => card.subcategory === activeFilterTag);
    }
    if (templateSearchQuery.trim()) {
      const q = templateSearchQuery.toLowerCase();
      result = result.filter((card) =>
        card.name.toLowerCase().includes(q) ||
        card.description?.toLowerCase().includes(q) ||
        card.subcategory?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, activeFilterTag, templateSearchQuery]);

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
      {/* <h2 className="text-[28px] font-bold text-gray-900 mb-6 tracking-tight">
        {t('templatesTitle', { docType: docTypeLabel })}
      </h2> */}
      <div className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {filteredCards.map((card) => (
          <div key={card.id} onClick={() => {
            setSelectedTemplateId(card.id);
            router.push('/dashboard/editor');
          }} className="contents cursor-pointer">
            <TemplateCard template={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
