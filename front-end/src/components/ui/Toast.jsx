import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium max-w-sm animate-in slide-in-from-bottom-2',
      type === 'success'
        ? 'bg-emerald-950 border-emerald-500/30 text-emerald-300'
        : 'bg-red-950 border-red-500/30 text-red-300'
    )}>
      {type === 'success'
        ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
        : <XCircle className="w-4 h-4 shrink-0 text-red-400" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
