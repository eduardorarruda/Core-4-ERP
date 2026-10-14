import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useToast, useToastList } from '../../hooks/useToast';

const ICONS = { success: CheckCircle, error: XCircle, info: Info };

const STYLES = {
  success: 'bg-[var(--color-success-surface)] border-[var(--color-success-border)] text-[var(--color-success-text)]',
  error: 'bg-[var(--color-error-surface)] border-[var(--color-error-border)] text-[var(--color-error-text)]',
  info: 'bg-surface-low border-secondary/30 text-text-primary',
};

const DURACAO_SAIDA_MS = 300;

/**
 * Toast visual. O anúncio para leitores de tela é feito pelas regiões vivas do
 * ToastContainer (fixas no DOM), então o item em si não tem role/aria-live — evita
 * regiões aninhadas e anúncios duplicados.
 * O tempo pausa com o mouse em cima ou com o foco dentro (WCAG 2.2.1).
 */
function ToastItem({ id, message, type = 'success', duration = 4000 }) {
  const { dismiss } = useToast();
  const [exiting, setExiting] = useState(false);
  const [pausado, setPausado] = useState(false);
  const restante = useRef(duration);
  const inicio = useRef(0);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => dismiss(id), DURACAO_SAIDA_MS);
  }, [dismiss, id]);

  useEffect(() => {
    if (pausado || exiting) return undefined;
    inicio.current = Date.now();
    const t = setTimeout(close, restante.current);
    return () => {
      clearTimeout(t);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    };
  }, [pausado, exiting, close]);

  const Icon = ICONS[type] ?? Info;

  return (
    <div
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
      className={cn(
        'relative flex items-center gap-3 pl-4 pr-1 py-1 rounded-xl shadow-2xl border text-sm font-medium max-w-sm w-full overflow-hidden',
        'transition-all duration-300',
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 animate-slide-in-right',
        STYLES[type] ?? STYLES.info
      )}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="flex-1 py-2">{message}</span>
      <button
        type="button"
        onClick={close}
        aria-label="Fechar notificação"
        className="min-w-11 min-h-11 grid place-items-center rounded-lg opacity-70 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 h-0.5 rounded-full bg-current opacity-30"
        style={{ animation: `progressBar ${duration}ms linear forwards`, animationPlayState: pausado ? 'paused' : 'running' }}
      />
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
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full sm:w-auto flex justify-end">
            <ToastItem {...t} />
          </div>
        ))}
      </div>
    </>
  );
}
