import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

/**
 * Paginação reutilizável para listas paginadas pelo backend (Spring Data Page).
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
    <div className="flex items-center justify-between gap-4 pt-1">
      <span
        className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 font-mono"
        aria-current="page"
      >
        Página {atual} de {totalPages}
        {typeof totalElements === 'number' ? ` · ${totalElements} registro${totalElements === 1 ? '' : 's'}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="md"
          className="border border-text-primary/10 gap-1 font-semibold uppercase tracking-widest text-xs"
          disabled={!podeVoltar}
          onClick={() => podeVoltar && onChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Anterior
        </Button>
        <Button
          variant="ghost"
          size="md"
          className="border border-text-primary/10 gap-1 font-semibold uppercase tracking-widest text-xs"
          disabled={!podeAvancar}
          onClick={() => podeAvancar && onChange(page + 1)}
          aria-label="Próxima página"
        >
          Próxima <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
