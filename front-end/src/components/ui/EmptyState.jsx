import React from 'react';
import { cn } from '../../lib/utils';

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      {Icon && (
        <div className="w-16 h-16 bg-surface-highest rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-text-primary/30" />
        </div>
      )}
      <h3 className="text-sm font-bold text-text-primary font-display mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-primary/50 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
