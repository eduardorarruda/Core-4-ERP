import React from 'react';
import { FileText } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import { formatDate, formatarNumero } from '../../lib/formatters';
import { barraProps, corSerie, eixoXProps, eixoYProps, formatarEixoMoeda, gradeProps, tooltipProps } from '../../lib/chartTheme';
import ChartTooltip from '../ui/ChartTooltip';
import GraficoAcessivel from '../ui/GraficoAcessivel';

/** Números com 2 casas no padrão brasileiro (as colunas do relatório já dizem "(R$)"). */
function formatValue(v) {
  if (typeof v === 'number') return formatarNumero(v, 'number', { casas: 2 });
  return v ?? '—';
}

export default function ReportModal({ open, titulo, periodo, dados, onClose }) {
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
        <p className="text-text-primary/70 text-xs -mt-1 mb-4">{periodoLabel}</p>
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
            <div className="bg-surface-medium/60 rounded-xl p-4 border border-border">
              <GraficoAcessivel resumo={`Gráfico de barras do relatório ${titulo}. Os valores estão na tabela abaixo.`}>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid {...gradeProps} />
                  <XAxis dataKey="label" {...eixoXProps} />
                  <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
                  <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {seriesKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} name={key} fill={corSerie(i)} {...barraProps} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              </GraficoAcessivel>
            </div>
          )}

          {/* Tabela */}
          <div className="overflow-x-auto rounded-xl border border-border" tabIndex={0} role="region" aria-label={`Tabela: ${titulo}`}>
            <table className="w-full text-sm">
              <caption className="sr-only">{titulo}{periodoLabel ? ` — ${periodoLabel}` : ''}</caption>
              <thead>
                <tr className="bg-surface-highest">
                  {dados.cabecalho.map((col, i) => (
                    <th
                      scope="col"
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
