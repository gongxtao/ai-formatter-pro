'use client';

import { useTranslations } from 'next-intl';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { HomeIcon } from './icons/HomeIcon';
import { DocumentIcon } from './icons/DocumentIcon';
import { TemplatesIcon } from './icons/TemplatesIcon';
import { HistoryIcon } from './icons/HistoryIcon';
import { SignInIcon } from './icons/SignInIcon';
import type { NavItem } from '@/types/dashboard';

const navItems: { key: NavItem; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'home', Icon: HomeIcon },
  { key: 'document', Icon: DocumentIcon },
  { key: 'templates', Icon: TemplatesIcon },
  { key: 'history', Icon: HistoryIcon },
];

interface MiniNavProps {
  onNavigate?: (key: NavItem) => void;
}

export function MiniNav({ onNavigate }: MiniNavProps) {
  const t = useTranslations('dashboard');
  const activeNav = useDashboardStore((s) => s.activeNav);

  const handleClick = (key: NavItem) => {
    onNavigate?.(key);
  };

  return (
    <div className="w-[72px] bg-white border-r border-gray-100 flex flex-col items-center py-4 gap-6 h-full overflow-y-auto hide-scrollbar z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] relative pb-20 flex-shrink-0">
      {navItems.map(({ key, Icon }) => (
        <button
          key={key}
          onClick={() => handleClick(key)}
          className={`flex flex-col items-center gap-1.5 group ${
            activeNav === key ? 'text-primary' : 'text-gray-500 hover:text-primary'
          }`}
        >
          <Icon className="w-5 h-5" />
          <span className="text-[10px] font-medium">{t(key)}</span>
        </button>
      ))}

      <div className="absolute bottom-4 w-full flex justify-center">
        <button className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-900 group" title={t('signIn')}>
          <SignInIcon className="w-6 h-6" />
          <span className="text-[9px] font-medium">{t('signIn')}</span>
        </button>
      </div>
    </div>
  );
}
