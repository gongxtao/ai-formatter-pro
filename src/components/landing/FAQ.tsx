'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

export function FAQ() {
  const t = useTranslations('landing.faq');
  const items = t.raw('items') as { question: string; answer: string }[];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section className="max-w-3xl mx-auto px-4 py-16 mb-20">
      <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">{t('title')}</h2>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.question} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(i)}
              className="w-full px-6 py-4 bg-white hover:bg-gray-50 flex justify-between items-center text-left"
            >
              <h3 className="font-semibold text-gray-900 pr-4">{item.question}</h3>
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${
                  openIndex === i ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === i && (
              <div className="px-6 pb-4 text-gray-600 text-sm leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
