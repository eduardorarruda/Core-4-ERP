import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState(options);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState(null);
    resolveRef.current?.(true);
  }, []);

  const handleCancel = useCallback(() => {
    setState(null);
    resolveRef.current?.(false);
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmContext.Consumer>
          {() => (
            <_ConfirmDialog
              {...state}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          )}
        </ConfirmContext.Consumer>
      )}
    </ConfirmContext.Provider>
  );
}

function _ConfirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', details, onConfirm, onCancel }) {
  React.useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  const confirmColors = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500'
    : 'bg-amber-600 hover:bg-amber-500';

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onCancel} />
      <div className="relative bg-surface-low border border-text-primary/10 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
        <button onClick={onCancel} aria-label="Fechar" className="absolute top-3 right-3 text-text-primary/40 hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-medium">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
              <svg className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 id="confirm-title" className="text-text-primary font-bold text-sm font-display">{title}</h3>
              <p className="text-text-primary/60 text-sm mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
          {details && details.length > 0 && (
            <ul className="bg-surface rounded-xl p-3 space-y-1">
              {details.map((d, i) => (
                <li key={i} className="text-xs text-text-primary/60 flex items-center gap-2">
                  <span className="w-1 h-1 bg-text-primary/30 rounded-full shrink-0" />
                  {d}
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary hover:border-text-primary/20 transition-all text-sm font-medium">
              {cancelLabel}
            </button>
            <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-white text-sm font-bold transition-all ${confirmColors}`}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
