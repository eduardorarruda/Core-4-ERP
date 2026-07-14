import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

  const btnCls =
    'flex items-center gap-1 px-3 py-2 rounded-[12px] text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed';
  const btnStyle = { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(250,250,250,.08)' };

  return (
    <div className="flex items-center justify-between gap-4 pt-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/40 font-mono">
        Página {atual} de {totalPages}
        {typeof totalElements === 'number' ? ` · ${totalElements} registro${totalElements === 1 ? '' : 's'}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnCls}
          style={btnStyle}
          disabled={!podeVoltar}
          onClick={() => podeVoltar && onChange(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>
        <button
          type="button"
          className={btnCls}
          style={btnStyle}
          disabled={!podeAvancar}
          onClick={() => podeAvancar && onChange(page + 1)}
          aria-label="Próxima página"
        >
          Próxima <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
