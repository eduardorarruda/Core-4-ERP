import React, { cloneElement, isValidElement, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { cn } from '../../lib/utils';

/**
 * Dica curta que aparece no hover E no foco do teclado (WCAG 1.4.13: some com Esc,
 * fica visível enquanto o ponteiro está sobre ela). Liga `aria-describedby` no gatilho.
 *
 *   <Tooltip conteudo="Exportar em Excel"><Button size="icon" aria-label="Exportar">…</Button></Tooltip>
 *
 * Props: conteudo (texto/nó), lado ('top' | 'bottom', padrão 'top'), atraso (ms, padrão 250),
 *        children: UM elemento focável.
 * Não use como único rótulo de botão de ícone — o botão precisa de aria-label próprio.
 */
const LADOS = {
  top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
  bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
};

export default function Tooltip({ conteudo, lado = 'top', atraso = 250, children, className }) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const timer = useRef(null);
  const reduzir = useMovimentoReduzido();

  const abrir = (imediato) => {
    clearTimeout(timer.current);
    if (imediato) setAberto(true);
    else timer.current = setTimeout(() => setAberto(true), atraso);
  };
  const fechar = () => {
    clearTimeout(timer.current);
    setAberto(false);
  };

  if (!conteudo || !isValidElement(children)) return children ?? null;

  const descritoPor = [children.props['aria-describedby'], aberto ? id : null].filter(Boolean).join(' ') || undefined;
  const gatilho = cloneElement(children, { 'aria-describedby': descritoPor });

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => abrir(false)}
      onPointerLeave={fechar}
      onFocus={() => abrir(true)}
      onBlur={fechar}
      onKeyDown={(e) => { if (e.key === 'Escape') fechar(); }}
    >
      {gatilho}
      <AnimatePresence>
        {aberto && (
          <motion.span
            id={id}
            role="tooltip"
            initial={reduzir ? { opacity: 0 } : { opacity: 0, y: lado === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            transition={{ duration: 0.14 }}
            className={cn(
              'absolute z-[60] w-max max-w-64 px-2.5 py-1.5 rounded-lg text-xs leading-snug font-medium',
              'bg-text-primary text-surface shadow-elevated pointer-events-none text-pretty',
              LADOS[lado] ?? LADOS.top,
              className
            )}
          >
            {conteudo}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
