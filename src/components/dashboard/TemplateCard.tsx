'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { Template } from '@/types/dashboard';

interface TemplateCardProps {
  template: Template;
}

// Generate a simple blur placeholder (shimmer effect)
function generateShimmer(width: number, height: number): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#e5e7eb;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f3f4f6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#shimmer)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Base64 shimmer placeholder (220x311 = 1:1.414 aspect ratio)
const SHIMMER_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMjAiIGhlaWdodD0iMzExIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9InNoaW1tZXIiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZjNmNGY2O3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iNTAlIiBzdHlsZT0ic3RvcC1jb2xvcjojZTVlN2ViO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6I2YzZjRmNjtzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3NoaW1tZXIpIi8+PC9zdmc+';

export function TemplateCard({ template }: TemplateCardProps) {
  const t = useTranslations('dashboard');

  // Memoize the card dimensions
  const cardDimensions = useMemo(() => ({
    width: 220,
    height: 311, // 220 * 1.414
  }), []);

  return (
    <div className="group cursor-pointer">
      <div
        className="border border-gray-200 rounded-xl overflow-hidden aspect-[1/1.414] relative shadow-sm group-hover:shadow-lg transition-shadow duration-200 will-change-[box-shadow] mb-4"
        style={{ minWidth: cardDimensions.width }}
      >
        {/* Premium/Free badge */}
        <div className={`absolute top-4 left-4 backdrop-blur px-3 py-1 rounded-md text-[12px] font-bold shadow-sm z-10 border ${
          template.is_premium
            ? 'bg-amber-50/90 text-amber-700 border-amber-200'
            : 'bg-white/90 text-gray-800 border-gray-100'
        }`}>
          {template.is_premium ? t('premium') : t('free')}
        </div>

        {/* Image */}
        {template.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnail_url}
            alt={template.name}
            className="absolute inset-0 w-full h-full object-cover"
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 will-change-[opacity] flex items-center justify-center">
          <div className="bg-white text-gray-900 px-6 py-2.5 rounded-full font-medium shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-200 will-change-transform">
            {t('useTemplate')}
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-[15px] text-gray-900 group-hover:text-primary transition-colors duration-150 text-center px-2 line-clamp-2" title={template.name}>
        {template.name}
      </h3>
    </div>
  );
}
