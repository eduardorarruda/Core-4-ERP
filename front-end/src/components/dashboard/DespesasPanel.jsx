import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';

export default function DespesasPanel({ pieData, totalDespesasCat, carregando, isDark }) {
  const tooltipBg = isDark ? '#1C1B1B' : '#FFFFFF';
  const tooltipTextColor = isDark ? '#FAFAFA' : '#18181B';
  const tooltipStyle = { backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', fontSize: '12px', color: tooltipTextColor };

  return (
    <BentoCard
      className="col-span-12 lg:col-span-4 flex flex-col items-center justify-center animate-fade-in-up animate-stagger-3"
      loading={carregando}
      title="Despesas por Categoria"
    >
      <div className="relative w-48 h-48 mt-4">
        <ResponsiveContainer width={192} height={192}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
              {pieData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-primary font-display">R$ {brl(totalDespesasCat)}</span>
          <span className="text-[10px] text-text-primary/50 uppercase font-bold tracking-tighter">Mês Atual</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-8">
        {pieData.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-[10px] text-text-primary/60 uppercase font-bold truncate">{entry.name}</span>
          </div>
        ))}
      </div>
    </BentoCard>
  );
}
