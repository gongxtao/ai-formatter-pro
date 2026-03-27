'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { SidebarMenuItem } from './SidebarMenuItem';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';

export function DocumentPanel() {
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const triggerShuffle = useDashboardStore((s) => s.triggerShuffle);
  const sidebarSearchQuery = useDashboardStore((s) => s.sidebarSearchQuery);
  const setSidebarSearchQuery = useDashboardStore((s) => s.setSidebarSearchQuery);
  const categories = useTemplatesStore((s) => s.categories);
  const categoriesLoading = useTemplatesStore((s) => s.categoriesLoading);

  const filtered = categories.filter((cat) =>
    cat.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full w-full absolute inset-0 bg-white">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">{t('document')}</span>
      </div>

      <div className="flex-1 bg-white overflow-y-auto hide-scrollbar pb-32 flex flex-col relative">
        <div className="p-3 sticky top-0 bg-white z-10">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={sidebarSearchQuery}
              onChange={(e) => setSidebarSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-9 pr-3 text-[13px] focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="p-3 pt-0">
          {categoriesLoading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((cat) => (
                <SidebarMenuItem
                  key={cat}
                  label={cat}
                  active={activeDocType === cat}
                  onClick={() => {
                    setActiveDocType(cat);
                    triggerShuffle();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
