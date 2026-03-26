'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { documentTypes } from '@/data/documentTypes';
import { SidebarMenuItem } from './SidebarMenuItem';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';

export function TemplatesPanel() {
  const t = useTranslations('dashboard');
  const activeTemplateCategory = useDashboardStore((s) => s.activeTemplateCategory);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);
  const sidebarSearchQuery = useDashboardStore((s) => s.sidebarSearchQuery);
  const setSidebarSearchQuery = useDashboardStore((s) => s.setSidebarSearchQuery);

  const filtered = documentTypes.filter((dt) =>
    t(dt.labelKey).toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full absolute inset-0 bg-white">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">{t('templates')}</span>
      </div>

      <div className="flex-1 bg-white overflow-y-auto hide-scrollbar pb-32 flex flex-col relative">
        <div className="p-3 sticky top-0 bg-white z-10">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('templateSearchPlaceholder')}
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-9 pr-3 text-[13px] focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="p-3 pt-0">
          <div className="space-y-0.5">
            {filtered.map((dt) => (
              <SidebarMenuItem
                key={dt.key}
                label={t(dt.labelKey)}
                active={activeTemplateCategory === dt.key}
                hasChevron={dt.hasChevron}
                onClick={() => setActiveTemplateCategory(dt.key)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
