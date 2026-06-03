'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-shimmer bg-gradient-to-r from-card-hover via-card to-card-hover bg-[length:200%_100%]',
        {
          'rounded-full': variant === 'circular',
          'rounded-lg': variant === 'rectangular',
          'rounded h-4': variant === 'text',
        },
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-4 rounded-xl border border-card-border bg-card p-6">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-3/4" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <Skeleton variant="rectangular" height={100} />
      <div className="flex gap-2">
        <Skeleton variant="rectangular" height={36} className="flex-1" />
        <Skeleton variant="rectangular" height={36} className="flex-1" />
      </div>
    </div>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-card-border pb-2">
        <Skeleton variant="text" className="w-1/4" />
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-1/4" />
        <Skeleton variant="text" className="w-1/4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="text" className="w-1/4" />
          <Skeleton variant="text" className="w-1/3" />
          <Skeleton variant="text" className="w-1/4" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonTable };
