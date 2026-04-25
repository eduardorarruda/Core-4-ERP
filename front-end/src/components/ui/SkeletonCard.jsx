import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonText({ className, width = 'w-full' }) {
  return (
    <div className={cn('h-3 rounded-full shimmer-bg', width, className)} />
  );
}

export function SkeletonCircle({ size = 'w-8 h-8', className }) {
  return (
    <div className={cn('rounded-full shimmer-bg', size, className)} />
  );
}

export function SkeletonRow({ cols = 3, className }) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      <SkeletonCircle size="w-8 h-8 shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="w-1/3" />
        <SkeletonText width="w-1/2" className="h-2" />
      </div>
      {cols > 2 && <SkeletonText width="w-16" />}
      {cols > 3 && <SkeletonText width="w-12" />}
    </div>
  );
}

export default function SkeletonCard({ rows = 3, className }) {
  return (
    <div className={cn('bg-surface-medium rounded-2xl p-6 space-y-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-2">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-20" className="h-2" />
        </div>
        <SkeletonCircle size="w-8 h-8" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
