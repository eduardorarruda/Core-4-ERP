import React, { useId } from 'react';
import { motion, useReducedMotionConfig } from 'motion/react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import GraficoAcessivel from '../ui/GraficoAcessivel';
import ChartTooltip, { BrilhoLinha, GradienteArea, PontoFinal } from '../ui/ChartTooltip';
import { usePadroesGrafico } from '../acessibilidade/padroesGrafico';
import {
  barraProps, areaProps, corSerie, eixoXProps, eixoYProps, formatarEixoMoeda, gradeProps, tooltipProps,
} from '../../lib/chartTheme';
import { formatarMoeda, formatarNumero } from '../../lib/formatters';
import { rotuloFatura } from './faturas';

/*
 * Gráficos do painel de cartões. Todos com resumo + tabela para leitor de tela
 * (GraficoAcessivel), cores de token e textura no modo "padrões nos gráficos".
 */

/** Evolução do total líquido das faturas (área com brilho e ponto final). */
export function EvolucaoFatura({ dados = [] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const serie = dados.map((d) => ({ rotulo: rotuloFatura(d.ano, d.mes), total: Number(d.totalLiquido) || 0 }));
  if (!serie.length) return null;
  const maior = serie.reduce((m, d) => (d.total > m.total ? d : m), serie[0]);
  return (
    <GraficoAcessivel
      resumo={`Total das faturas por mês. Maior: ${maior.rotulo}, ${formatarMoeda(maior.total)}.`}
      tabela={{ titulo: 'Total das faturas por mês', colunas: ['Mês', 'Total'], linhas: serie.map((d) => [d.rotulo, formatarMoeda(d.total)]) }}
    >
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={serie} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <GradienteArea id={`g${id}`} cor={corSerie(0)} opacidade={0.34} />
            <BrilhoLinha id={`b${id}`} />
          </defs>
          <CartesianGrid {...gradeProps} />
          <XAxis dataKey="rotulo" {...eixoXProps} />
          <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
          <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" nomes={{ total: 'Total da fatura' }} />} />
          <Area
            dataKey="total"
            stroke={corSerie(0)}
            fill={`url(#g${id})`}
            filter={`url(#b${id})`}
            {...areaProps}
            strokeWidth={2.5}
            animationDuration={1300}
            dot={<PontoFinal total={serie.length} cor={corSerie(0)} />}
          />
        </AreaChart>
      </ResponsiveContainer>
    </GraficoAcessivel>
  );
}

/** Gastos por categoria em cada mês do período (barras empilhadas). `resumo` = CartaoDashboardResumoDto[]. */
export function GastosPorCategoria({ resumo = [], maxCategorias = 5 }) {
  // Categorias mais pesadas no período; o resto vira "Outras"
  const totais = new Map();
  for (const r of resumo) totais.set(r.categoriaNome, (totais.get(r.categoriaNome) ?? 0) + Number(r.totalGasto || 0));
  const ordem = [...totais.entries()].sort((a, b) => b[1] - a[1]).map(([nome]) => nome);
  const principais = ordem.slice(0, ordem.length > maxCategorias ? maxCategorias - 1 : maxCategorias);
  const series = ordem.length > principais.length ? [...principais, 'Outras'] : principais;
  const padroes = usePadroesGrafico();

  const meses = [...new Map(resumo.map((r) => [`${r.ano}-${r.mes}`, { ano: r.ano, mes: r.mes }])).values()]
    .sort((a, b) => a.ano - b.ano || a.mes - b.mes);
  const dados = meses.map(({ ano, mes }) => {
    const linha = { rotulo: rotuloFatura(ano, mes) };
    series.forEach((s) => { linha[s] = 0; });
    resumo.filter((r) => r.ano === ano && r.mes === mes).forEach((r) => {
      const chave = principais.includes(r.categoriaNome) ? r.categoriaNome : 'Outras';
      linha[chave] += Number(r.totalGasto || 0);
    });
    return linha;
  });
  if (!dados.length) return null;

  return (
    <div className="space-y-4">
      <GraficoAcessivel
        resumo={`Gastos no cartão por categoria em ${dados.length} mês(es). Maior categoria: ${ordem[0]}.`}
        tabela={{
          titulo: 'Gastos por categoria e mês',
          colunas: ['Mês', ...series],
          linhas: dados.map((d) => [d.rotulo, ...series.map((s) => formatarMoeda(d[s]))]),
        }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {padroes.defs && <defs>{padroes.defs}</defs>}
            <CartesianGrid {...gradeProps} />
            <XAxis dataKey="rotulo" {...eixoXProps} />
            <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
            <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" />} />
            {series.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="cat" fill={padroes.preencher(i)} {...barraProps} radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </GraficoAcessivel>
      <ul className="flex flex-wrap gap-x-4 gap-y-2" aria-label="Legenda das categorias">
        {series.map((s, i) => (
          <li key={s} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0 text-xs text-text-primary/75">
            <span aria-hidden="true" className="w-2.5 h-2.5 rounded-sm" style={padroes.estiloAmostra(i)} />
            {s}
            <span className="tabular-nums text-text-primary/55 valor-privado">{formatarMoeda(s === 'Outras' ? ordem.slice(principais.length).reduce((t, n) => t + totais.get(n), 0) : totais.get(s), { casas: 0 })}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ranking horizontal (parceiros): barra que cresce com mola + valor. */
export function Ranking({ itens = [], rotulo = 'Ranking' }) {
  const reduzir = useReducedMotionConfig();
  if (!itens.length) return null;
  const maior = Math.max(...itens.map((i) => i.valor), 1);
  return (
    <ol aria-label={rotulo} className="space-y-3">
      {itens.map((item, i) => (
        <li key={item.nome} className="space-y-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
            <span className="flex items-baseline gap-2 min-w-0">
              <span className="w-4 text-xs tabular-nums text-text-primary/50">{i + 1}</span>
              <span className="truncate text-text-primary/85">{item.nome}</span>
            </span>
            <span className="tabular-nums font-medium text-text-primary valor-privado">{formatarMoeda(item.valor)}</span>
          </div>
          <div className="ml-6 h-1.5 rounded-full bg-text-primary/[0.07] overflow-hidden" aria-hidden="true">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,color-mix(in_srgb,var(--color-chart-2)_55%,transparent),var(--color-chart-2))]"
              style={{ transformOrigin: 'left', width: `${(item.valor / maior) * 100}%` }}
              initial={reduzir ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ type: 'spring', stiffness: 90, damping: 20, delay: reduzir ? 0 : 0.05 * i }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Valor já comprometido com parcelas nos próximos meses (barras verticais com degradê). */
export function Comprometimento({ dados = [] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const serie = dados.map((d) => ({ rotulo: rotuloFatura(d.ano, d.mes), total: Number(d.totalComprometido) || 0, qtd: d.qtdParcelas }));
  if (!serie.length) return null;
  return (
    <GraficoAcessivel
      resumo={`Parcelas já comprometidas nos próximos ${serie.length} meses.`}
      tabela={{ titulo: 'Parcelas comprometidas por mês', colunas: ['Mês', 'Valor', 'Parcelas'], linhas: serie.map((d) => [d.rotulo, formatarMoeda(d.total), formatarNumero(d.qtd)]) }}
    >
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={serie} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`c${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--color-invest)" stopOpacity={0.95} />
              <stop offset="1" stopColor="var(--color-invest)" stopOpacity={0.35} />
            </linearGradient>
          </defs>
          <XAxis dataKey="rotulo" {...eixoXProps} />
          <YAxis hide />
          <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" nomes={{ total: 'Comprometido' }} />} />
          <Bar dataKey="total" fill={`url(#c${id})`} {...barraProps} />
        </BarChart>
      </ResponsiveContainer>
    </GraficoAcessivel>
  );
}
