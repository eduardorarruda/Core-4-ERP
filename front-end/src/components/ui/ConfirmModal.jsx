import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  details,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const confirmColors = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500/30'
    : 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/30';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onCancel} />
      <div className="relative bg-surface-low border border-text-primary/10 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
        <button
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute top-3 right-3 text-text-primary/40 hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-medium"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <div>
              <h3 id="confirm-title" className="text-text-primary font-bold text-sm font-display">{title}</h3>
              <p className="text-text-primary/60 text-sm mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          {details && details.length > 0 && (
            <ul className="bg-surface rounded-xl p-3 space-y-1.5">
              {details.map((d, i) => (
                <li key={i} className="text-xs text-text-primary/60 flex items-center gap-2">
                  <span className="w-1 h-1 bg-text-primary/30 rounded-full shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary hover:border-text-primary/20 transition-all text-sm font-medium"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-all focus:outline-none focus:ring-2 ${confirmColors}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
