'use client';

import { useDashboardStore } from '@/stores/useDashboardStore';
import { useTemplates } from '@/hooks/useTemplates';
import { DocumentPanel } from './DocumentPanel';
import { TemplatesPanel } from './TemplatesPanel';

export function SecondarySidebar() {
  const activeNav = useDashboardStore((s) => s.activeNav);
  const isExpanded = activeNav === 'document' || activeNav === 'templates';

  // Fetch categories & templates from Supabase on mount
  useTemplates();

  return (
    <div
      className={`flex-1 flex flex-col bg-white h-full relative z-0 transition-all duration-300 overflow-hidden ${
        isExpanded ? 'opacity-100' : 'opacity-0 w-0'
      }`}
    >
      {activeNav === 'document' && <DocumentPanel />}
      {activeNav === 'templates' && <TemplatesPanel />}
    </div>
  );
}
