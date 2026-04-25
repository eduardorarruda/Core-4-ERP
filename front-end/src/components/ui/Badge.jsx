import React from 'react';
import { cn } from '../../lib/utils';

const VARIANTS = {
  success: 'bg-primary/15 text-primary border border-primary/20',
  warning: 'bg-amber-400/15 text-amber-400 border border-amber-400/20',
  error: 'bg-error/15 text-error border border-error/20',
  info: 'bg-secondary/15 text-secondary border border-secondary/20',
  neutral: 'bg-surface-highest text-text-primary/60 border border-text-primary/10',
};

const SIZES = {
  sm: 'text-[10px] px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Badge({ variant = 'neutral', size = 'sm', children, className, dot = false }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-wider',
      VARIANTS[variant] ?? VARIANTS.neutral,
      SIZES[size] ?? SIZES.sm,
      className
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          variant === 'error' && 'bg-error animate-pulse-dot',
          variant === 'success' && 'bg-primary',
          variant === 'warning' && 'bg-amber-400',
          variant === 'info' && 'bg-secondary',
          variant === 'neutral' && 'bg-text-primary/40',
        )} />
      )}
      {children}
    </span>
  );
}
