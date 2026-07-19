import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Modal base acessível — renderiza via portal no body.
 *
 * Props:
 * - open: controla a visibilidade (retorna null quando false)
 * - onClose: chamado ao fechar (X, Escape ou clique no overlay)
 * - title: título exibido no cabeçalho (usado como aria-label)
 * - size: 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 * - closeOnOverlay: fecha ao clicar no fundo (default: true)
 * - closeOnEsc: fecha ao pressionar Escape (default: true)
 *
 * Subcomponente: <Modal.Footer> para a área de ações (botões).
 */
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
  children,
  className,
}) {
  const painelRef = useRef(null);
  const foragidoRef = useRef(null); // elemento que tinha o foco antes de abrir
  const tituloId = useId();

  // Bloqueia scroll do body, guarda/devolve o foco e liga o Escape
  useEffect(() => {
    if (!open) return undefined;

    foragidoRef.current = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foca o primeiro elemento focável (ou o próprio painel)
    const painel = painelRef.current;
    const focavel = painel?.querySelector(FOCAVEIS);
    (focavel || painel)?.focus();

    const handleKey = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      // Focus trap: mantém o Tab/Shift+Tab dentro do painel
      const focaveis = Array.from(painel?.querySelectorAll(FOCAVEIS) || []).filter(
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focaveis.length === 0) {
        e.preventDefault();
        painel?.focus();
        return;
      }
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      const ativo = document.activeElement;

      if (e.shiftKey) {
        if (ativo === primeiro || !painel?.contains(ativo)) {
          e.preventDefault();
          ultimo.focus();
        }
      } else if (ativo === ultimo || !painel?.contains(ativo)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = overflowAnterior;
      // Devolve o foco ao elemento anterior
      foragidoRef.current?.focus?.();
    };
  }, [open, closeOnEsc, onClose]);

  if (!open) return null;

  const handleOverlay = (e) => {
    if (e.target === e.currentTarget && closeOnOverlay) onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={handleOverlay}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={cn(
          'bg-surface-low text-text-primary rounded-2xl shadow-2xl w-full max-h-[85dvh] overflow-y-auto',
          'max-sm:max-w-full max-sm:h-full max-sm:max-h-[100dvh] max-sm:rounded-none',
          SIZES[size] || SIZES.md,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <h2 id={tituloId} className="text-text-primary font-bold text-base font-display leading-snug">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Fechar"
            className="shrink-0 -mr-1.5 -mt-1 w-11 h-11 grid place-items-center rounded-xl text-text-primary/50 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-4 mt-2', className)}>{children}</div>
  );
};

export default Modal;
export { Modal };
