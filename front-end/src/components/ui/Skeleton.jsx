import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Bloco de esqueleto com brilho (shimmer). Para cartões/linhas prontas, veja SkeletonCard.jsx
 * (SkeletonCard, SkeletonRow, SkeletonText, SkeletonCircle) e PageSkeleton abaixo.
 * Props: className (defina largura/altura/raio), rounded ('md' | 'lg' | 'full').
 */
export default function Skeleton({ className, rounded = 'lg' }) {
  const raio = { md: 'rounded-md', lg: 'rounded-xl', full: 'rounded-full' }[rounded] ?? 'rounded-xl';
  return <span aria-hidden="true" className={cn('block shimmer-bg', raio, className)} />;
}

/**
 * Esqueleto no formato de uma página: cabeçalho + linha de KPIs + 2 blocos.
 * Use como fallback de carregamento inicial de telas (já anuncia "Carregando…").
 */
export function PageSkeleton({ kpis = 4 }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">Carregando…</span>
      <div className="space-y-2.5" aria-hidden="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-hidden="true">
          {Array.from({ length: kpis }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      )}
      <div className="grid grid-cols-12 gap-4" aria-hidden="true">
        <Skeleton className="col-span-12 lg:col-span-8 h-72 rounded-2xl" />
        <Skeleton className="col-span-12 lg:col-span-4 h-72 rounded-2xl" />
      </div>
    </div>
  );
}
