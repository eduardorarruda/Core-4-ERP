import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const show = useCallback(({ message, type = 'success', duration = 3000 }) => {
    const id = ++idCounter;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, opts) => show({ message, type: 'success', ...opts }), [show]);
  const error = useCallback((message, opts) => show({ message, type: 'error', ...opts }), [show]);
  const info = useCallback((message, opts) => show({ message, type: 'info', ...opts }), [show]);

  return (
    <ToastContext.Provider value={{ show, dismiss, success, error, info, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
