'use client';

import { cn } from '@/lib/utils';
import { useEffect, useRef, useState, ReactNode } from 'react';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export function DropdownMenu({ trigger, children, align = 'left', className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative inline-block">
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 min-w-[180px] rounded-card border border-gray-200 bg-white py-1 shadow-card',
            'animate-[fade_0.15s_ease-in-out]',
            align === 'right' ? 'right-0' : 'left-0',
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  danger?: boolean;
}

export function DropdownMenuItem({ children, onClick, className, danger }: DropdownMenuItemProps) {
  return (
    <button
      onClick={() => {
        onClick?.();
      }}
      className={cn(
        'flex w-full items-center px-4 py-2 text-sm transition-colors',
        danger ? 'text-red-600 hover:bg-red-50' : 'text-secondary hover:bg-gray-50',
        className
      )}
    >
      {children}
    </button>
  );
}

interface DropdownMenuSeparatorProps {
  className?: string;
}

export function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <div className={cn('my-1 h-px bg-gray-200', className)} />;
}
