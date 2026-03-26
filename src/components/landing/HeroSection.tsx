'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChatBox } from './ChatBox';
import { DocumentTypeTags } from './DocumentTypeTags';

export function HeroSection() {
  const t = useTranslations('landing');
  const [activeDocType, setActiveDocType] = useState(t('hero.whitePaper'));

  return (
    <section className="max-w-[800px] mx-auto px-4 text-center mt-8 mb-16">
      <h1 className="text-4xl md:text-[44px] font-extrabold text-gray-900 mb-4 leading-tight">
        {t('hero.title')}
      </h1>
      <p className="text-gray-600 mb-10 text-[15px] md:text-base leading-relaxed">
        {t('hero.subtitle')}
      </p>

      <ChatBox activeDocType={activeDocType} />
      <DocumentTypeTags activeType={activeDocType} onSelect={setActiveDocType} />
    </section>
  );
}
