import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { SkeletonRow } from './SkeletonCard';
import EmptyState from './EmptyState';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Tabela de dados reutilizável (v2).
 *
 * Props:
 * - columns:     [{ key, label, render?, sortable?, className? }]
 * - data:        array de linhas
 * - loading:     mostra skeleton
 * - emptyState:  node exibido quando não há linhas (fallback padrão se omitido)
 * - onRowClick:  callback ao clicar/ativar uma linha (acessível por teclado)
 * - keyExtractor: (row) => key única
 * - className:   classes extras no wrapper
 *
 * Responsividade (aditivo, retrocompatível):
 * - Por padrão o componente é AUTOMÁTICO por breakpoint: renderiza a tabela em
 *   `md+` (`hidden md:block`) e cards em `< md` (`md:hidden`). Os cards usam
 *   `renderCard(row)` quando fornecido, senão são derivados de `columns`.
 * - `cardView={true}` (legado): força cards em TODOS os breakpoints. Mantido para
 *   os chamadores que já fazem o toggle manual (ex.: GestaoOperadores envolve o
 *   card em `md:hidden`) — nesse caso o componente NÃO adiciona outro breakpoint,
 *   evitando duplicação.
 * - `renderCard(row)`: função opcional para customizar o card no modo `< md`.
 *
 * Ordenação:
 * - Client-side por padrão. Com `serverSort` (paginação server-side), a ordenação
 *   local é DESABILITADA — evita ordenar apenas a página carregada, o que enganaria
 *   o usuário. Nesse caso o caller controla a ordenação via `Pageable`/`sort` da API.
 */
export default function DataTable({
  columns,
  data,
  loading,
  emptyState,
  onRowClick,
  className,
  cardView = false,
  renderCard,
  keyExtractor,
  serverSort = false,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (key) => {
    if (serverSort) return; // ordenação é responsabilidade do backend
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  let rows = data ?? [];
  if (!serverSort && sortKey) {
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

  const rowKey = (row, ri) => (keyExtractor ? keyExtractor(row) : row.id ?? ri);

  // Handlers de acessibilidade para linha/card clicável.
  const clickableProps = (row) =>
    onRowClick
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onRowClick(row);
            }
          },
        }
      : {};

  const renderCards = (wrapperClass) => (
    <div className={cn('space-y-3', wrapperClass)}>
      {rows.map((row, ri) => {
        const key = rowKey(row, ri);
        if (renderCard) {
          return (
            <div
              key={key}
              {...clickableProps(row)}
              className={cn(
                'bg-surface-medium rounded-2xl border border-text-primary/5',
                onRowClick && 'cursor-pointer hover:border-text-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
            >
              {renderCard(row)}
            </div>
          );
        }
        return (
          <div
            key={key}
            {...clickableProps(row)}
            className={cn(
              'bg-surface-medium rounded-2xl p-4 border border-text-primary/5',
              onRowClick && 'cursor-pointer hover:border-text-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
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

  const renderTable = (wrapperClass) => (
    <div className={cn('rounded-2xl overflow-hidden border border-text-primary/5', wrapperClass)}>
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Tabela de dados">
          <thead className="bg-surface-medium backdrop-blur-sm">
            <tr>
              {columns.map((col) => {
                const isActive = sortKey === col.key;
                const ariaSort = col.sortable
                  ? (isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none')
                  : undefined;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-text-primary/50 whitespace-nowrap',
                      col.className
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col.key)}
                        className="flex items-center gap-1 uppercase tracking-widest hover:text-text-primary transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        {col.label}
                        {isActive && (
                          sortDir === 'asc'
                            ? <ChevronUp className="w-3 h-3" aria-hidden="true" />
                            : <ChevronDown className="w-3 h-3" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1">{col.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-text-primary/5 bg-surface-low">
            {rows.map((row, ri) => {
              const key = rowKey(row, ri);
              return (
                <tr
                  key={key}
                  {...clickableProps(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset'
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

  // Legado: cards forçados em todos os breakpoints (caller já controla o toggle).
  if (cardView) {
    return renderCards(className);
  }

  // Padrão: responsivo automático — tabela em md+, cards em telas menores.
  return (
    <>
      {renderTable(cn('hidden md:block', className))}
      {renderCards('md:hidden')}
    </>
  );
}
