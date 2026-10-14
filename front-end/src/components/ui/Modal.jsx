import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

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

const MOLA = { type: 'spring', stiffness: 420, damping: 34, mass: 0.8 };

// Pilha de modais abertos: só o do topo responde a Esc/Tab (modal sobre modal)
const pilhaModais = [];

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function renderIcone(icon) {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const Icone = icon;
  return <Icone className="w-5 h-5" aria-hidden="true" />;
}

/** Foco, Esc, Tab preso no painel e scroll do body travado enquanto `ativo`. */
function useArmadilhaDeFoco(ativo, painelRef, { onClose, closeOnEsc, initialFocusRef }) {
  // Em refs: o efeito depende só de `ativo`. Se dependesse de onClose (inline no pai, muda a
  // cada render) ele re-executaria e roubaria o foco do campo em digitação.
  const opcoes = useRef({ onClose, closeOnEsc, initialFocusRef });
  useEffect(() => {
    opcoes.current = { onClose, closeOnEsc, initialFocusRef };
  });

  useEffect(() => {
    if (!ativo) return undefined;
    const quemTinhaFoco = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const painel = painelRef.current;
    const focavel = opcoes.current.initialFocusRef?.current
      ?? painel?.querySelector(`[data-modal-corpo] :is(${FOCAVEIS})`)
      ?? painel?.querySelector(FOCAVEIS);
    const marcador = {};
    pilhaModais.push(marcador);
    (focavel || painel)?.focus({ preventScroll: true });

    const handleKey = (e) => {
      if (pilhaModais[pilhaModais.length - 1] !== marcador) return;
      if (e.key === 'Escape' && opcoes.current.closeOnEsc) {
        e.stopPropagation();
        opcoes.current.onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
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
      const ativoEl = document.activeElement;
      if (e.shiftKey) {
        if (ativoEl === primeiro || !painel?.contains(ativoEl)) { e.preventDefault(); ultimo.focus(); }
      } else if (ativoEl === ultimo || !painel?.contains(ativoEl)) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      pilhaModais.splice(pilhaModais.indexOf(marcador), 1);
      document.body.style.overflow = overflowAnterior;
      quemTinhaFoco?.focus?.({ preventScroll: true });
    };
  }, [ativo, painelRef]);
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
  useArmadilhaDeFoco(Boolean(open), painelRef, { onClose, closeOnEsc, initialFocusRef });

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
            'fixed inset-0 z-[100] flex justify-center bg-surface/70 backdrop-blur-md',
            telaCheiaNoCelular ? 'items-stretch sm:items-center sm:p-4' : 'items-center p-4',
          )}
          onMouseDown={handleOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.16 } }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            aria-describedby={description ? descricaoId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.14 } }}
            transition={MOLA}
            className={cn(
              'relative w-full flex flex-col overflow-hidden outline-none text-text-primary',
              'bg-surface-low border border-text-primary/[0.09] shadow-[var(--shadow-elevated)]',
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
    <div className={cn('flex flex-wrap items-center justify-end gap-2 sm:gap-3 pt-5 mt-1 border-t border-text-primary/[0.06]', className)}>
      {children}
    </div>
  );
};

export default Modal;
export { Modal };
