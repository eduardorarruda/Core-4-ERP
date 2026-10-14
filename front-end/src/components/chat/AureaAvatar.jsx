import React, { useId } from 'react';
import { motion } from 'motion/react';
import { useMovimentoReduzido } from '../../hooks/useAcessibilidade';
import { cn } from '../../lib/utils';

/*
 * Avatar da Áurea no estilo do símbolo do Core 4: uma estrela de quatro pontas com a face
 * esmeralda e o bisel prateado (mesmos tokens --brand-* do BrandMark), sobre uma pastilha
 * petróleo com fio esmeralda. `ativo` acende um halo enquanto ela responde.
 */

const TAMANHOS = {
  sm: { caixa: 'w-8 h-8 rounded-[0.7rem]', icone: 18 },
  md: { caixa: 'w-10 h-10 rounded-xl', icone: 22 },
  lg: { caixa: 'w-16 h-16 rounded-2xl', icone: 34 },
};

function Estrela({ size }) {
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const e = `ae-${base}-e`;
  const s = `ae-${base}-s`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={e} x1="8" y1="6" x2="52" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--brand-emerald-1)' }} />
          <stop offset="0.55" style={{ stopColor: 'var(--brand-emerald-2)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-emerald-3)' }} />
        </linearGradient>
        <linearGradient id={s} x1="56" y1="4" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--brand-silver-1)' }} />
          <stop offset="1" style={{ stopColor: 'var(--brand-silver-3)' }} />
        </linearGradient>
      </defs>
      {/* Estrela principal */}
      <path fill={`url(#${e})`} d="M32 4C34 20 40 28 58 32C40 36 34 44 32 60C30 44 24 36 6 32C24 28 30 20 32 4Z" />
      {/* Bisel prateado na metade superior direita */}
      <path fill={`url(#${s})`} opacity="0.9" d="M32 4C34 20 40 28 58 32C44 31 36 26 32 4Z" />
      {/* Faísca menor, como a travessa do 4 */}
      <path fill={`url(#${s})`} d="M52 6C52.6 10 54 11.4 58 12C54 12.6 52.6 14 52 18C51.4 14 50 12.6 46 12C50 11.4 51.4 10 52 6Z" />
    </svg>
  );
}

/** Props: size ('sm' | 'md' | 'lg'), ativo (halo pulsando), className. Decorativo (aria-hidden). */
export default function AureaAvatar({ size = 'md', ativo = false, className }) {
  const reduzir = useMovimentoReduzido();
  const t = TAMANHOS[size] ?? TAMANHOS.md;
  return (
    <span aria-hidden="true" className={cn('relative inline-grid place-items-center shrink-0', t.caixa, className)}>
      {ativo && (
        <motion.span
          className={cn('absolute inset-0 ring-2 ring-primary/50', t.caixa)}
          initial={false}
          animate={reduzir ? { opacity: 0.6 } : { opacity: [0.7, 0], scale: [1, 1.35] }}
          transition={reduzir ? undefined : { duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <span
        className={cn(
          'relative grid place-items-center w-full h-full overflow-hidden ring-1 ring-primary/30',
          'bg-[radial-gradient(circle_at_30%_20%,color-mix(in_srgb,var(--color-primary)_22%,var(--color-surface-high)),var(--color-surface-low)_75%)]',
          'shadow-[0_0_18px_-6px_var(--color-primary)]',
          t.caixa,
        )}
      >
        <Estrela size={t.icone} />
      </span>
    </span>
  );
}
