import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast } from '../../hooks/useToast';

const ICONS = { success: CheckCircle, error: XCircle, info: Info };

const STYLES = {
  success: 'bg-[var(--color-success-surface)] border-[var(--color-success-border)] text-[var(--color-success-text)]',
  error: 'bg-[var(--color-error-surface)] border-[var(--color-error-border)] text-[var(--color-error-text)]',
  info: 'bg-secondary/10 border-secondary/20 text-secondary',
};

function ToastItem({ id, message, type = 'success', duration = 3000 }) {
  const { dismiss } = useToast();
  const [exiting, setExiting] = useState(false);

  const close = () => {
    setExiting(true);
    setTimeout(() => dismiss(id), 300);
  };

  useEffect(() => {
    const t = setTimeout(close, duration);
    return () => clearTimeout(t);
  }, []);

  const Icon = ICONS[type] ?? Info;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium max-w-sm w-full overflow-hidden',
        'transition-all duration-300',
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 animate-slide-in-right',
        STYLES[type] ?? STYLES.info
      )}
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={close} aria-label="Fechar notificação" className="ml-1 opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded">
        <X className="w-3.5 h-3.5" />
      </button>
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-30"
        style={{ animation: `progressBar ${duration}ms linear forwards` }}
      />
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div aria-live="polite" className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem {...t} />
        </div>
      ))}
    </div>
  );
}

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const Icon = ICONS[type] ?? Info;

  return (
    <div className={cn(
      'fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium max-w-sm animate-slide-in-right relative overflow-hidden',
      STYLES[type] ?? STYLES.info
    )}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} aria-label="Fechar" className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-30"
        style={{ animation: 'progressBar 3000ms linear forwards' }} />
    </div>
  );
}
