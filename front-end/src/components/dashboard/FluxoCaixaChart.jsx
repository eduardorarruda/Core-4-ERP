import { AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';
import { cn } from '../../lib/utils';

function useChartColors(isDark) {
  return {
    gridColor: isDark ? '#353534' : '#E4E4E7',
    axisColor: isDark ? '#52525b' : '#71717a',
    tooltipBg: isDark ? '#1C1B1B' : '#FFFFFF',
    tooltipTextColor: isDark ? '#FAFAFA' : '#18181B',
    colorEntradas: isDark ? '#6EFFC0' : '#059669',
    colorSaidas: isDark ? '#FFB4AB' : '#DC2626',
  };
}

export default function FluxoCaixaChart({ cashFlowData, carregando, isDark, totalEntradas6m, totalSaidas6m, resultado6m, mediaEntradas }) {
  const { gridColor, axisColor, tooltipBg, tooltipTextColor, colorEntradas, colorSaidas } = useChartColors(isDark);
  const tooltipStyle = { backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', fontSize: '12px', color: tooltipTextColor };

  return (
    <BentoCard
      className="col-span-12 lg:col-span-8 animate-fade-in-up animate-stagger-1"
      loading={carregando}
      title="Fluxo de Caixa — Últimos 6 Meses"
      headerAction={
        <div className="flex gap-2">
          <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-primary">ENTRADAS</span>
          <span className="px-2 sm:px-3 py-1 bg-surface-low rounded-full text-[8px] sm:text-[10px] font-bold text-text-primary/60">SAÍDAS</span>
        </div>
      }
    >
      <div className="w-full mt-4">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={cashFlowData}>
            <defs>
              <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorEntradas} stopOpacity={isDark ? 0.3 : 0.2} />
                <stop offset="95%" stopColor={colorEntradas} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colorSaidas} stopOpacity={isDark ? 0.3 : 0.15} />
                <stop offset="95%" stopColor={colorSaidas} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
            {mediaEntradas > 0 && (
              <ReferenceLine y={mediaEntradas} stroke={colorEntradas} strokeDasharray="4 4" strokeOpacity={0.4} />
            )}
            <Area type="monotone" dataKey="entradas" stroke={colorEntradas} fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={2} />
            <Area type="monotone" dataKey="saidas" stroke={colorSaidas} fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-text-primary/5">
        <div className="bg-surface-low rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Entradas</span>
          </div>
          <p className="text-base font-bold text-primary">R$ {brl(totalEntradas6m)}</p>
          <p className="text-[10px] text-text-primary/40">acumulado 6 meses</p>
        </div>
        <div className="bg-surface-low rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-error" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Saídas</span>
          </div>
          <p className="text-base font-bold text-error">R$ {brl(totalSaidas6m)}</p>
          <p className="text-[10px] text-text-primary/40">acumulado 6 meses</p>
        </div>
        <div className={cn('bg-surface-low rounded-xl p-4 space-y-1', resultado6m < 0 && 'border border-error/20')}>
          <div className="flex items-center gap-1.5">
            {resultado6m >= 0
              ? <TrendingUp className="w-3.5 h-3.5 text-secondary" />
              : <TrendingDown className="w-3.5 h-3.5 text-error" />}
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50">Resultado</span>
          </div>
          <p className={cn('text-base font-bold', resultado6m >= 0 ? 'text-secondary' : 'text-error')}>
            {resultado6m >= 0 ? '+' : ''}R$ {brl(resultado6m)}
          </p>
          <p className="text-[10px] text-text-primary/40">saldo do período</p>
        </div>
      </div>
    </BentoCard>
  );
}
