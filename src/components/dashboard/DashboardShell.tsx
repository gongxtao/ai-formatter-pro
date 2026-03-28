'use client';

import { useCallback } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { MiniNav } from './MiniNav';
import { SecondarySidebar } from './SecondarySidebar';
import { ContentHeader } from './ContentHeader';
import { HomeView } from './HomeView';
import { TemplatesView } from './TemplatesView';
import { HistoryView } from './HistoryView';
import type { NavItem } from '@/types/dashboard';

export function DashboardShell() {
  const activeNav = useDashboardStore((s) => s.activeNav);
  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const isSidebarExpanded = activeNav === 'document' || activeNav === 'templates';

  const handleNav = useCallback(
    (key: NavItem) => {
      setActiveNav(key);
    },
    [setActiveNav],
  );

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      <aside className={`bg-white border-r border-gray-200 h-full flex flex-row flex-shrink-0 relative transition-all duration-300 ${
        isSidebarExpanded ? 'w-[420px]' : 'w-[72px]'
      }`}>
        <MiniNav onNavigate={handleNav} />
        <SecondarySidebar />
      </aside>

      <main className="flex-1 min-w-0 bg-white relative h-screen flex flex-col">
        <ContentHeader />
        {(activeNav === 'home' || activeNav === 'document') && <HomeView />}
        {activeNav === 'templates' && <TemplatesView />}
        {activeNav === 'history' && <HistoryView />}
      </main>
    </div>
  );
}
