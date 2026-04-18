import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Custom confirmation modal replacing native confirm().
 *
 * Usage:
 *   const [confirmAction, setConfirmAction] = useState(null);
 *
 *   function handleDelete(id) {
 *     setConfirmAction({
 *       title: 'Excluir item',
 *       message: 'Tem certeza que deseja excluir este item?',
 *       onConfirm: () => { doDelete(id); setConfirmAction(null); },
 *     });
 *   }
 *
 *   {confirmAction && <ConfirmModal {...confirmAction} onCancel={() => setConfirmAction(null)} />}
 */
export default function ConfirmModal({
  title = 'Confirmar ação',
  message = 'Tem certeza que deseja continuar?',
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning'
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') onCancel?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const confirmColors = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 focus:ring-red-500/30'
    : 'bg-orange-600 hover:bg-orange-500 focus:ring-orange-500/30';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal Card */}
      <div className="relative bg-surface-low border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 slide-in-from-bottom-2 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-4">
          {/* Icon + Title */}
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-500/15' : 'bg-orange-500/15'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                variant === 'danger' ? 'text-red-400' : 'text-orange-400'
              }`} />
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{title}</h3>
              <p className="text-zinc-400 text-sm mt-1 leading-relaxed">{message}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-all text-sm font-medium"
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
