'use client';

import { cn } from '@/lib/utils';
import { DocumentIcon } from './icons/DocumentIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface SidebarMenuItemProps {
  label: string;
  active?: boolean;
  hasChevron?: boolean;
  onClick?: () => void;
}

export function SidebarMenuItem({ label, active, hasChevron, onClick }: SidebarMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-colors text-left whitespace-nowrap overflow-hidden',
        active
          ? 'bg-blue-50 text-primary font-medium'
          : 'text-gray-700 hover:bg-gray-50'
      )}
    >
      <DocumentIcon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-primary' : 'text-gray-400')} />
      <span className="flex-1">{label}</span>
      {hasChevron && <ChevronRightIcon className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />}
    </button>
  );
}
