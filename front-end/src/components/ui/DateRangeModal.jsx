import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, isValid, parse, isAfter, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function parseInputDate(str) {
  if (!str || str.length < 8) return null;
  const d = parse(str, 'dd/MM/yyyy', new Date());
  return isValid(d) ? d : null;
}

function DateInput({ label, value, onChange, error }) {
  const [raw, setRaw] = useState(value ? format(value, 'dd/MM/yyyy') : '');

  useEffect(() => {
    setRaw(value ? format(value, 'dd/MM/yyyy') : '');
  }, [value]);

  function handleChange(e) {
    let v = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (v.length > 4) v = v.slice(0, 2) + '/' + v.slice(2, 4) + '/' + v.slice(4);
    else if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    setRaw(v);
    if (v.length === 10) onChange(parseInputDate(v));
    else if (v.length === 0) onChange(null);
  }

  const base = 'w-full rounded-xl px-3 py-2.5 text-sm font-mono bg-surface border outline-none transition-colors placeholder:text-text-primary/25';
  const borderCls = error ? 'border-red-500/50 focus:border-red-400' : 'border-text-primary/10 focus:border-primary/50';

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-widest text-text-primary/50">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        value={raw}
        onChange={handleChange}
        className={`${base} ${borderCls} text-text-primary`}
        maxLength={10}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function MiniCalendar({ month, rangeStart, rangeEnd, onSelect, onPrev, onNext }) {
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
  const firstDow = getDay(startOfMonth(month));

  function dayClass(day) {
    const isStart = rangeStart && isSameDay(day, rangeStart);
    const isEnd = rangeEnd && isSameDay(day, rangeEnd);
    const inRange = rangeStart && rangeEnd && isAfter(day, rangeStart) && isBefore(day, rangeEnd);
    if (isStart || isEnd) return 'bg-primary text-on-primary font-bold rounded-lg';
    if (inRange) return 'bg-primary/15 text-primary';
    return 'hover:bg-surface-highest rounded-lg text-text-primary/70';
  }

  const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrev} className="p-1 rounded-lg hover:bg-surface-highest transition-colors">
          <ChevronLeft className="w-4 h-4 text-text-primary/50" />
        </button>
        <span className="text-xs font-bold uppercase tracking-widest text-text-primary/70 font-mono">
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <button onClick={onNext} className="p-1 rounded-lg hover:bg-surface-highest transition-colors">
          <ChevronRight className="w-4 h-4 text-text-primary/50" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-text-primary/30 font-mono py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onSelect(day)}
            className={`text-center text-xs py-1.5 transition-colors cursor-pointer ${dayClass(day)}`}
          >
            {day.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DateRangeModal({ onApply, onCancel }) {
  const [inicio, setInicio] = useState(null);
  const [fim, setFim] = useState(null);
  const [calMonth, setCalMonth] = useState(new Date());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  function handleCalSelect(day) {
    if (!inicio || (inicio && fim)) {
      setInicio(day);
      setFim(null);
    } else {
      if (isBefore(day, inicio)) {
        setFim(inicio);
        setInicio(day);
      } else {
        setFim(day);
      }
    }
    setErrors({});
  }

  function handleApply() {
    const errs = {};
    if (!inicio) errs.inicio = 'Informe a data de início';
    if (!fim) errs.fim = 'Informe a data de fim';
    if (inicio && fim && isAfter(inicio, fim)) errs.fim = 'Data de fim deve ser após o início';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onApply({
      mesInicio: inicio.getMonth() + 1,
      anoInicio: inicio.getFullYear(),
      mesFim: fim.getMonth() + 1,
      anoFim: fim.getFullYear(),
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onCancel} />
      <div className="relative bg-surface-low border border-text-primary/10 rounded-2xl shadow-2xl w-full max-w-sm animate-scale-in">
        <button
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute top-3 right-3 text-text-primary/40 hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface-medium"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-secondary" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary/60 font-mono">
              Período personalizado
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DateInput label="De" value={inicio} onChange={(d) => { setInicio(d); setErrors((e) => ({ ...e, inicio: undefined })); }} error={errors.inicio} />
            <DateInput label="Até" value={fim} onChange={(d) => { setFim(d); setErrors((e) => ({ ...e, fim: undefined })); }} error={errors.fim} />
          </div>

          <div className="border border-text-primary/8 rounded-xl p-4 bg-surface/40">
            <MiniCalendar
              month={calMonth}
              rangeStart={inicio}
              rangeEnd={fim}
              onSelect={handleCalSelect}
              onPrev={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              onNext={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-xl border border-text-primary/10 text-text-primary/60 hover:text-text-primary hover:border-text-primary/20 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
