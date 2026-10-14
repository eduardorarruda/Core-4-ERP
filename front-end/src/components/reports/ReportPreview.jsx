import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import ChartTooltip from '../ui/ChartTooltip';
import GraficoAcessivel from '../ui/GraficoAcessivel';
import { barraProps, corSerie, tooltipProps } from '../../lib/chartTheme';
import { formatarNumero } from '../../lib/formatters';

/**
 * Prévia do relatório no cartão: mini gráfico de barras (até 2 séries) + quantas linhas há no período.
 * `dados` = resposta de /api/relatorios/.../dados ({ grafico: { labels, series }, linhas, totais }).
 */
const COR_SERIE = { Entradas: 'var(--color-income)', Recebido: 'var(--color-income)', Receitas: 'var(--color-income)', Saídas: 'var(--color-expense)', Pago: 'var(--color-expense)', Despesas: 'var(--color-expense)' };

export default function ReportPreview({ dados, titulo, carregando, erro }) {
  if (carregando && !dados) {
    return <div className="h-20 rounded-xl shimmer-bg" aria-hidden="true" />;
  }
  if (erro) {
    return <p className="h-20 grid place-items-center text-xs text-text-primary/55 rounded-xl border border-dashed border-border">Prévia indisponível</p>;
  }
  const linhas = dados?.linhas?.length ?? 0;
  if (!dados || linhas === 0) {
    return <p className="h-20 grid place-items-center text-xs text-text-primary/55 rounded-xl border border-dashed border-border">Sem dados neste período</p>;
  }

  const todasSeries = dados.grafico ? Object.keys(dados.grafico.series) : [];
  const series = todasSeries.slice(0, 2);
  const pontos = dados.grafico
    ? dados.grafico.labels.map((label, i) => series.reduce((p, s) => ({ ...p, [s]: Number(dados.grafico.series[s][i] ?? 0) }), { label }))
    : [];

  // Um ou dois períodos: barras horizontais por série (comparação direta, com valor escrito)
  if (pontos.length > 0 && pontos.length <= 2) {
    const somas = todasSeries.slice(0, 4).map((s, i) => ({
      nome: s,
      valor: dados.grafico.series[s].reduce((t, v) => t + Number(v ?? 0), 0),
      cor: COR_SERIE[s] ?? corSerie(i + 1),
    }));
    const maximo = Math.max(...somas.map((x) => Math.abs(x.valor)), 1);
    return (
      <div className="space-y-1.5">
        <ul className="space-y-1.5" aria-label={`Prévia: ${titulo}`}>
          {somas.map((x) => (
            <li key={x.nome} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-2 text-xs">
              <span className="truncate text-text-primary/70">{x.nome}</span>
              <span className="h-2 rounded-full bg-text-primary/[0.06] overflow-hidden" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (Math.abs(x.valor) / maximo) * 100)}%`, background: x.cor }} />
              </span>
              <span className="tabular-nums font-medium valor-privado">{formatarNumero(x.valor, 'compact')}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-primary/60">{formatarNumero(linhas)} {linhas === 1 ? 'linha' : 'linhas'} no relatório</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {pontos.length > 0 ? (
        <GraficoAcessivel resumo={`Prévia do relatório ${titulo}: ${series.join(' e ')} em ${pontos.length} ${pontos.length === 1 ? 'período' : 'períodos'}. Abra o relatório para ver a tabela.`}>
          <div className="h-20">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pontos} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={2}>
                <XAxis dataKey="label" hide />
                <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
                {series.map((s, i) => (
                  <Bar key={s} dataKey={s} name={s} fill={COR_SERIE[s] ?? corSerie(i + 1)} {...barraProps} radius={[3, 3, 0, 0]} maxBarSize={14} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GraficoAcessivel>
      ) : (
        <div className="h-20 rounded-xl bg-text-primary/[0.03] border border-border grid place-items-center">
          <span className="font-display text-2xl font-semibold tabular-nums">{formatarNumero(linhas)}</span>
        </div>
      )}
      <p className="text-xs text-text-primary/60">{formatarNumero(linhas)} {linhas === 1 ? 'linha' : 'linhas'} no relatório</p>
    </div>
  );
}
