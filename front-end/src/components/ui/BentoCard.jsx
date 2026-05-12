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
  accentChip,
}) {
  if (loading) {
    return <SkeletonCard className={className} />;
  }

  return (
    <section
      className={cn(
        'rounded-[18px] p-6 flex flex-col',
        'transition-all duration-200',
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: accentColor
          ? `2px solid ${accentColor}33`
          : '1px solid rgba(250,250,250,0.08)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 3px rgba(0,0,0,.3), 0 8px 32px rgba(0,0,0,.2)',
        ...(accentColor && !accentChip ? { borderLeftWidth: 2, borderLeftColor: accentColor } : {}),
      }}
    >
      {(title || headerAction || accentChip) && (
        <div className="flex justify-between items-start mb-6">
          <div className="min-w-0">
            {title && (
              <h2 className="text-lg font-semibold tracking-tight text-text-primary font-display">{title}</h2>
            )}
            {subtitle && (
              <p className="text-[10px] text-text-primary/50 uppercase font-bold tracking-widest mt-1 font-mono">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {accentChip && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                padding: '2px 8px', borderRadius: 4,
                background: accentChip.startsWith('▲') || accentChip.startsWith('+')
                  ? 'rgba(110,255,192,.12)' : 'rgba(255,180,171,.12)',
                color: accentChip.startsWith('▲') || accentChip.startsWith('+')
                  ? '#6EFFC0' : '#FFB4AB',
                fontFamily: 'monospace',
              }}>
                {accentChip}
              </span>
            )}
            {headerAction}
          </div>
        </div>
      )}
      <div className="flex-1">
        {children}
      </div>
    </section>
  );
}
