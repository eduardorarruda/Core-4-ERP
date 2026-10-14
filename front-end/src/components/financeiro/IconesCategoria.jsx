import React, { useId, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GRUPOS_ICONES, iconeCategoria, rotuloIcone } from './catalogoIcones';

/** Ícone da categoria num "chip" tingido pela cor do tom (decorativo). */
export function ChipCategoria({ icone, tom = 'primary', tamanho = 'md', className }) {
  const tons = {
    primary: 'text-primary bg-primary/[0.12] border-primary/25',
    expense: 'text-expense bg-expense/[0.12] border-expense/25',
    income: 'text-income bg-income/[0.12] border-income/25',
    invest: 'text-invest bg-invest/[0.12] border-invest/25',
    neutro: 'text-text-primary/70 bg-text-primary/[0.06] border-border-strong',
  };
  return (
    <span
      aria-hidden="true"
      className={cn('grid place-items-center shrink-0 rounded-xl border', tamanho === 'sm' ? 'w-8 h-8' : 'w-10 h-10', tons[tom] ?? tons.primary, className)}
    >
      {React.createElement(iconeCategoria(icone), { className: tamanho === 'sm' ? 'w-4 h-4' : 'w-[1.125rem] h-[1.125rem]' })}
    </span>
  );
}

/**
 * Seletor de ícone acessível: busca em português + grade de botões (radiogroup por grupo).
 * Fica no fluxo do formulário (sem popover), então funciona igual no celular e no teclado.
 * Props: value, onChange(nome), label (rótulo do grupo — padrão "Ícone").
 */
export function IconePicker({ value, onChange, label = 'Ícone' }) {
  const [busca, setBusca] = useState('');
  const idBusca = useId();
  const termo = busca.trim().toLowerCase();
  const grupos = useMemo(() => {
    if (!termo) return GRUPOS_ICONES;
    return GRUPOS_ICONES
      .map((g) => ({ ...g, icones: g.icones.filter(([nome, , rotulo]) => rotulo.toLowerCase().includes(termo) || nome.toLowerCase().includes(termo)) }))
      .filter((g) => g.icones.length);
  }, [termo]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-[0.8125rem] font-medium text-text-primary/75">
        {label}
        <span className="ml-2 font-normal text-text-primary/55">{value ? rotuloIcone(value) : 'nenhum escolhido'}</span>
      </legend>
      <label htmlFor={idBusca} className="relative block">
        <span className="sr-only">Buscar ícone</span>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-primary/50 pointer-events-none" aria-hidden="true" />
        <input
          id={idBusca}
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar: mercado, luz, saúde…"
          className="w-full min-h-11 pl-9 pr-3 rounded-xl text-sm bg-surface-low border border-border-strong text-text-primary placeholder:text-text-primary/45 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
      <div className="max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-border p-2 space-y-3">
        {grupos.length === 0 && <p className="text-sm text-text-primary/60 text-center py-4">Nenhum ícone com esse nome.</p>}
        {grupos.map((g) => (
          <div key={g.grupo}>
            <p className="c4-eyebrow mb-1.5 px-1">{g.grupo}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
              {g.icones.map(([nome, Comp, rotulo]) => {
                const ativo = value === nome;
                return (
                  <button
                    key={nome}
                    type="button"
                    aria-pressed={ativo}
                    aria-label={rotulo}
                    title={rotulo}
                    onClick={() => onChange(ativo ? '' : nome)}
                    className={cn(
                      'h-11 grid place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      ativo ? 'bg-primary/15 border-primary/60 text-primary' : 'border-transparent text-text-primary/70 hover:bg-text-primary/[0.06] hover:text-text-primary'
                    )}
                  >
                    <Comp className="w-[1.125rem] h-[1.125rem]" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </fieldset>
  );
}
