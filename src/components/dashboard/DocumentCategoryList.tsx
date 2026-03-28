'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';
import { SidebarMenuItem } from './SidebarMenuItem';

interface DocumentCategoryListProps {
  /** 选中类别后的回调 */
  onSelect?: (category: string) => void;
  /** 是否显示为全屏覆盖层样式 */
  overlay?: boolean;
}

export function DocumentCategoryList({ onSelect, overlay = false }: DocumentCategoryListProps) {
  const t = useTranslations('dashboard');
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const categories = useTemplatesStore((s) => s.categories);
  const categoriesLoading = useTemplatesStore((s) => s.categoriesLoading);
  const [search, setSearch] = useState('');

  // Filter and reorder: selected category first
  const filtered = useMemo(() => {
    const result = categories.filter((cat) =>
      cat.toLowerCase().includes(search.toLowerCase())
    );
    if (!activeDocType || !result.includes(activeDocType)) {
      return result;
    }
    const activeIndex = result.indexOf(activeDocType);
    const reordered = [...result];
    reordered.splice(activeIndex, 1);
    reordered.unshift(activeDocType);
    return reordered;
  }, [categories, search, activeDocType]);

  const handleSelect = (cat: string) => {
    onSelect?.(cat);
  };

  const containerClass = overlay
    ? 'flex flex-col h-full w-full absolute inset-0 bg-white z-20 animate-[slideInLeft_0.25s_ease-out]'
    : 'flex flex-col h-full w-full absolute inset-0 bg-white';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="h-[50px] border-b border-gray-100 flex justify-between items-center px-6 bg-white z-10 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-900">{t('document')}</span>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-y-auto hide-scrollbar pb-32 flex flex-col relative">
        {/* Search */}
        <div className="p-3 sticky top-0 bg-white z-10">
          <div className="relative">
            <SearchIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-9 pr-3 text-[13px] focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {/* Category list */}
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
                  onClick={() => handleSelect(cat)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
