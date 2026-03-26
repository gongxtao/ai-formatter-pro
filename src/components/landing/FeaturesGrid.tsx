import { useTranslations } from 'next-intl';
import { CheckIcon } from './icons/CheckIcon';

export function FeaturesGrid() {
  const t = useTranslations('landing.features');
  const items = t.raw('items') as { title: string; description: string }[];

  return (
    <section className="max-w-7xl mx-auto px-4 mb-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('title')}</h2>
        <p className="text-gray-600 max-w-3xl mx-auto">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {items.map((item) => (
          <div key={item.title} className="group cursor-pointer">
            <div className="flex items-start gap-4">
              <div className="mt-1 w-6 h-6 flex-shrink-0 text-primary">
                <CheckIcon />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
