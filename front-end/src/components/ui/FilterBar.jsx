import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import Button from './Button';
import Drawer from './Drawer';

/**
 * Barra única de filtros, logo abaixo do PageHeader: busca + período + "Filtros" + "Limpar".
 * No celular, os filtros extras vão para uma folha (Drawer de baixo) — a busca e o período ficam.
 *
 *   <FilterBar
 *     busca={{ value: termo, onChange: setTermo, placeholder: 'Buscar por descrição' }}
 *     periodo={<PeriodoSelector value={periodo} onChange={setPeriodo} />}
 *     filtrosAtivos={2}
 *     onLimpar={limpar}
 *     acoes={<Button variant="secondary" size="sm">Exportar</Button>}
 *   >
 *     {/* filtros extras (selects, chips) — inline no desktop, na folha no celular *\/}
 *     <FormSelect …/>
 *   </FilterBar>
 *
 * Props: busca ({ value, onChange, placeholder, label }), periodo (nó), children (filtros extras),
 *        filtrosAtivos (número — mostra contador e o botão Limpar), onLimpar, acoes (nó à direita), className.
 */
export default function FilterBar({ busca, periodo, children, filtrosAtivos = 0, onLimpar, acoes, className }) {
  const [folha, setFolha] = useState(false);
  const temExtras = React.Children.count(children) > 0;

  return (
    <div role="search" className={cn('flex flex-wrap items-center gap-2 sm:gap-3', className)}>
      {busca && (
        <label className="relative flex-1 min-w-[min(12rem,100%)] max-w-md">
          <span className="sr-only">{busca.label ?? 'Buscar'}</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/50 pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={busca.value}
            onChange={(e) => busca.onChange(e.target.value)}
            placeholder={busca.placeholder ?? 'Buscar'}
            className="w-full min-h-11 pl-9 pr-3 rounded-xl text-sm bg-surface-medium/70 border border-border-strong text-text-primary placeholder:text-text-primary/50 outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary/40 transition-colors"
          />
        </label>
      )}
      {periodo}
      {temExtras && (
        <>
          <div className="hidden md:contents">{children}</div>
          <Button
            variant="secondary"
            className="md:hidden"
            onClick={() => setFolha(true)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" aria-hidden="true" />}
            aria-label={filtrosAtivos ? `Filtros (${filtrosAtivos} ativos)` : 'Filtros'}
          >
            Filtros
            {filtrosAtivos > 0 && (
              <span className="min-w-5 h-5 px-1 grid place-items-center rounded-full bg-primary text-on-primary text-[0.6875rem] font-bold">{filtrosAtivos}</span>
            )}
          </Button>
        </>
      )}
      {filtrosAtivos > 0 && onLimpar && (
        <Button variant="ghost" size="sm" onClick={onLimpar} leftIcon={<X className="w-3.5 h-3.5" aria-hidden="true" />}>
          Limpar
        </Button>
      )}
      {acoes && <div className="ml-auto flex items-center gap-2">{acoes}</div>}

      {temExtras && (
        <Drawer
          open={folha}
          onClose={() => setFolha(false)}
          side="bottom"
          title="Filtros"
          footer={(
            <>
              {onLimpar && <Button variant="ghost" onClick={() => { onLimpar(); setFolha(false); }}>Limpar</Button>}
              <Button onClick={() => setFolha(false)}>Ver resultados</Button>
            </>
          )}
        >
          <div className="space-y-4 [&>*]:w-full">{children}</div>
        </Drawer>
      )}
    </div>
  );
}
