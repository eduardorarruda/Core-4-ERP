import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { SkeletonRow } from './SkeletonCard';
import EmptyState from './EmptyState';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  className,
  cardView = false,
  keyExtractor,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  let rows = data ?? [];
  if (sortKey) {
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'pt-BR');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  if (loading) {
    return (
      <div className={cn('bg-surface-medium rounded-2xl overflow-hidden', className)}>
        <div className="divide-y divide-text-primary/5 px-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className={cn('bg-surface-medium rounded-2xl', className)}>
        {emptyState ?? (
          <EmptyState icon={FileText} title="Nenhum item encontrado" description="Não há dados para exibir no momento." />
        )}
      </div>
    );
  }

  if (cardView) {
    return (
      <div className={cn('space-y-3', className)}>
        {rows.map((row, ri) => {
          const key = keyExtractor ? keyExtractor(row) : row.id ?? ri;
          return (
            <div
              key={key}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'bg-surface-medium rounded-2xl p-4 border border-text-primary/5',
                onRowClick && 'cursor-pointer hover:border-text-primary/10 transition-colors'
              )}
            >
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {columns.map((col) => (
                  <div key={col.key} className={cn('min-w-0', col.className)}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 mb-0.5">{col.label}</p>
                    <div className="text-sm text-text-primary">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl overflow-hidden border border-text-primary/5', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Tabela de dados">
          <thead className="bg-surface-medium sticky top-0 backdrop-blur-sm z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-primary/50 whitespace-nowrap',
                    col.sortable && 'cursor-pointer hover:text-text-primary transition-colors select-none',
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-text-primary/5 bg-surface-low">
            {rows.map((row, ri) => {
              const key = keyExtractor ? keyExtractor(row) : row.id ?? ri;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-medium'
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-4 py-3 text-sm text-text-primary', col.className)}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
