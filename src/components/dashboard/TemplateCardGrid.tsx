'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { mockTemplates } from '@/data/mockTemplates';
import { TemplateCard } from './TemplateCard';

export function TemplateCardGrid() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const shuffleTrigger = useDashboardStore((s) => s.shuffleTrigger);
  const docTypeLabel = t(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');
  const [cards, setCards] = useState(mockTemplates);
  const [fading, setFading] = useState(false);

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

  return (
    <div>
      <h2 className="text-[28px] font-bold text-gray-900 mb-6 tracking-tight">
        {t('templatesTitle', { docType: docTypeLabel })}
      </h2>
      <div className={`grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
        {cards.map((card) => (
          <div key={card.id} onClick={() => router.push('/dashboard/editor')} className="contents cursor-pointer">
            <TemplateCard template={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
