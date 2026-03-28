'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { useTemplates } from '@/hooks/useTemplates';
import { SearchIcon } from '@/components/landing/icons/SearchIcon';
import { ScrollRightIcon } from './icons/ScrollRightIcon';

export function TemplateFilterBar() {
  const t = useTranslations('dashboard');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const { subcategories, filters, applyFilter, clearFilters, subcategoriesLoading } = useTemplates();

  const activeFilterTag = useDashboardStore((s) => s.activeFilterTag);
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);

  // Sync local search with store filter
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        applyFilter({ search: localSearch });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, filters.search, applyFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
  };

  const handleTagClick = (tag: string | null) => {
    if (tag === null) {
      setActiveFilterTag(null);
      clearFilters();
    } else {
      setActiveFilterTag(tag);
      applyFilter({ subcategory: tag });
    }
  };

  // Convert subcategories to filter buttons
  const filterButtons = useMemo(() => {
    const buttons: { label: string; count: number; tag: string | null }[] = [
      { label: 'All', count: 0, tag: null },
    ];
    subcategories.forEach((sub) => {
      buttons.push({
        label: sub.name,
        count: sub.count,
        tag: sub.name,
      });
    });
    return buttons;
  }, [subcategories]);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollWidth > el.clientWidth);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [checkOverflow, filterButtons]);

  const handleScroll = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative mb-2 pb-4 flex items-center gap-3 sticky top-0 bg-[#FAFAFA] z-30 py-2">
      {/* Search input - fixed, does not scroll */}
      <div className="relative w-[240px] flex-shrink-0">
        <SearchIcon className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder={t('templateSearchPlaceholder')}
          value={localSearch}
          onChange={handleSearchChange}
          className="w-full bg-white border border-gray-200 rounded-full py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      {/* Filter buttons - scrollable area */}
      <div ref={scrollRef} className="flex items-center gap-3 overflow-x-auto hide-scrollbar flex-1">
        {/* Loading state */}
        {subcategoriesLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-20 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
          ))
        ) : (
          <>
            {/* Filter buttons */}
            {filterButtons.map((btn) => (
              <button
                key={btn.tag ?? 'all'}
                onClick={() => handleTagClick(btn.tag)}
                className={`whitespace-nowrap font-medium px-2 flex-shrink-0 transition-all ${
                  (btn.tag === null ? activeFilterTag === null : activeFilterTag === btn.tag)
                    ? 'px-5 py-2 bg-blue-50 text-primary rounded-full text-sm ring-1 ring-primary/20'
                    : 'text-[15px] text-gray-600 hover:text-gray-900'
                }`}
              >
                {btn.label}
                {btn.count > 0 && <span className="ml-1 text-xs text-gray-400">({btn.count})</span>}
              </button>
            ))}
          </>
        )}
      </div>

      {showScrollBtn && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-gradient-to-l from-white via-white to-transparent pl-8 pb-4">
          <button
            onClick={handleScroll}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-100 text-gray-400 hover:text-gray-900 z-10"
          >
            <ScrollRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
