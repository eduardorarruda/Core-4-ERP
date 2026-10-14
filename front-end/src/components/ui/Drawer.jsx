import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { variantesDrawer, variantesOverlay } from '../motion/presets';

/**
 * Painel lateral (ou "folha" de baixo no celular) com mola, foco preso e Esc para fechar.
 * Bom para detalhes de um registro, filtros no mobile e formulários longos.
 *
 * Props:
 * - open, onClose, title, description
 * - side: 'right' (padrão) | 'left' | 'bottom'
 * - size: 'sm' (380px) | 'md' (480px, padrão) | 'lg' (640px) — largura nas laterais
 * - footer: nó fixo no rodapé (botões)
 * - initialFocusRef, closeOnOverlay (true), closeOnEsc (true)
 */
const LARGURAS = { sm: 'sm:max-w-[380px]', md: 'sm:max-w-[480px]', lg: 'sm:max-w-[640px]' };

export default function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  size = 'md',
  footer,
  initialFocusRef,
  closeOnOverlay = true,
  closeOnEsc = true,
  children,
  className,
}) {
  const painelRef = useRef(null);
  const tituloId = useId();
  const descricaoId = useId();
  const reduzir = useReducedMotion();
  useFocusTrap(Boolean(open), painelRef, { onClose, closeOnEsc, initialFocusRef });

  const baixo = side === 'bottom';
  const variantes = reduzir ? variantesOverlay : variantesDrawer(side);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="c4-drawer"
          className="fixed inset-0 z-[100]"
          initial="inicial"
          animate="visivel"
          exit="saida"
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-surface-overlay backdrop-blur-sm"
            variants={variantesOverlay}
            onMouseDown={() => closeOnOverlay && onClose?.()}
          />
          <motion.div
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? tituloId : undefined}
            aria-describedby={description ? descricaoId : undefined}
            tabIndex={-1}
            variants={variantes}
            className={cn(
              'absolute flex flex-col outline-none text-text-primary bg-surface-low border-border-strong shadow-[var(--shadow-elevated)]',
              baixo
                ? 'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t pb-safe'
                : cn('inset-y-0 w-full', LARGURAS[size] ?? LARGURAS.md, side === 'left' ? 'left-0 border-r' : 'right-0 border-l', 'pt-safe pb-safe'),
              className
            )}
          >
            {baixo && <span aria-hidden="true" className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-text-primary/20" />}
            <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 shrink-0 border-b border-border">
              <div className="min-w-0 pt-1">
                {title && <h2 id={tituloId} className="text-lg font-semibold font-display tracking-tight">{title}</h2>}
                {description && <p id={descricaoId} className="mt-0.5 text-sm text-text-primary/65">{description}</p>}
              </div>
              <button
                type="button"
                onClick={() => onClose?.()}
                aria-label="Fechar"
                className="shrink-0 -mr-2 w-11 h-11 grid place-items-center rounded-xl text-text-primary/60 hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4" data-modal-corpo="">
              {children}
            </div>
            {footer && (
              <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-border">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
