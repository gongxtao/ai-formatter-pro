import { useTranslations } from 'next-intl';

export function IntroSection() {
  const t = useTranslations('landing.intro');

  return (
    <section className="max-w-4xl mx-auto px-4 text-center mb-20">
      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">{t('title')}</h2>
      <p className="text-gray-600 leading-relaxed">{t('description')}</p>
    </section>
  );
}
