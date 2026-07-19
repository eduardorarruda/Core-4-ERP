import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

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
        <ConfirmModal
          {...state}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
