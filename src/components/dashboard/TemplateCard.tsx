'use client';

import { useTranslations } from 'next-intl';
import type { Template } from '@/types/dashboard';

interface TemplateCardProps {
  template: Template;
}

export function TemplateCard({ template }: TemplateCardProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="group cursor-pointer">
      <div className="border border-gray-200 rounded-xl overflow-hidden aspect-[1/1.414] relative shadow-sm group-hover:shadow-lg transition-all duration-300 mb-4">
        <div className={`absolute top-4 left-4 backdrop-blur px-3 py-1 rounded-md text-[12px] font-bold shadow-sm z-10 border ${template.is_premium ? 'bg-amber-50/90 text-amber-700 border-amber-200' : 'bg-white/90 text-gray-800 border-gray-100'}`}>
          {template.is_premium ? t('premium') : t('free')}
        </div>

        {template.thumbnail_url ? (
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm text-gray-500 font-medium line-clamp-2">{template.name}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
            {t('useTemplate')}
          </div>
        </div>
      </div>
      <h3 className="font-medium text-[15px] text-gray-900 group-hover:text-primary transition-colors text-center px-2 line-clamp-2" title={template.name}>
        {template.name}
      </h3>
    </div>
  );
}
