import React from 'react';
import { cn } from '../../lib/utils';
import SkeletonCard from './SkeletonCard';

export default function BentoCard({
  children,
  className,
  title,
  subtitle,
  headerAction,
  loading,
  accentColor,
}) {
  if (loading) {
    return <SkeletonCard className={className} />;
  }

  return (
    <section
      className={cn(
        'bg-surface-medium rounded-2xl p-6 flex flex-col',
        'border border-text-primary/5',
        'hover:shadow-elevated hover:border-text-primary/10',
        'transition-all duration-200',
        className
      )}
      style={accentColor ? { borderLeftWidth: '2px', borderLeftColor: accentColor } : undefined}
    >
      {(title || headerAction) && (
        <div className="flex justify-between items-start mb-6">
          <div>
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-text-primary font-display">{title}</h2>
            )}
            {subtitle && (
              <p className="text-[10px] text-text-primary/50 uppercase font-bold tracking-widest mt-1 font-body">{subtitle}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </section>
  );
}
