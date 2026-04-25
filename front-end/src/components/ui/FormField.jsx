import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

export const inputCls =
  'w-full bg-surface border border-text-primary/10 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-primary text-sm transition-all placeholder:text-text-primary/30 font-body';

export const inputSmCls =
  'w-full bg-surface border border-text-primary/10 rounded-xl px-4 py-2 text-text-primary outline-none focus:ring-1 focus:ring-primary text-sm transition-all placeholder:text-text-primary/30 font-body';

export const labelCls =
  'text-xs font-bold uppercase tracking-widest text-text-primary/60 font-body';

export const inputErrorCls =
  'w-full bg-surface border border-error/40 rounded-xl px-4 py-3 text-text-primary outline-none focus:ring-1 focus:ring-error text-sm transition-all placeholder:text-text-primary/30 font-body';

export function FormLabel({ children, required, htmlFor }) {
  return (
    <label className={labelCls} htmlFor={htmlFor}>
      {children}{required && <span className="text-error ml-0.5">*</span>}
    </label>
  );
}

export function FormInput({ error, small, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <input className={cn(base, className)} {...props} />
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}

export function PasswordInput({ error, className, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="w-full relative">
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={cn(error ? inputErrorCls : inputCls, 'pr-10', className)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-primary/40 hover:text-text-primary transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}

export function FormSelect({ error, small, children, className, ...props }) {
  const base = small ? inputSmCls : (error ? inputErrorCls : inputCls);
  return (
    <div className="w-full">
      <select className={cn(base, 'appearance-none', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}

export function TextareaField({ error, className, rows = 3, ...props }) {
  return (
    <div className="w-full">
      <textarea
        rows={rows}
        className={cn(error ? inputErrorCls : inputCls, 'resize-none', className)}
        {...props}
      />
      {error && <p className="text-error text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function FormField({ label, required, error, htmlFor, children }) {
  return (
    <div className="space-y-1.5">
      {label && <FormLabel required={required} htmlFor={htmlFor}>{label}</FormLabel>}
      {children}
      {error && !React.Children.toArray(children).some((c) => c?.props?.error) && (
        <p className="text-error text-xs mt-1">{error}</p>
      )}
    </div>
  );
}
