import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('landing.footer');

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center">
          <span className="text-xl font-bold tracking-tighter text-gray-900">
            Template<span className="text-primary">.net</span>
          </span>
        </div>
        <div className="text-sm text-gray-500 text-center">{t('copyright')}</div>
        <div className="flex space-x-6">
          <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">{t('privacy')}</a>
          <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">{t('terms')}</a>
          <a href="#" className="text-gray-500 hover:text-gray-900 text-sm">{t('contact')}</a>
        </div>
      </div>
    </footer>
  );
}
