import React from 'react';
import { inputCls } from './FormField';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function gerarAnos() {
  const ano = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => ano - i);
}

/**
 * Filtro de período reutilizável.
 * Props: value = { mesInicio, anoInicio, mesFim, anoFim }, onChange(novoValor)
 */
export default function PeriodoSelector({ value, onChange }) {
  const anos = gerarAnos();

  const set = (campo) => (e) =>
    onChange({ ...value, [campo]: e.target.value ? Number(e.target.value) : null });

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-primary/50 font-semibold uppercase tracking-widest">De</label>
        <div className="flex gap-1">
          <select className={inputCls + ' py-1.5 text-sm'} value={value.mesInicio ?? ''} onChange={set('mesInicio')}>
            <option value="">Mês</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className={inputCls + ' py-1.5 text-sm'} value={value.anoInicio ?? ''} onChange={set('anoInicio')}>
            <option value="">Ano</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-text-primary/50 font-semibold uppercase tracking-widest">Até</label>
        <div className="flex gap-1">
          <select className={inputCls + ' py-1.5 text-sm'} value={value.mesFim ?? ''} onChange={set('mesFim')}>
            <option value="">Mês</option>
            {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select className={inputCls + ' py-1.5 text-sm'} value={value.anoFim ?? ''} onChange={set('anoFim')}>
            <option value="">Ano</option>
            {anos.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
