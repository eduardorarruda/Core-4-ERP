import React, { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import FormField, { FormSelect } from '../ui/FormField';
import Button from '../ui/Button';
import { Revelar } from '../motion/Movimento';
import { useCarga } from '../../hooks/useCarga';
import { cn } from '../../lib/utils';

/**
 * Filtros extras de um relatório (o período fica no topo da página, um só para todos).
 * Recolhidos em "Filtros (n)"; as opções assíncronas só carregam ao abrir.
 *
 * config: [{ key, label, type: 'select' | 'async-select', options?, fetchFn?, semTodos?, padrao? }]
 *  - semTodos: não oferece "Todos" (o backend não aceita vazio) — usa `padrao`
 */
function OpcoesAssincronas({ campo, value, onChange, idBase }) {
  const { dados, erro, carregando, recarregar } = useCarga(() => campo.fetchFn(), [campo.key], { inicial: [] });
  return (
    <FormField label={campo.label} htmlFor={`${idBase}-${campo.key}`} error={erro ? 'Não deu para carregar as opções.' : undefined}>
      <div className="flex gap-2">
        <FormSelect small id={`${idBase}-${campo.key}`} value={value ?? ''} onChange={(e) => onChange(campo.key, e.target.value || undefined)} disabled={carregando}>
          <option value="">{carregando ? 'Carregando…' : 'Todos'}</option>
          {(dados ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </FormSelect>
        {erro && <Button type="button" size="sm" variant="ghost" onClick={recarregar}>Tentar de novo</Button>}
      </div>
    </FormField>
  );
}

export default function ReportFilters({ config = [], values, onChange, idBase }) {
  const [aberto, setAberto] = useState(false);
  if (config.length === 0) return null;

  const ativos = config.filter((f) => !f.semTodos && values[f.key] !== undefined && values[f.key] !== '').length;
  const painelId = `${idBase}-filtros`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={painelId}
        className="inline-flex items-center gap-1.5 min-h-11 -ml-1 px-1 rounded-lg text-sm font-medium text-text-primary/75 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
        Filtros
        {ativos > 0 && (
          <span className="rounded-full bg-primary/15 text-primary px-1.5 text-xs font-semibold tabular-nums">
            {ativos}<span className="sr-only"> ativos</span>
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 transition-transform', aberto && 'rotate-180')} aria-hidden="true" />
      </button>
      <Revelar aberto={aberto} id={painelId}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
          {config.map((f) => (f.type === 'async-select' ? (
            <OpcoesAssincronas key={f.key} campo={f} value={values[f.key]} onChange={onChange} idBase={idBase} />
          ) : (
            <FormField key={f.key} label={f.label} htmlFor={`${idBase}-${f.key}`}>
              <FormSelect
                small
                id={`${idBase}-${f.key}`}
                value={values[f.key] ?? f.padrao ?? ''}
                onChange={(e) => onChange(f.key, e.target.value || undefined)}
              >
                {!f.semTodos && <option value="">Todos</option>}
                {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </FormSelect>
            </FormField>
          )))}
        </div>
      </Revelar>
    </div>
  );
}
