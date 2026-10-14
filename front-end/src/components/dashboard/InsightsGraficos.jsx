import React, { useId } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarRange, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';
import ChartTooltip, { BrilhoLinha, GradienteArea, PontoFinal } from '../ui/ChartTooltip';
import GraficoAcessivel from '../ui/GraficoAcessivel';
import { areaProps, barraProps, eixoXProps, eixoYProps, formatarEixoMoeda, gradeProps, tooltipProps } from '../../lib/chartTheme';
import { formatarMoeda, formatarNumero } from '../../lib/formatters';

/**
 * Gráficos da tela Insights (GET /api/insights):
 * - <RitmoDoMes ritmo diaReferencia /> — gasto acumulado dia a dia: este mês (linha que se desenha,
 *   com brilho), mês anterior (tracejada) e média de 3 meses (pontilhada).
 * - <GastoPorDiaDaSemana dias /> — barras dos últimos 90 dias com o maior dia em destaque e rotulado.
 */
const NOMES_RITMO = { atual: 'Este mês', mesAnterior: 'Mês anterior', media3Meses: 'Média de 3 meses' };

function LegendaLinha({ cor, rotulo, tracejado }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-primary/75">
      <svg width="20" height="8" aria-hidden="true">
        <line x1="1" y1="4" x2="19" y2="4" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={tracejado} />
      </svg>
      {rotulo}
    </span>
  );
}

function fraseRitmo(ritmo, dia) {
  const v = ritmo?.variacaoVsMesAnterior;
  if (v == null || !dia) return 'Sem base no mês anterior para comparar.';
  const pct = formatarNumero(Math.abs(Number(v)), 'percent', { casas: Math.abs(v) < 10 ? 1 : 0 });
  if (Math.abs(v) < 0.5) return `Até o dia ${dia}, você gastou o mesmo que no mesmo ponto do mês passado.`;
  return `Até o dia ${dia}, você gastou ${pct} ${v > 0 ? 'a mais' : 'a menos'} que no mesmo ponto do mês passado.`;
}

export function RitmoDoMes({ ritmo, diaReferencia, className }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const curva = (ritmo?.curva ?? []).map((p) => ({
    dia: p.dia,
    atual: p.atual == null ? null : Number(p.atual),
    mesAnterior: p.mesAnterior == null ? null : Number(p.mesAnterior),
    media3Meses: p.media3Meses == null ? null : Number(p.media3Meses),
  }));
  const ultimoAtual = curva.filter((p) => p.atual != null).length;
  const cores = { atual: 'var(--color-chart-1)', mesAnterior: 'var(--color-chart-3)', media3Meses: 'var(--color-chart-2)' };

  return (
    <Card
      className={className}
      icon={TrendingUp}
      title="Ritmo do mês"
      subtitle={fraseRitmo(ritmo, diaReferencia)}
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2" aria-hidden="true">
        <LegendaLinha cor={cores.atual} rotulo="Este mês" />
        <LegendaLinha cor={cores.mesAnterior} rotulo="Mês anterior" tracejado="5 4" />
        <LegendaLinha cor={cores.media3Meses} rotulo="Média 3 meses" tracejado="1 4" />
      </div>
      <GraficoAcessivel
        resumo={`Gasto acumulado do mês. ${fraseRitmo(ritmo, diaReferencia)} Gasto até agora: ${formatarMoeda(ritmo?.gastoAteHoje)}; no mesmo ponto do mês anterior: ${formatarMoeda(ritmo?.mesmoPeriodoMesAnterior)}.`}
        tabela={{
          titulo: 'Gasto acumulado por dia',
          colunas: ['Dia', 'Este mês', 'Mês anterior', 'Média de 3 meses'],
          linhas: curva.map((p) => [p.dia, p.atual == null ? '—' : formatarMoeda(p.atual), formatarMoeda(p.mesAnterior), formatarMoeda(p.media3Meses)]),
        }}
      >
        <div className="h-64 sm:h-72 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={curva} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <GradienteArea id={`rg${uid}`} cor={cores.atual} opacidade={0.3} />
                <BrilhoLinha id={`rb${uid}`} intensidade={4} />
              </defs>
              <CartesianGrid {...gradeProps} />
              <XAxis dataKey="dia" {...eixoXProps} tickFormatter={(d) => `${d}`} interval="preserveStartEnd" />
              <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
              <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" nomes={NOMES_RITMO} rotuloFormatter={(d) => `Dia ${d}`} />} />
              <Line dataKey="media3Meses" name="Média de 3 meses" stroke={cores.media3Meses} strokeDasharray="1 4" strokeWidth={2} dot={false} type="monotone" isAnimationActive={false} />
              <Line dataKey="mesAnterior" name="Mês anterior" stroke={cores.mesAnterior} strokeDasharray="5 4" strokeWidth={1.75} dot={false} type="monotone" isAnimationActive={false} />
              <Area
                dataKey="atual"
                name="Este mês"
                stroke={cores.atual}
                fill={`url(#rg${uid})`}
                filter={`url(#rb${uid})`}
                connectNulls={false}
                {...areaProps}
                strokeWidth={2.5}
                animationDuration={1300}
                dot={<PontoFinal total={ultimoAtual} cor={cores.atual} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GraficoAcessivel>
    </Card>
  );
}

const ABREV = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };

export function GastoPorDiaDaSemana({ dias = [], className }) {
  const dados = dias.map((d) => ({ ...d, rotulo: ABREV[d.diaSemana] ?? d.nome, total: Number(d.total ?? 0) }));
  const maior = dados.find((d) => d.maior);
  return (
    <Card
      className={className}
      icon={CalendarRange}
      title="Gasto por dia da semana"
      subtitle={maior ? `Nos últimos 90 dias, ${maior.nome} foi o dia de maior gasto.` : 'Últimos 90 dias'}
    >
      <GraficoAcessivel
        resumo={`Gasto por dia da semana nos últimos 90 dias. ${dados.map((d) => `${d.nome}: ${formatarMoeda(d.total)}`).join('; ')}.`}
        tabela={{ titulo: 'Gasto por dia da semana (90 dias)', colunas: ['Dia', 'Total', 'Compras'], linhas: dados.map((d) => [d.nome, formatarMoeda(d.total), d.quantidade]) }}
      >
        <div className="h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dados} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid {...gradeProps} />
              <XAxis dataKey="rotulo" {...eixoXProps} />
              <YAxis {...eixoYProps} width={56} tickFormatter={formatarEixoMoeda} />
              <Tooltip {...tooltipProps} content={<ChartTooltip formato="currency" nomes={{ total: 'Gasto' }} rotuloFormatter={(r) => dados.find((d) => d.rotulo === r)?.nome ?? r} />} />
              <Bar
                dataKey="total"
                name="Gasto"
                {...barraProps}
                label={({ x, y, width, index }) => (dados[index]?.maior ? (
                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--color-primary)">maior</text>
                ) : null)}
              >
                {dados.map((d) => (
                  <Cell key={d.diaSemana} fill={d.maior ? 'var(--color-chart-1)' : 'var(--color-chart-6)'} fillOpacity={d.maior ? 1 : 0.45} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GraficoAcessivel>
    </Card>
  );
}
