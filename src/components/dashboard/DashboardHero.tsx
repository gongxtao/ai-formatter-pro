'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';

export function DashboardHero() {
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const docTypeLabel = t(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');

  return (
    <div className="max-w-[1000px] mx-auto px-8 py-12 text-center">
      <h1 className="text-[40px] md:text-[52px] font-bold text-gray-900 mb-6 tracking-tight">
        {t('heroTitle', { docType: docTypeLabel })}
      </h1>
      <p className="text-gray-600 mb-12 text-base md:text-[17px] max-w-3xl mx-auto leading-relaxed">
        {t('heroDescription', { docTypeLower: docTypeLabel.toLowerCase() })}
      </p>
    </div>
  );
}
