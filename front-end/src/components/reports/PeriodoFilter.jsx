import React from 'react';
import { inputSmCls, labelCls } from '../ui/FormField';

export default function PeriodoFilter({ inicio, fim, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <label className={labelCls}>De</label>
        <input
          type="date"
          className={inputSmCls}
          value={inicio}
          onChange={e => onChange('inicio', e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label className={labelCls}>Até</label>
        <input
          type="date"
          className={inputSmCls}
          value={fim}
          onChange={e => onChange('fim', e.target.value)}
        />
      </div>
    </div>
  );
}
