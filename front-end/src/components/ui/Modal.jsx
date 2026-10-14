import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { variantesOverlay, variantesPainel } from '../motion/presets';

/**
 * Modal base acessível — portal no body, entrada/saída animadas (fundo esmaece, painel
 * cresce de 0.96 → 1). Respeita "reduzir movimento" pelo MotionConfig do app.
 *
 * Props:
 * - open: controla a visibilidade (ao virar false, o painel sai animado)
 * - onClose: chamado ao fechar (X, Escape ou clique no fundo)
 * - title: título do cabeçalho (rótulo acessível do diálogo)
 * - description: frase de apoio abaixo do título (ligada via aria-describedby)
 * - icon: ícone opcional em ladrilho ao lado do título (elemento ou componente lucide)
 * - size: 'sm' | 'md' | 'lg' | 'xl'  (default: 'md')
 * - closeOnOverlay (default true) · closeOnEsc (default true) · showClose (default true)
 * - initialFocusRef: ref do elemento que recebe o foco ao abrir (default: 1º campo do corpo)
 * - onExitComplete: chamado quando a animação de saída termina (opcional)
 *
 * Subcomponente: <Modal.Footer> para a área de ações (botões).
 */
const SIZES = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

function renderIcone(icon) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Icone = icon;
  return <Icone className="w-5 h-5" aria-hidden="true" />;
}

function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
  showClose = true,
  description,
  icon,
  initialFocusRef,
  onExitComplete,
  children,
  className,
}) {
  const painelRef = useRef(null);
  const tituloId = useId();
  const descricaoId = useId();
  useFocusTrap(Boolean(open), painelRef, { onClose, closeOnEsc, initialFocusRef });

  const telaCheiaNoCelular = size === 'lg' || size === 'xl';
  const handleOverlay = (e) => {
    if (e.target === e.currentTarget && closeOnOverlay) onClose?.();
  };

  return createPortal(
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <motion.div
          key="c4-modal"
          className={cn(
            'fixed inset-0 z-[100] flex justify-center bg-surface-overlay backdrop-blur-md',
            telaCheiaNoCelular ? 'items-stretch sm:items-center sm:p-4' : 'items-center p-4',
          )}
          onMouseDown={handleOverlay}
          variants={variantesOverlay}
          initial="inicial"
          animate="visivel"
          exit="saida"
        >
          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={description ? descricaoId : undefined}
            tabIndex={-1}
            variants={variantesPainel}
            className={cn(
              'relative w-full flex flex-col overflow-hidden outline-none text-text-primary',
              'bg-surface-low border border-border-strong shadow-[var(--shadow-elevated)]',
              'rounded-[var(--radius-card)] max-h-[88dvh]',
              telaCheiaNoCelular && 'max-sm:h-full max-sm:max-h-[100dvh] max-sm:rounded-none max-sm:border-0 max-sm:pt-safe max-sm:pb-safe',
              SIZES[size] || SIZES.md,
              className
            )}
          >
            {/* Fio de luz esmeralda no topo — a assinatura das superfícies elevadas */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-3 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                {icon && (
                  <span aria-hidden="true" className="grid place-items-center w-10 h-10 shrink-0 rounded-xl bg-primary/[0.12] text-primary border border-primary/20">
                    {renderIcone(icon)}
                  </span>
                )}
                <div className="min-w-0 pt-0.5">
                  <h2 id={tituloId} className="text-lg font-semibold font-display tracking-tight leading-snug text-text-primary">
                    {title}
                  </h2>
                  {description && (
                    <p id={descricaoId} className="mt-1 text-sm text-text-primary/65 leading-relaxed text-pretty">{description}</p>
                  )}
                </div>
              </div>
              {showClose && (
                <button
                  type="button"
                  onClick={() => onClose?.()}
                  aria-label="Fechar"
                  className="shrink-0 -mr-2 -mt-1.5 w-11 h-11 grid place-items-center rounded-xl text-text-primary/60 hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 overflow-y-auto overscroll-contain min-h-0 flex-1" data-modal-corpo="">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

Modal.Footer = function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-5 mt-1 border-t border-border', className)}>
      {children}
    </div>
  );
};

export default Modal;
export { Modal };
