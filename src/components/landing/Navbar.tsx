'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { StarIcon } from './icons/StarIcon';
import { SearchIcon } from './icons/SearchIcon';
import { HamburgerIcon } from './icons/HamburgerIcon';

export function Navbar() {
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 w-full bg-white border-b border-gray-200 z-50">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 hover:bg-gray-100 rounded-md lg:hidden"
          >
            <HamburgerIcon />
          </button>
          <div className="cursor-pointer flex items-center">
            <span className="text-2xl font-bold tracking-tighter text-gray-900">
              Template<span className="text-primary">.net</span>
            </span>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 max-w-2xl mx-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <SearchIcon className="w-4 h-4 absolute left-4 top-3 text-gray-500" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 hover:border-primary hover:text-primary font-medium text-sm transition-colors">
            <StarIcon />
            {t('pricing')}
          </button>
          <Button variant="ghost" size="md" className="hidden sm:inline-flex">
            {t('login')}
          </Button>
          <Button variant="primary" size="md">
            {t('signUp')}
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <div className="relative w-full">
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full bg-gray-100 border-none rounded-full py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-primary outline-none"
            />
            <SearchIcon className="w-4 h-4 absolute left-4 top-3 text-gray-500" />
          </div>
          <button className="flex items-center gap-2 w-full px-4 py-2.5 rounded-full border border-gray-200 hover:border-primary hover:text-primary font-medium text-sm transition-colors">
            <StarIcon />
            {t('pricing')}
          </button>
          <Button variant="ghost" size="md" className="w-full">
            {t('login')}
          </Button>
        </div>
      )}
    </header>
  );
}
