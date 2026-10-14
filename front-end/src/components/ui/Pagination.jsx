import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatarNumero } from '../../lib/formatters';
import Button from './Button';

/**
 * Paginação para listas paginadas pelo backend (Spring Data Page).
 * @param {number} page          Página atual (base 0).
 * @param {number} totalPages    Total de páginas.
 * @param {number} [totalElements] Total de registros (opcional, exibido no rótulo).
 * @param {(page:number)=>void} onChange Callback ao trocar de página (recebe base 0).
 */
export default function Pagination({ page, totalPages, totalElements, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const atual = page + 1;
  const podeVoltar = page > 0;
  const podeAvancar = page < totalPages - 1;

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-sm text-text-primary/60" aria-live="polite">
        Página <span className="font-semibold text-text-primary tabular-nums">{atual}</span> de{' '}
        <span className="tabular-nums">{totalPages}</span>
        {typeof totalElements === 'number' && (
          <span className="tabular-nums"> · {formatarNumero(totalElements)} registro{totalElements === 1 ? '' : 's'}</span>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          disabled={!podeVoltar}
          onClick={() => podeVoltar && onChange(page - 1)}
          aria-label="Página anterior"
          leftIcon={<ChevronLeft className="w-4 h-4" aria-hidden="true" />}
        >
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        <Button
          variant="secondary"
          disabled={!podeAvancar}
          onClick={() => podeAvancar && onChange(page + 1)}
          aria-label="Próxima página"
          rightIcon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}
        >
          <span className="hidden sm:inline">Próxima</span>
        </Button>
      </div>
    </nav>
  );
}
