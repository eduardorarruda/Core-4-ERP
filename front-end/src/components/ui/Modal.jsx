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
 * - showClose: exibe o botão X (default: true) — use false em diálogos obrigatórios
 * - description: texto de apoio abaixo do título (ligado via aria-describedby)
 * - initialFocusRef: ref do elemento que recebe o foco ao abrir (default: 1º focável)
 *
 * Subcomponente: <Modal.Footer> para a área de ações (botões).
 */
const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

// Pilha de modais abertos: só o do topo responde a Esc/Tab (modal sobre modal)
const pilhaModais = [];

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Modal({
  open,
  onClose,
  title,
  size = 'md',
  closeOnOverlay = true,
  closeOnEsc = true,
  showClose = true,
  description,
  initialFocusRef,
  children,
  className,
}) {
  const painelRef = useRef(null);
  const foragidoRef = useRef(null); // elemento que tinha o foco antes de abrir
  const tituloId = useId();
  const descricaoId = useId();

  // onClose/closeOnEsc em refs: o efeito abaixo depende só de `open`. Antes ele re-executava a
  // cada render do pai (onClose inline muda sempre), roubando o foco do campo em digitação.
  const onCloseRef = useRef(onClose);
  const closeOnEscRef = useRef(closeOnEsc);
  const initialFocusRefRef = useRef(initialFocusRef);
  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscRef.current = closeOnEsc;
    initialFocusRefRef.current = initialFocusRef;
  });

  // Bloqueia scroll do body, guarda/devolve o foco e liga o Escape
  useEffect(() => {
    if (!open) return undefined;

    foragidoRef.current = document.activeElement;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Foca o primeiro elemento focável (ou o próprio painel)
    const painel = painelRef.current;
    // Prioriza o 1º campo do conteúdo (não o X do cabeçalho)
    const focavel = initialFocusRefRef.current?.current
      ?? painel?.querySelector(`[data-modal-corpo] :is(${FOCAVEIS})`)
      ?? painel?.querySelector(FOCAVEIS);
    const marcador = {};
    pilhaModais.push(marcador);
    (focavel || painel)?.focus();

    const handleKey = (e) => {
      if (pilhaModais[pilhaModais.length - 1] !== marcador) return;
      if (e.key === 'Escape' && closeOnEscRef.current) {
        e.stopPropagation();
        onCloseRef.current?.();
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
      pilhaModais.splice(pilhaModais.indexOf(marcador), 1);
      document.body.style.overflow = overflowAnterior;
      // Devolve o foco ao elemento anterior
      foragidoRef.current?.focus?.();
    };
  }, [open]);

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
        aria-describedby={description ? descricaoId : undefined}
        tabIndex={-1}
        className={cn(
          'bg-surface-low text-text-primary rounded-2xl shadow-2xl w-full max-h-[85dvh] overflow-y-auto',
          // No celular, modais grandes ocupam a tela; os pequenos (confirmações) ficam como cartão
          (size === 'lg' || size === 'xl')
            ? 'max-sm:max-w-full max-sm:h-full max-sm:max-h-[100dvh] max-sm:rounded-none'
            : 'max-sm:max-w-full max-sm:max-h-[90dvh]',
          SIZES[size] || SIZES.md,
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 p-5 pb-3">
          <div className="min-w-0">
            <h2 id={tituloId} className="text-text-primary font-bold text-base font-display leading-snug">
              {title}
            </h2>
            {description && (
              <p id={descricaoId} className="mt-1 text-sm text-text-primary/70 leading-relaxed">{description}</p>
            )}
          </div>
          {showClose && (
          <button
            type="button"
            onClick={() => onClose?.()}
            aria-label="Fechar"
            className="shrink-0 -mr-1.5 -mt-1 w-11 h-11 grid place-items-center rounded-xl text-text-primary/70 hover:text-text-primary hover:bg-surface-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
          )}
        </div>
        <div className="px-5 pb-5" data-modal-corpo="">{children}</div>
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
