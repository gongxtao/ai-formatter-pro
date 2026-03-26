import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-gray-100 text-gray-700': variant === 'default',
          'bg-primary-light text-primary': variant === 'primary',
          'bg-secondary text-white': variant === 'secondary',
          'border border-gray-300 text-gray-700': variant === 'outline',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
