import React, { forwardRef } from 'react';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Botão do Core 4.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'link'  (default: 'primary')
 *     primary      → degradê esmeralda com brilho (a ação principal da tela — uma só por contexto)
 *     secondary    → superfície com borda fina (ações de apoio: exportar, filtrar…)
 *     ghost        → só texto/ícone (cancelar, ações em linha)
 *     danger       → ação destrutiva confirmada (excluir, estornar)
 *     danger-ghost → destrutiva discreta (ícone de lixeira numa linha)
 *     link         → parece link, sem caixa (navegação em texto)
 * - size: 'xs' (32px) | 'sm' (36px) | 'md' (44px, alvo de toque) | 'lg' (48px)
 *         | 'icon' (44×44) | 'icon-sm' (36×36 visual, área de toque de 44px)   (default: 'md')
 * - loading: mostra o giro no lugar do ícone e desabilita o botão (aria-busy)
 * - leftIcon / rightIcon: ícones antes/depois do texto (o esquerdo some enquanto carrega)
 * - fullWidth: ocupa a largura toda
 * - type/disabled/onClick e demais atributos são repassados ao <button>
 */
const VARIANTS = {
  primary: cn(
    'bg-gradient-primary text-on-primary font-semibold',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.28),var(--shadow-primary)]',
    'hover:brightness-110 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_30px_-8px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]',
  ),
  secondary: cn(
    'bg-surface-medium/70 text-text-primary border border-border-strong',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    'hover:bg-surface-high hover:border-text-primary/[0.22]',
  ),
  ghost: 'bg-transparent text-text-primary/80 hover:text-text-primary hover:bg-text-primary/[0.06]',
  danger: 'bg-error text-on-primary font-semibold hover:brightness-110 shadow-[0_8px_24px_-12px_var(--color-error)]',
  'danger-ghost': 'bg-transparent text-error hover:bg-error/10',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline px-0 h-auto min-h-0 shadow-none',
};

const SIZES = {
  xs: 'h-8 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
  icon: 'w-11 h-11 shrink-0 rounded-xl',
  // Visual de 36px com área de toque de 44px (pseudo-elemento) — para barras densas
  'icon-sm': "w-9 h-9 shrink-0 rounded-lg after:absolute after:-inset-1 after:content-['']",
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon = null,
    rightIcon = null,
    fullWidth = false,
    type = 'button',
    disabled = false,
    className,
    children,
    ...rest
  },
  ref
) {
  const ehLink = variant === 'link';
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex items-center justify-center font-medium whitespace-nowrap select-none cursor-pointer',
        'transition-[transform,background-color,border-color,color,box-shadow,filter] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
        !ehLink && 'active:scale-[0.98] disabled:active:scale-100',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:brightness-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        SIZES[size] || SIZES.md,
        VARIANTS[variant] || VARIANTS.primary,
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading && <LoaderCircle className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      {!loading && leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export default Button;
export { Button };
