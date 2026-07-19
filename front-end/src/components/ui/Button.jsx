import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Botão reutilizável do sistema.
 *
 * Props:
 * - variant: 'primary' | 'secondary' | 'ghost' | 'danger'  (default: 'primary')
 * - size:    'sm' | 'md' | 'icon'                           (default: 'md' — 44px)
 * - loading: quando true, mostra spinner à esquerda e desabilita o botão
 * - leftIcon: ícone renderizado antes do texto (ignorado enquanto loading)
 * - type/disabled/onClick e demais atributos são repassados via ...rest
 */
const VARIANTS = {
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'bg-surface-high text-text-primary hover:bg-surface-highest',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-high',
  danger: 'bg-error text-on-primary hover:opacity-90',
};

const SIZES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  icon: 'w-11 h-11 grid place-items-center',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon = null,
    type = 'button',
    disabled = false,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'rounded-xl font-medium inline-flex items-center justify-center gap-2 transition',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        VARIANTS[variant] || VARIANTS.primary,
        SIZES[size] || SIZES.md,
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
      {!loading && leftIcon}
      {children}
    </button>
  );
});

export default Button;
export { Button };
