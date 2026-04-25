import React from 'react';
import { cn } from '../../lib/utils';

export default function PageHeader({ title, subtitle, actions, breadcrumb, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 animate-fade-in-up', className)}>
      <div className="space-y-1 min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            {breadcrumb.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-text-primary/30 text-[10px]">/</span>}
                <span className={cn(
                  'text-[10px] font-bold uppercase tracking-widest',
                  i === breadcrumb.length - 1 ? 'text-primary' : 'text-text-primary/40'
                )}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary font-display">{title}</h1>
        {subtitle && (
          <p className="text-[10px] uppercase tracking-widest text-text-primary/40 font-body">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
