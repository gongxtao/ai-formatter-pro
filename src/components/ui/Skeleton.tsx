import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, variant = 'rectangular', width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        {
          'rounded-full': variant === 'circular',
          'rounded': variant === 'text',
          'rounded-card': variant === 'rectangular',
        },
        className
      )}
      style={{ width, height }}
    />
  );
}
