import { useTranslations } from 'next-intl';
import { ShieldIcon } from './icons/ShieldIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { UsersIcon } from './icons/UsersIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

const ICONS = [ShieldIcon, RefreshIcon, UsersIcon, BriefcaseIcon];

export function WorkSmarter() {
  const t = useTranslations('landing.workSmarter');
  const items = t.raw('items') as { title: string; description: string }[];

  return (
    <section className="max-w-6xl mx-auto px-4 py-24">
      <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t('title')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {items.map((item, i) => {
          const Icon = ICONS[i];
          return (
            <div
              key={item.title}
              className="bg-white border border-gray-100 p-8 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="w-10 h-10 bg-blue-50 text-primary rounded-lg flex items-center justify-center mb-5">
                <Icon />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
