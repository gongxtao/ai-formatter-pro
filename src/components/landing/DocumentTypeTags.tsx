'use client';

import { useTranslations } from 'next-intl';

const DOC_TYPE_KEYS = [
  'businessPlan',
  'report',
  'manual',
  'caseStudy',
  'ebook',
  'whitePaper',
  'marketResearch',
  'researchPaper',
] as const;

interface DocumentTypeTagsProps {
  activeType: string;
  onSelect: (type: string) => void;
}

export function DocumentTypeTags({ activeType, onSelect }: DocumentTypeTagsProps) {
  const t = useTranslations('landing.docTypes');

  return (
    <div className="mt-6 flex gap-2 overflow-x-auto hide-scrollbar pb-2 pt-1">
      {DOC_TYPE_KEYS.map((key) => {
        const label = t(key);
        const isActive = activeType === label;
        return (
          <button
            key={key}
            onClick={() => onSelect(label)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full border text-sm transition-colors ${
              isActive
                ? 'border-primary text-primary bg-blue-50'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
