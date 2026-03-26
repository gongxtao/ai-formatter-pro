'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { MiniNav } from './MiniNav';
import { AIChatSidebar } from './AIChatSidebar';
import { DocTypesOverlay } from './DocTypesOverlay';
import { EditorToolbarBar } from './EditorToolbarBar';
import { A4PageCanvas } from './A4PageCanvas';
import { EditorTemplatesGrid } from './EditorTemplatesGrid';
import type { NavItem } from '@/types/dashboard';

export function EditorShell() {
  const router = useRouter();
  const editorView = useDashboardStore((s) => s.editorView);
  const showDocTypesOverlay = useDashboardStore((s) => s.showDocTypesOverlay);
  const setActiveNav = useDashboardStore((s) => s.setActiveNav);
  const toggleDocTypesOverlay = useDashboardStore((s) => s.toggleDocTypesOverlay);

  const handleNav = useCallback(
    (key: NavItem) => {
      switch (key) {
        case 'home':
          setActiveNav('home');
          router.push('/dashboard');
          break;
        case 'document':
          toggleDocTypesOverlay();
          break;
        case 'templates':
          setActiveNav('templates');
          router.push('/dashboard');
          break;
        case 'history':
          // Already in editor
          break;
      }
    },
    [router, setActiveNav, toggleDocTypesOverlay],
  );

  return (
    <div className="flex h-screen w-full max-w-[1920px] mx-auto">
      {/* MiniNav */}
      <aside className="w-[72px] bg-white border-r border-gray-200 h-full flex-shrink-0 relative z-10">
        <MiniNav onNavigate={handleNav} />
      </aside>

      {/* Sidebar */}
      <aside className="w-[348px] bg-white border-r border-gray-100 h-full flex-shrink-0 relative overflow-hidden">
        {showDocTypesOverlay ? <DocTypesOverlay /> : <AIChatSidebar />}
      </aside>

      {/* Main area */}
      <main className="flex-1 min-w-0 bg-white h-screen flex flex-col">
        <EditorToolbarBar />

        {editorView === 'templates' ? (
          <EditorTemplatesGrid />
        ) : (
          <A4PageCanvas />
        )}
      </main>
    </div>
  );
}
