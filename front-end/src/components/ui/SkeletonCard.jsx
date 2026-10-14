import React from 'react';
import { cn } from '../../lib/utils';

/*
 * Esqueletos de carregamento. Um brilho suave atravessa o bloco (tom do próprio texto em
 * 5–11%, então funciona no claro e no escuro). Com "reduzir movimento" o brilho para.
 * São decorativos: o contêiner anuncia "Carregando…" uma vez para leitores de tela.
 */
const SHIMMER = cn(
  'bg-[linear-gradient(100deg,color-mix(in_srgb,var(--color-text-primary)_5%,transparent)_20%,color-mix(in_srgb,var(--color-text-primary)_11%,transparent)_50%,color-mix(in_srgb,var(--color-text-primary)_5%,transparent)_80%)]',
  'bg-[length:200%_100%] animate-[shimmer_1.8s_ease-in-out_infinite] motion-reduce:animate-none',
);

export function SkeletonText({ className, width = 'w-full' }) {
  return <div aria-hidden="true" className={cn('h-3 rounded-full', SHIMMER, width, className)} />;
}

export function SkeletonCircle({ size = 'w-8 h-8', className }) {
  return <div aria-hidden="true" className={cn('rounded-full', SHIMMER, size, className)} />;
}

export function SkeletonRow({ cols = 3, className }) {
  return (
    <div aria-hidden="true" className={cn('flex items-center gap-4 py-3', className)}>
      <SkeletonCircle size="w-9 h-9 shrink-0" className="rounded-xl" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="w-1/3" />
        <SkeletonText width="w-1/2" className="h-2" />
      </div>
      {cols > 2 && <SkeletonText width="w-16" />}
      {cols > 3 && <SkeletonText width="w-12" />}
    </div>
  );
}

export default function SkeletonCard({ rows = 3, className }) {
  return (
    <div role="status" aria-live="polite" className={cn('c4-card p-5 sm:p-6 space-y-4', className)}>
      <span className="sr-only">Carregando…</span>
      <div className="flex items-center justify-between mb-2" aria-hidden="true">
        <div className="space-y-2">
          <SkeletonText width="w-32" />
          <SkeletonText width="w-20" className="h-2" />
        </div>
        <SkeletonCircle size="w-8 h-8" className="rounded-lg" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
