'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { mockTemplates } from '@/data/mockTemplates';
import { TemplateCard } from './TemplateCard';
import { TemplateFilterBar } from './TemplateFilterBar';

export function EditorTemplatesGrid() {
  const t = useTranslations('editor');
  const tDash = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const setEditorView = useDashboardStore((s) => s.setEditorView);
  const docTypeLabel = tDash(`docTypes.${activeDocType}` as 'dashboard.docTypes.businessPlan');

  const handleUseTemplate = () => {
    setEditorView('editor');
  };

  const handleStartFromScratch = () => {
    setEditorView('editor');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h2 className="text-[28px] font-bold text-gray-900 mb-2 tracking-tight">
        {tDash('templatesTitle', { docType: docTypeLabel })}
      </h2>
      <p className="text-sm text-gray-500 mb-6">{tDash('templatesHeroDescription', { docType: docTypeLabel, docTypeLower: docTypeLabel.toLowerCase() })}</p>

      <TemplateFilterBar />

      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-8">
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
        {mockTemplates.map((card) => (
          <div key={card.id} onClick={handleUseTemplate}>
            <TemplateCard template={card} />
          </div>
        ))}
      </div>
    </div>
  );
}
