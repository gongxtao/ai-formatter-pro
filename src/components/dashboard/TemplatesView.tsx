'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { TemplateFilterBar } from './TemplateFilterBar';
import { TemplateCardGrid } from './TemplateCardGrid';
import { GenerateIcon } from './icons/GenerateIcon';

export function TemplatesView() {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const activeTemplateCategory = useDashboardStore((s) => s.activeTemplateCategory);
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);

  // Use template category or fallback to doc type
  const currentCategory = activeTemplateCategory || activeDocType;
  // Get the translated label (e.g., "Business Plan", "报告", etc.)
  const docTypeLabel = t(`docTypes.${currentCategory}` as 'dashboard.docTypes.businessPlan');

  const handleGenerateClick = useCallback(() => {
    // Sync activeDocType with current template category before navigating
    if (currentCategory && currentCategory !== activeDocType) {
      setActiveDocType(currentCategory);
    }
    // Navigate to document view (expanded sidebar with categories)
    setActiveNav('document');
    router.push('/dashboard');
  }, [currentCategory, activeDocType, setActiveDocType, setActiveNav, router]);

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-[#FAFAFA]">
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-8 py-16 text-center">
          <h1 className="text-[40px] md:text-[48px] font-bold text-gray-900 mb-6 tracking-tight">
            {t('templatesHeroTitle', { docType: docTypeLabel })}
          </h1>
          <p className="text-gray-600 mb-10 text-base md:text-[17px] max-w-3xl mx-auto leading-relaxed">
            {t('templatesHeroDescription', { docTypeLower: docTypeLabel.toLowerCase() })}
          </p>
          <button
            onClick={handleGenerateClick}
            className="px-8 py-3.5 bg-primary text-white rounded-full font-semibold hover:bg-blue-700 transition-all duration-200 shadow-[0_4px_14px_rgba(30,13,255,0.25)] hover:shadow-[0_6px_20px_rgba(30,13,255,0.3)] hover:-translate-y-0.5 flex items-center gap-2.5 mx-auto"
          >
            <GenerateIcon className="w-5 h-5" />
            {t('templatesCta', { docType: currentCategory })}
          </button>
        </div>
      </div>

      <div className="w-full px-8 pb-20 text-left mt-10 bg-[#FAFAFA]">
        <TemplateFilterBar />
        <TemplateCardGrid />
      </div>
    </div>
  );
}
