import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheck, CircleX, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast, useToastList } from '../../hooks/useToast';
import { variantesToast } from '../motion/presets';

const TIPOS = {
  success: { Icone: CircleCheck, ladrilho: 'bg-primary/[0.14] text-primary', fio: 'bg-primary', titulo: 'Pronto' },
  error: { Icone: CircleX, ladrilho: 'bg-error/[0.14] text-error', fio: 'bg-error', titulo: 'Não deu certo' },
  info: { Icone: Info, ladrilho: 'bg-secondary/[0.14] text-secondary', fio: 'bg-secondary', titulo: 'Aviso' },
};


/** Relógio que pausa com o mouse em cima ou com o foco dentro (WCAG 2.2.1). `duration` null = sem tempo. */
function useTempoPausavel(duration, aoTerminar) {
  const [pausado, setPausado] = useState(false);
  const restante = useRef(duration);
  const inicio = useRef(0);

  useEffect(() => {
    if (pausado || !duration) return undefined;
    inicio.current = Date.now();
    const t = setTimeout(aoTerminar, restante.current);
    return () => {
      clearTimeout(t);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    };
  }, [pausado, aoTerminar, duration]);

  const pausar = {
    onMouseEnter: () => setPausado(true),
    onMouseLeave: () => setPausado(false),
    onFocus: () => setPausado(true),
    onBlur: () => setPausado(false),
  };
  return { pausado, pausar };
}

/**
 * Cartão de aviso flutuante (visual + relógio). Usado pelos toasts e por avisos com "Desfazer"
 * que precisam de estado próprio (ex.: conciliação, que adia o envio até o aviso fechar).
 * O anúncio para leitor de tela fica a cargo de quem renderiza (regiões vivas fixas).
 *
 * Props: type ('success'|'error'|'info'), titulo (padrão do tipo), message, icone (lucide, opcional),
 * duration (ms; null = sem tempo), onFechar(), action ({ label, onClick, icon }).
 */
export function CartaoAviso({ type = 'success', titulo, message, icone, duration, onFechar, action }) {
  const { pausado, pausar } = useTempoPausavel(duration, onFechar);
  const tipo = TIPOS[type] ?? TIPOS.info;
  const Icone = icone ?? tipo.Icone;
  const IconeAcao = action?.icon;

  return (
    <div
      {...pausar}
      className={cn(
        'relative flex items-start gap-3 pl-3 pr-1 py-2 w-full sm:w-[22rem] overflow-hidden',
        'rounded-2xl border border-border-strong bg-surface-low/90 backdrop-blur-xl',
        'shadow-[var(--shadow-elevated)] text-text-primary',
      )}
    >
      <span aria-hidden="true" className={cn('grid place-items-center w-9 h-9 mt-0.5 shrink-0 rounded-xl', tipo.ladrilho)}>
        <Icone className="w-5 h-5" />
      </span>
      <div className="flex-1 min-w-0 py-1">
        <p className="text-sm font-semibold leading-tight">{titulo ?? tipo.titulo}</p>
        <p className="mt-0.5 text-sm text-text-primary/75 leading-snug break-words">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-1.5 -ml-2 inline-flex items-center gap-1.5 min-h-11 px-2 rounded-lg text-sm font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {IconeAcao && <IconeAcao className="w-4 h-4" aria-hidden="true" />}
            {action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onFechar}
        aria-label="Fechar aviso"
        className="min-w-11 min-h-11 grid place-items-center rounded-xl text-text-primary/55 hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
      {/* Tempo restante: barra que encolhe e pausa junto com o relógio */}
      {duration ? (
        <div
          aria-hidden="true"
          className={cn('absolute bottom-0 inset-x-0 h-0.5 opacity-70 origin-left', tipo.fio)}
          style={{ animation: `progressBar ${duration}ms linear forwards`, animationPlayState: pausado ? 'paused' : 'running' }}
        />
      ) : null}
    </div>
  );
}

/**
 * Item da pilha de toasts. Erros NÃO somem sozinhos (WCAG 2.2.1/2.2.3): ficam até a pessoa fechar.
 * Com `action`, o clique executa a ação e fecha o aviso; `onClose` roda quando o aviso some sem a ação.
 */
function ToastItem({ id, message, type = 'success', duration = 4000, action, onClose }) {
  const { dismiss } = useToast();
  const fechar = useCallback(() => { dismiss(id); onClose?.(); }, [dismiss, id, onClose]);
  const agir = useCallback(() => { dismiss(id); action?.onClick(); }, [dismiss, id, action]);

  return (
    <CartaoAviso
      type={type}
      message={message}
      duration={type === 'error' ? null : duration}
      onFechar={fechar}
      action={action ? { ...action, onClick: agir } : undefined}
    />
  );
}

export function ToastContainer() {
  const toasts = useToastList();
  const ultimoErro = [...toasts].reverse().find((t) => t.type === 'error');
  const ultimoAviso = [...toasts].reverse().find((t) => t.type !== 'error');

  return (
    <>
      {/* Regiões vivas fixas (não aninhadas): erros são assertivos, o resto é educado */}
      <div className="sr-only" role="alert" aria-atomic="true">
        {ultimoErro?.message ?? ''}
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {ultimoAviso?.message ?? ''}
      </div>

      <div className="fixed bottom-24 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-[200] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              variants={variantesToast}
              initial="inicial"
              animate="visivel"
              exit="saida"
              className="pointer-events-auto w-full sm:w-auto flex justify-end"
            >
              <ToastItem {...t} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
