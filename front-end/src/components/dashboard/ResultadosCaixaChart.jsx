import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';

export default function ResultadosCaixaChart({ resultsData, carregando, isDark }) {
  const gridColor = isDark ? '#353534' : '#E4E4E7';
  const axisColor = isDark ? '#52525b' : '#71717a';
  const tooltipBg = isDark ? '#1C1B1B' : '#FFFFFF';
  const tooltipTextColor = isDark ? '#FAFAFA' : '#18181B';
  const colorIncome  = isDark ? '#ACC7FF' : '#2563EB';
  const colorExpense = isDark ? '#FFB4AB' : '#DC2626';
  const tooltipStyle = { backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', fontSize: '12px', color: tooltipTextColor };

  return (
    <BentoCard
      className="col-span-12 lg:col-span-6 animate-fade-in-up animate-stagger-2"
      loading={carregando}
      title="Resultados de Caixa"
    >
      <div className="w-full mt-4">
        <ResponsiveContainer width="100%" height={256}>
          <BarChart data={resultsData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis dataKey="name" stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
            <Bar dataKey="income" name="Receitas" fill={colorIncome} radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Despesas" fill={colorExpense} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-8 mt-4 text-[10px] font-bold uppercase tracking-widest text-text-primary/50">
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-secondary rounded-full" /> Receitas</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 bg-error rounded-full" /> Despesas</div>
      </div>
    </BentoCard>
  );
}
