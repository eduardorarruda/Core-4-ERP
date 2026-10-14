import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { MSG_SENHA_PROVISORIA } from '../lib/api';

// Ações (estáveis) e lista (muda a cada toast) em contextos separados: assim quem só
// dispara toasts pode pôr `toast` nas dependências de efeitos sem re-executá-los a cada aviso.
const ToastContext = createContext(null);
const ToastListContext = createContext([]);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback(({ message, type = 'success', duration }) => {
    // Bloqueio por senha provisória já é comunicado pelo modal de troca de senha;
    // repetir em toast a cada requisição bloqueada só gera ruído.
    if (message === MSG_SENHA_PROVISORIA) return null;
    const id = ++idCounter;
    // Erros ficam mais tempo na tela: dão tempo de ler e agir
    const tempo = duration ?? (type === 'error' ? 6000 : 4000);
    setToasts((prev) => [...prev, { id, message, type, duration: tempo }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    show,
    dismiss,
    success: (message, opts) => show({ message, type: 'success', ...opts }),
    error: (message, opts) => show({ message, type: 'error', ...opts }),
    info: (message, opts) => show({ message, type: 'info', ...opts }),
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function useToastList() {
  return useContext(ToastListContext);
}
