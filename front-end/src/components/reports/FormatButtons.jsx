import React from 'react';
import { Monitor, FileText, Download, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

const FORMATS = [
  { key: 'online', label: 'Online',  icon: Monitor,   className: 'bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20' },
  { key: 'pdf',    label: 'PDF',     icon: FileText,   className: 'bg-error/10 text-error border border-error/20 hover:bg-error/20' },
  { key: 'xlsx',   label: 'Excel',   icon: Download,   className: 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20' },
];

export default function FormatButtons({ loading = {}, onSelect }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {FORMATS.map(({ key, label, icon: Icon, className }) => {
        const isLoading = loading[key];
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            disabled={isLoading || Object.values(loading).some(Boolean)}
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50',
              className
            )}
          >
            {isLoading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Icon className="w-4 h-4" />
            }
            {isLoading ? '...' : label}
          </button>
        );
      })}
    </div>
  );
}
