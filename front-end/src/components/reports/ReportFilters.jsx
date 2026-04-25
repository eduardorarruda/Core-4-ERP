import React, { useState, useEffect, useRef } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import { labelCls, inputSmCls } from '../ui/FormField';

export default function ReportFilters({ config = [], values, onChange, open, onToggle }) {
  const [asyncOptions, setAsyncOptions] = useState({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    config.forEach(async (f) => {
      if (f.type === 'async-select') {
        try {
          const opts = await f.fetchFn();
          setAsyncOptions(prev => ({ ...prev, [f.key]: opts }));
        } catch (_) {}
      }
    });
  }, [open, config]);

  if (config.length === 0) return null;

  const activeCount = Object.values(values).filter(v => v !== '' && v !== undefined && v !== null).length;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-text-primary/60 hover:text-text-primary transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        Filtros
        {activeCount > 0 && (
          <span className="ml-1 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-text-primary/5">
          {config.map(f => {
            const opts = f.type === 'async-select' ? (asyncOptions[f.key] || []) : (f.options || []);
            return (
              <div key={f.key} className="space-y-1">
                <label className={labelCls}>{f.label}</label>
                <select
                  className={`${inputSmCls} appearance-none cursor-pointer`}
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value || undefined)}
                >
                  <option value="">Todos</option>
                  {opts.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
