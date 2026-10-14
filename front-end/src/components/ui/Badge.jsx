import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Selo de estado (pago, vencido, pendente…). Texto em caixa normal, 12px, cor semântica só
 * para estado. Variantes de significado fixo do app: income (entrou), expense (saiu),
 * invest (investido) — as mesmas cores dos números e gráficos.
 *
 * Props: variant ('success' | 'primary' | 'warning' | 'error' | 'info' | 'neutral' | 'income' | 'expense' | 'invest'),
 *        size ('sm' | 'md'), dot (bolinha à esquerda), className.
 */
const VARIANTS = {
  success: 'bg-primary/[0.12] text-primary border-primary/25',
  primary: 'bg-primary/[0.12] text-primary border-primary/25',
  warning: 'bg-warning/[0.12] text-warning border-warning/25',
  error: 'bg-error/[0.12] text-error border-error/25',
  info: 'bg-secondary/[0.12] text-secondary border-secondary/25',
  neutral: 'bg-text-primary/[0.06] text-text-primary/70 border-text-primary/[0.10]',
  income: 'bg-income/[0.12] text-income border-income/25',
  expense: 'bg-expense/[0.12] text-expense border-expense/25',
  invest: 'bg-invest/[0.12] text-invest border-invest/25',
};

const DOT = {
  success: 'bg-primary',
  primary: 'bg-primary',
  warning: 'bg-warning',
  error: 'bg-error animate-pulse-dot',
  info: 'bg-secondary',
  neutral: 'bg-text-primary/45',
  income: 'bg-income',
  expense: 'bg-expense',
  invest: 'bg-invest',
};

const SIZES = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
};

export default function Badge({ variant = 'neutral', size = 'sm', children, className, dot = false }) {
  const v = VARIANTS[variant] ? variant : 'neutral';
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-semibold leading-tight whitespace-nowrap',
      VARIANTS[v],
      SIZES[size] ?? SIZES.sm,
      className
    )}>
      {dot && <span aria-hidden="true" className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT[v])} />}
      {children}
    </span>
  );
}
