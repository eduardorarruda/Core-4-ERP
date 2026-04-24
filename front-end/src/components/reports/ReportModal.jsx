import React from 'react';
import { X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

function formatValue(v) {
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return v ?? '—';
}

const CHART_COLORS = ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFF3AB'];

export default function ReportModal({ titulo, periodo, dados, onClose }) {
  const chartData = dados.grafico
    ? dados.grafico.labels.map((label, i) => {
        const entry = { label };
        Object.entries(dados.grafico.series).forEach(([key, values]) => {
          entry[key] = values[i];
        });
        return entry;
      })
    : null;

  const seriesKeys = dados.grafico ? Object.keys(dados.grafico.series) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-surface-low border border-white/5 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-white font-bold text-base">{titulo}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Período: {periodo.inicio} a {periodo.fim}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Chart */}
          {chartData && (
            <div className="bg-surface-medium rounded-xl p-4 border border-white/5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" />
                  <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => v.toLocaleString('pt-BR')} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1C1B1B', border: '1px solid #ffffff10', borderRadius: 12 }}
                    labelStyle={{ color: '#fff', fontWeight: 700 }}
                    formatter={(v, name) => [
                      v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seriesKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} name={key} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-highest">
                  {dados.cabecalho.map((col, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((linha, ri) => (
                  <tr key={ri} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    {linha.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-zinc-300 whitespace-nowrap">
                        {formatValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
                {dados.totais && (
                  <tr className="border-t-2 border-white/10 bg-surface-medium">
                    {dados.totais.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-white font-bold whitespace-nowrap">
                        {cell != null ? formatValue(cell) : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
