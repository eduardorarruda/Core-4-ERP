import React, { useId, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isValid, parse, isAfter, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Modal from './Modal';
import Button from './Button';

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

function parseInputDate(str) {
  if (!str || str.length < 8) return null;
  const d = parse(str, 'dd/MM/yyyy', new Date());
  return isValid(d) ? d : null;
}

function DateInput({ label, value, onChange, error }) {
  const id = useId();
  const erroId = `${id}-erro`;
  const [raw, setRaw] = useState(value ? format(value, 'dd/MM/yyyy') : '');
  const [valorAnterior, setValorAnterior] = useState(value);

  // Sincroniza o texto quando a data muda pelo calendário (ajuste durante o render, sem efeito)
  if (value !== valorAnterior) {
    setValorAnterior(value);
    setRaw(value ? format(value, 'dd/MM/yyyy') : '');
  }

  function handleChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    else if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    setRaw(v);
    if (v.length === 10) onChange(parseInputDate(v));
    else if (v.length === 0) onChange(null);
  }

  const borderCls = error ? 'border-error/60' : 'border-text-primary/15 focus:border-primary/50';

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-text-primary/70">{label}</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={raw}
        onChange={handleChange}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? erroId : undefined}
        className={`w-full min-h-11 rounded-xl px-3 py-2.5 text-sm font-mono bg-surface border outline-none transition-colors placeholder:text-text-primary/50 text-text-primary ${borderCls} ${FOCO}`}
        maxLength={10}
      />
      {error && <p id={erroId} role="alert" className="text-xs text-error">{error}</p>}
    </div>
  );
}

const WEEKDAYS = [
  ['D', 'Domingo'], ['S', 'Segunda'], ['T', 'Terça'], ['Q', 'Quarta'], ['Q', 'Quinta'], ['S', 'Sexta'], ['S', 'Sábado'],
];

function MiniCalendar({ month, rangeStart, rangeEnd, onSelect, onPrev, onNext }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDow = getDay(startOfMonth(month));
  const titulo = format(month, 'MMMM yyyy', { locale: ptBR });

  function dayClass(day) {
    const isStart = rangeStart && isSameDay(day, rangeStart);
    const isEnd = rangeEnd && isSameDay(day, rangeEnd);
    const inRange = rangeStart && rangeEnd && isAfter(day, rangeStart) && isBefore(day, rangeEnd);
    if (isStart || isEnd) return 'bg-primary text-on-primary font-bold rounded-lg';
    if (inRange) return 'bg-primary/15 text-primary';
    return 'hover:bg-surface-highest rounded-lg text-text-primary/80';
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={onPrev} aria-label="Mês anterior" className={`min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-surface-highest transition-colors ${FOCO}`}>
          <ChevronLeft className="w-4 h-4 text-text-primary/70" aria-hidden="true" />
        </button>
        <span className="text-xs font-bold uppercase tracking-wider text-text-primary/80 font-mono" aria-live="polite">
          {titulo}
        </span>
        <button type="button" onClick={onNext} aria-label="Próximo mês" className={`min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-surface-highest transition-colors ${FOCO}`}>
          <ChevronRight className="w-4 h-4 text-text-primary/70" aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1" aria-hidden="true">
        {WEEKDAYS.map(([d], i) => (
          <div key={i} className="text-center text-xs font-bold text-text-primary/60 font-mono py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((day) => {
          const selecionado = (rangeStart && isSameDay(day, rangeStart)) || (rangeEnd && isSameDay(day, rangeEnd));
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              aria-label={format(day, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              aria-pressed={Boolean(selecionado)}
              className={`text-center text-xs min-h-9 transition-colors cursor-pointer ${dayClass(day)} ${FOCO}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * @deprecated Use o PeriodoSelector (intervalo personalizado já vem no painel). Mantido só até
 * as telas migrarem. onApply devolve { inicio, fim } (yyyy-MM-dd) e também { mesInicio, anoInicio, mesFim, anoFim }.
 */
export default function DateRangeModal({ onApply, onCancel }) {
  const [inicio, setInicio] = useState(null);
  const [fim, setFim] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [errors, setErrors] = useState({});

  function handleCalSelect(day) {
    if (!inicio || (inicio && fim)) {
      setInicio(day);
      setFim(null);
    } else if (isBefore(day, inicio)) {
      setFim(inicio);
      setInicio(day);
    } else {
      setFim(day);
    }
    setErrors({});
  }

  function handleApply() {
    const errs = {};
    if (!inicio) errs.inicio = 'Informe a data de início';
    if (!fim) errs.fim = 'Informe a data de fim';
    if (inicio && fim && isAfter(inicio, fim)) errs.fim = 'A data de fim deve ser depois do início';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onApply({
      inicio: format(inicio, 'yyyy-MM-dd'),
      fim: format(fim, 'yyyy-MM-dd'),
      mesInicio: inicio.getMonth() + 1,
      anoInicio: inicio.getFullYear(),
      mesFim: fim.getMonth() + 1,
      anoFim: fim.getFullYear(),
    });
  }

  return (
    <Modal open onClose={onCancel} size="sm" title="Período personalizado">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <DateInput label="De" value={inicio} onChange={(d) => { setInicio(d); setErrors((e) => ({ ...e, inicio: undefined })); }} error={errors.inicio} />
          <DateInput label="Até" value={fim} onChange={(d) => { setFim(d); setErrors((e) => ({ ...e, fim: undefined })); }} error={errors.fim} />
        </div>

        <div className="border border-text-primary/10 rounded-xl p-3 bg-surface/40">
          <MiniCalendar
            month={calMonth}
            rangeStart={inicio}
            rangeEnd={fim}
            onSelect={handleCalSelect}
            onPrev={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            onNext={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          />
        </div>

        <Modal.Footer>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar</Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}
