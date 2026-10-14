import React, { useId } from 'react';
import { cn } from '../../lib/utils';
import SkeletonCard from './SkeletonCard';

/**
 * Cartão de painel do Core 4 (`.c4-card`): título em Sora, subtítulo explicativo em texto
 * normal, ação no canto e um selo de variação opcional.
 *
 * Props:
 * - title, subtitle, headerAction, children, className
 * - loading:     mostra o esqueleto no lugar do conteúdo
 * - accentChip:  texto do selo de variação (ex.: "▲ 12%", "+R$ 300", "▼ 4%") — começa com
 *                ▲ ou + → cor de receita (income); senão → cor de despesa (expense)
 * - accentColor: fio de cor na borda esquerda. Aceita um token ('primary' | 'income' |
 *                'expense' | 'invest' | 'secondary' | 'warning') ou uma cor CSS (var(--…)).
 * - destaque:    halo esmeralda no canto — para o número principal da tela (opcional)
 */
const ACENTOS = {
  primary: 'var(--color-primary)',
  income: 'var(--color-income)',
  expense: 'var(--color-expense)',
  invest: 'var(--color-invest)',
  secondary: 'var(--color-secondary)',
  warning: 'var(--color-warning)',
};

function chipPositivo(chip) {
  const texto = String(chip).trim();
  return texto.startsWith('▲') || texto.startsWith('+');
}

export default function BentoCard({
  children,
  className,
  title,
  subtitle,
  headerAction,
  loading,
  accentColor,
  accentChip,
  destaque = false,
}) {
  const tituloId = useId();
  if (loading) {
    return <SkeletonCard className={className} />;
  }

  const acento = accentColor ? (ACENTOS[accentColor] ?? accentColor) : null;

  return (
    <section
      aria-labelledby={title ? tituloId : undefined}
      className={cn('c4-card p-5 sm:p-6 flex flex-col', destaque && 'c4-card--destaque', className)}
    >
      {acento && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-[var(--c4-acento)] shadow-[0_0_14px_var(--c4-acento)]"
          style={{ '--c4-acento': acento }}
        />
      )}
      {(title || headerAction || accentChip) && (
        <div className="flex justify-between items-start gap-4 mb-5">
          <div className="min-w-0">
            {title && (
              <h2 id={tituloId} className="text-base sm:text-lg font-semibold tracking-tight text-text-primary font-display">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-text-primary/60 leading-snug">{subtitle}</p>
            )}
          </div>
          {(accentChip || headerAction) && (
            <div className="flex items-center gap-2 shrink-0">
              {accentChip && (
                <span className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums',
                  chipPositivo(accentChip)
                    ? 'text-income bg-income/[0.12] border-income/25'
                    : 'text-expense bg-expense/[0.12] border-expense/25'
                )}>
                  {accentChip}
                </span>
              )}
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </section>
  );
}
