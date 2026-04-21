import React from 'react';

// ── Shared CSS class constants ─────────────────────────────────────────────

export const inputCls =
  'w-full bg-surface border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-primary text-sm transition-all';

export const inputSmCls =
  'w-full bg-surface border border-white/5 rounded-xl px-4 py-2 text-white outline-none focus:ring-1 focus:ring-primary text-sm transition-all';

export const labelCls =
  'text-xs font-bold uppercase tracking-widest text-zinc-500';

export const inputErrorCls =
  'w-full bg-surface border border-red-500/40 rounded-xl px-4 py-3 text-white outline-none focus:ring-1 focus:ring-red-500 text-sm transition-all';

// ── Reusable Components ────────────────────────────────────────────────────

export function FormLabel({ children, required, htmlFor }) {
  return (
    <label className={labelCls} htmlFor={htmlFor}>
      {children}{required && ' *'}
    </label>
  );
}

export function FormInput({ error, small, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <input className={`${base} ${className || ''}`} {...props} />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export function FormSelect({ error, small, children, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <select className={`${base} appearance-none ${className || ''}`} {...props}>
        {children}
      </select>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function FormField({ label, required, error, htmlFor, children }) {
  return (
    <div className="space-y-1">
      {label && <FormLabel required={required} htmlFor={htmlFor}>{label}</FormLabel>}
      {children}
      {error && !React.Children.toArray(children).some(c => c?.props?.error) && (
        <p className="text-red-400 text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
