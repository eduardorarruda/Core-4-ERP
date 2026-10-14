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


/**
 * Aviso flutuante. Erros NÃO somem sozinhos (WCAG 2.2.1/2.2.3): ficam até a pessoa fechar.
 * O anúncio para leitores de tela é feito pelas regiões vivas do
 * ToastContainer (fixas no DOM), então o item não tem role/aria-live — evita anúncios duplos.
 * O tempo pausa com o mouse em cima ou com o foco dentro (WCAG 2.2.1).
 */
function ToastItem({ id, message, type = 'success', duration = 4000 }) {
  const { dismiss } = useToast();
  const [pausado, setPausado] = useState(false);
  const restante = useRef(duration);
  const inicio = useRef(0);

  // A saída animada é do AnimatePresence do contêiner: aqui só tiramos o item da lista.
  const close = useCallback(() => dismiss(id), [dismiss, id]);

  const semTempo = type === 'error';

  useEffect(() => {
    if (pausado || semTempo) return undefined;
    inicio.current = Date.now();
    const t = setTimeout(close, restante.current);
    return () => {
      clearTimeout(t);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    };
  }, [pausado, close, semTempo]);

  const tipo = TIPOS[type] ?? TIPOS.info;
  const { Icone } = tipo;

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
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
        <p className="text-sm font-semibold leading-tight">{tipo.titulo}</p>
        <p className="mt-0.5 text-sm text-text-primary/75 leading-snug break-words">{message}</p>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Fechar aviso"
        className="min-w-11 min-h-11 grid place-items-center rounded-xl text-text-primary/55 hover:text-text-primary hover:bg-text-primary/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
      {/* Tempo restante: barra que encolhe e pausa junto com o relógio (erros não têm tempo) */}
      {!semTempo && <div
        aria-hidden="true"
        className={cn('absolute bottom-0 inset-x-0 h-0.5 opacity-70 origin-left', tipo.fio)}
        style={{ animation: `progressBar ${duration}ms linear forwards`, animationPlayState: pausado ? 'paused' : 'running' }}
      />}
    </div>
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
