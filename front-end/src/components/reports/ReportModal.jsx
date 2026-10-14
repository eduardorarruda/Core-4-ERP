import React, { useContext } from 'react';
import { FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { ThemeContext } from '../../context/ThemeContext';
import { formatDate } from '../../lib/formatters';

function formatValue(v) {
  if (typeof v === 'number') {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return v ?? '—';
}

// Cores do gráfico derivadas do tema — evita hex hardcoded no JSX.
function chartTheme(dark) {
  return {
    series: ['#6EFFC0', '#ACC7FF', '#FFB4AB', '#FFF3AB'],
    grid: dark ? '#ffffff0a' : '#00000010',
    axis: dark ? '#a1a1aa' : '#52525b',
    tooltipBg: dark ? '#1C1B1B' : '#FFFFFF',
    tooltipBorder: dark ? '#ffffff1a' : '#00000014',
    tooltipLabel: dark ? '#ffffff' : '#111111',
  };
}

export default function ReportModal({ open, titulo, periodo, dados, onClose }) {
  const themeCtx = useContext(ThemeContext);
  const isDark = (themeCtx?.theme ?? 'dark') === 'dark';
  const ct = chartTheme(isDark);

  const temDados = !!dados && Array.isArray(dados.linhas) && dados.linhas.length > 0;

  const chartData = temDados && dados.grafico
    ? dados.grafico.labels.map((label, i) => {
        const entry = { label };
        Object.entries(dados.grafico.series).forEach(([key, values]) => {
          entry[key] = values[i];
        });
        return entry;
      })
    : null;

  const seriesKeys = temDados && dados.grafico ? Object.keys(dados.grafico.series) : [];

  const periodoLabel = periodo
    ? `Período: ${formatDate(periodo.inicio)} a ${formatDate(periodo.fim)}`
    : null;

  return (
    <Modal open={open} onClose={onClose} title={titulo} size="xl">
      {periodoLabel && (
        <p className="text-text-primary/50 text-xs -mt-1 mb-4">{periodoLabel}</p>
      )}

      {!temDados ? (
        <EmptyState
          icon={FileText}
          title="Nenhum dado no período"
          description="Não encontramos informações para o período e filtros selecionados. Ajuste as datas ou os filtros e tente novamente."
        />
      ) : (
        <div className="space-y-6">
          {/* Gráfico */}
          {chartData && (
            <div className="bg-surface-medium rounded-xl p-4 border border-text-primary/5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="label" tick={{ fill: ct.axis, fontSize: 11 }} />
                  <YAxis tick={{ fill: ct.axis, fontSize: 11 }} tickFormatter={v => v.toLocaleString('pt-BR')} />
                  <Tooltip
                    contentStyle={{ backgroundColor: ct.tooltipBg, border: `1px solid ${ct.tooltipBorder}`, borderRadius: 12 }}
                    labelStyle={{ color: ct.tooltipLabel, fontWeight: 700 }}
                    formatter={(v, name) => [
                      v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {seriesKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} name={key} fill={ct.series[i % ct.series.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border border-text-primary/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-highest">
                  {dados.cabecalho.map((col, i) => (
                    <th
                      key={i}
                      className="text-left px-4 py-3 text-xs font-bold uppercase tracking-widest text-text-primary/60 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((linha, ri) => (
                  <tr key={ri} className="border-t border-text-primary/5 hover:bg-surface-medium/20 transition-colors">
                    {linha.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-text-primary/80 whitespace-nowrap">
                        {formatValue(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
                {dados.totais && (
                  <tr className="border-t-2 border-text-primary/10 bg-surface-medium">
                    {dados.totais.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-text-primary font-bold whitespace-nowrap">
                        {cell != null ? formatValue(cell) : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
