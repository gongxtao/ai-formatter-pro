'use client';

import { useCallback } from 'react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplatesStore } from '@/stores/useTemplatesStore';
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
  const setActiveFilterTag = useDashboardStore((s) => s.setActiveFilterTag);
  const setActiveDocType = useDashboardStore((s) => s.setActiveDocType);
  const setActiveTemplateCategory = useDashboardStore((s) => s.setActiveTemplateCategory);
  const categories = useTemplatesStore((s) => s.categories);
  const resetTemplates = useTemplatesStore((s) => s.resetTemplates);
  const isSidebarExpanded = activeNav === 'document' || activeNav === 'templates';

  const handleNav = useCallback(
    (key: NavItem) => {
      setActiveNav(key);

      // Reset filters and select first category when navigating to home
      if (key === 'home') {
        setActiveFilterTag(null);
        resetTemplates();
        // Reset to first category
        if (categories.length > 0) {
          setActiveDocType(categories[0]);
          setActiveTemplateCategory(categories[0]);
        }
      }
    },
    [setActiveNav, setActiveFilterTag, setActiveDocType, setActiveTemplateCategory, resetTemplates, categories],
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
