'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
import { DocumentIcon } from './icons/DocumentIcon';
import { ScrollRightIcon } from './icons/ScrollRightIcon';
import { ScrollLeftIcon } from './icons/ScrollLeftIcon';

import type { NavItem } from '@/types/dashboard';

export function DocumentTypeTags() {
  const activeDocType = useDashboardStore((s) => s.activeDocType);
  const selectDocType = useDashboardStore((s) => s.selectDocType);
  const activeFilterTag = useDashboardStore((s) => s.activeFilterTag);
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);
  const categories = useTemplatesStore((s) => s.categories);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  const tagTypes = categories.slice(0, 8);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    setShowLeftScroll(el.scrollLeft > 0);
    setShowRightScroll(Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth);
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => {
      window.removeEventListener('resize', checkOverflow);
    };
  }, [checkOverflow, categories]);

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-6 flex items-center w-full max-w-[840px] mx-auto relative overflow-hidden">
      {/* Left gradient mask & button */}
      {showLeftScroll && (
        <div className="absolute left-0 top-0 bottom-1 w-16 bg-gradient-to-r from-white via-white to-transparent z-10 flex items-center justify-start">
          <button
            onClick={scrollLeft}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ScrollLeftIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      <div 
        ref={scrollRef} 
        onScroll={checkOverflow}
        className="flex gap-2.5 overflow-x-auto hide-scrollbar flex-1 pb-1 px-1"
      >
        {tagTypes.map((cat) => {
          const isActive = activeDocType === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                selectDocType(cat);
                setActiveFilterTag(null);
              }}
              className={`whitespace-nowrap px-4 py-2 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'border-gray-300 bg-white text-gray-900 shadow-sm'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <DocumentIcon className="w-4 h-4 text-gray-500" />
              {cat}
            </button>
          );
        })}
      </div>

      {/* Right gradient mask & button */}
      {showRightScroll && (
        <div className="absolute right-0 top-0 bottom-1 w-16 bg-gradient-to-l from-white via-white to-transparent z-10 flex items-center justify-end">
          <button
            onClick={scrollRight}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 bg-white shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ScrollRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
