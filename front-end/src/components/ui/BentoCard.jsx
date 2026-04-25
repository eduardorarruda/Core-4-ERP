import React from 'react';
import { cn } from '../../lib/utils';

export default function BentoCard({ children, className, title, subtitle, headerAction }) {
  return (
    <section className={cn("bg-surface-medium rounded-xl p-6 flex flex-col shadow-xl border border-text-primary/5", className)}>
      {(title || headerAction) && (
        <div className="flex justify-between items-start mb-6">
          <div>
            {title && <h2 className="text-lg font-semibold tracking-tight text-text-primary">{title}</h2>}
            {subtitle && <p className="text-[10px] text-text-primary/50 uppercase font-bold tracking-widest mt-1">{subtitle}</p>}
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
