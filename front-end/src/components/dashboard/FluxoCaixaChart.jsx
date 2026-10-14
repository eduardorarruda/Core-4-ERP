import React, { useId } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, LineChart } from 'lucide-react';
import Card from '../ui/Card';
import ChartTooltip, { BrilhoLinha, GradienteArea, PontoFinal } from '../ui/ChartTooltip';
import GraficoAcessivel from '../ui/GraficoAcessivel';
import { CORES_GRAFICO, areaProps, eixoXProps, eixoYProps, formatarEixoMoeda, gradeProps, tooltipProps } from '../../lib/chartTheme';
import { formatarMoeda } from '../../lib/formatters';
import { cn } from '../../lib/utils';

/**
 * Entradas × saídas realizadas nos últimos 6 meses (um gráfico só no Início).
 * As linhas se desenham (1,3 s), a de entradas com brilho; saídas tracejadas para não
 * depender só da cor. Rodapé com uma linha de totais.
 *
 * dados: [{ rotulo: 'out', rotuloLongo: 'outubro de 2026', entradas, saidas }]
 */
function Legenda({ cor, rotulo, tracejado, Icone }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-primary/75">
      <svg width="18" height="8" aria-hidden="true">
        <line x1="1" y1="4" x2="17" y2="4" stroke={cor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={tracejado ? '4 3' : undefined} />
      </svg>
      <Icone className="w-3.5 h-3.5" aria-hidden="true" style={{ color: cor }} />
      {rotulo}
    </span>
  );
}

export default function FluxoCaixaChart({ dados = [], carregando = false, className }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = { ent: `fcE${uid}`, sai: `fcS${uid}`, brilho: `fcB${uid}` };
  const totalEntradas = dados.reduce((s, m) => s + m.entradas, 0);
  const totalSaidas = dados.reduce((s, m) => s + m.saidas, 0);
  const resultado = totalEntradas - totalSaidas;

  return (
    <Card
      className={className}
      loading={carregando}
      icon={LineChart}
      title="Entradas e saídas"
      subtitle="Dinheiro que entrou e saiu das contas nos últimos 6 meses"
      footer={
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-text-primary/65">6 meses:</span>
          <span className="tabular-nums"><span className="text-text-primary/65">entradas </span><strong className="text-income valor-privado">+{formatarMoeda(totalEntradas, { sinal: 'nunca' })}</strong></span>
          <span className="tabular-nums"><span className="text-text-primary/65">saídas </span><strong className="text-expense valor-privado">−{formatarMoeda(totalSaidas, { sinal: 'nunca' })}</strong></span>
          <span className="tabular-nums"><span className="text-text-primary/65">resultado </span><strong className={cn('valor-privado', resultado >= 0 ? 'text-income' : 'text-expense')}>{formatarMoeda(resultado, { sinal: 'sempre' })}</strong></span>
          <Link to="/reports" className="ml-auto text-sm font-medium text-primary hover:underline underline-offset-4 min-h-11 inline-flex items-center">
            Relatório de fluxo de caixa
          </Link>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2" aria-hidden="true">
        <Legenda cor={CORES_GRAFICO.entrada} rotulo="Entradas" Icone={ArrowDownLeft} />
        <Legenda cor={CORES_GRAFICO.saida} rotulo="Saídas" tracejado Icone={ArrowUpRight} />
      </div>
      <GraficoAcessivel
        resumo={`Entradas e saídas dos últimos 6 meses. Entradas somam ${formatarMoeda(totalEntradas)}, saídas ${formatarMoeda(totalSaidas)}, resultado ${formatarMoeda(resultado)}.`}
        tabela={{
          titulo: 'Entradas e saídas por mês',
          colunas: ['Mês', 'Entradas', 'Saídas', 'Resultado'],
          linhas: dados.map((m) => [m.rotuloLongo, formatarMoeda(m.entradas), formatarMoeda(m.saidas), formatarMoeda(m.entradas - m.saidas)]),
        }}
      >
        <div className="h-64 sm:h-72 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dados} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <GradienteArea id={ids.ent} cor={CORES_GRAFICO.entrada} opacidade={0.34} />
                <GradienteArea id={ids.sai} cor={CORES_GRAFICO.saida} opacidade={0.16} />
                <BrilhoLinha id={ids.brilho} intensidade={4} />
              </defs>
              <CartesianGrid {...gradeProps} />
              <XAxis dataKey="rotulo" {...eixoXProps} />
              <YAxis {...eixoYProps} tickFormatter={formatarEixoMoeda} />
              <Tooltip
                {...tooltipProps}
                content={<ChartTooltip formato="currency" nomes={{ entradas: 'Entradas', saidas: 'Saídas' }} rotuloFormatter={(r) => dados.find((d) => d.rotulo === r)?.rotuloLongo ?? r} />}
              />
              <Area
                dataKey="saidas"
                name="Saídas"
                stroke={CORES_GRAFICO.saida}
                strokeDasharray="6 4"
                fill={`url(#${ids.sai})`}
                {...areaProps}
                animationDuration={1300}
              />
              <Area
                dataKey="entradas"
                name="Entradas"
                stroke={CORES_GRAFICO.entrada}
                fill={`url(#${ids.ent})`}
                filter={`url(#${ids.brilho})`}
                {...areaProps}
                strokeWidth={2.5}
                animationDuration={1300}
                dot={<PontoFinal total={dados.length} cor={CORES_GRAFICO.entrada} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GraficoAcessivel>
    </Card>
  );
}
