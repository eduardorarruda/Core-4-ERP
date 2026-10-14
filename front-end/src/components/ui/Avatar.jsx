import React from 'react';
import { cn } from '../../lib/utils';
import { iniciais } from '../../lib/formatters';

/**
 * Avatar: foto (quando houver) ou iniciais sobre um degradê esmeralda→petróleo.
 * Props: nome, src (URL da foto), size ('xs' 24 | 'sm' 32 | 'md' 36 | 'lg' 48 | 'xl' 64), className.
 * Decorativo por padrão (alt=""): o nome normalmente já aparece ao lado.
 */
const TAMANHOS = {
  xs: 'w-6 h-6 text-[0.625rem]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-lg',
};


export default function Avatar({ nome, src, size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-grid place-items-center shrink-0 overflow-hidden rounded-full font-display font-semibold select-none',
        'bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-primary)_45%,transparent),color-mix(in_srgb,var(--color-primary)_12%,var(--color-surface-medium))_70%)]',
        'text-primary ring-1 ring-primary/25',
        TAMANHOS[size] ?? TAMANHOS.md,
        className
      )}
    >
      {src ? <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" /> : iniciais(nome)}
    </span>
  );
}
