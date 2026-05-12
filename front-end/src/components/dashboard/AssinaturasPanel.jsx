import { Link } from 'react-router-dom';
import { Repeat } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import BentoCard from '../ui/BentoCard';
import { brl } from '../../lib/formatters';

export default function AssinaturasPanel({ assinaturasAtivas, totalMensalAssin, pieAssinaturas, carregando, isDark }) {
  const tooltipBg = isDark ? '#1C1B1B' : '#FFFFFF';
  const tooltipTextColor = isDark ? '#FAFAFA' : '#18181B';
  const tooltipStyle = { backgroundColor: tooltipBg, border: 'none', borderRadius: '8px', fontSize: '12px', color: tooltipTextColor };

  return (
    <BentoCard
      className="col-span-12 lg:col-span-4 animate-fade-in-up animate-stagger-5"
      loading={carregando}
      title="Assinaturas Recorrentes"
      headerAction={
        <Link to="/assinaturas" className="text-[10px] font-bold uppercase tracking-widest text-text-primary/50 hover:text-primary transition-colors">
          Gerenciar →
        </Link>
      }
    >
      <div className="bg-error/10 border border-error/20 rounded-xl px-4 py-3 flex items-center justify-between mb-4 mt-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-error mb-0.5">Custo Mensal</p>
          <p className="text-2xl font-bold text-text-primary font-display">R$ {brl(totalMensalAssin)}</p>
          <p className="text-[10px] text-text-primary/50 mt-0.5">Anual: R$ {brl(totalMensalAssin * 12)}</p>
        </div>
        <Repeat className="w-8 h-8 text-error opacity-40" />
      </div>

      {pieAssinaturas.length > 0 && (
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pieAssinaturas} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
              {pieAssinaturas.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => `R$ ${brl(v)}`} />
          </PieChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-2 mt-2">
        {assinaturasAtivas.slice(0, 4).map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-surface-low rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{a.descricao}</p>
              <p className="text-[10px] text-text-primary/50">dia {a.diaVencimento}</p>
            </div>
            <span className="text-xs font-bold text-error shrink-0 ml-2">R$ {brl(a.valor)}</span>
          </div>
        ))}
        {assinaturasAtivas.length > 4 && (
          <p className="text-[10px] text-text-primary/40 text-center">+{assinaturasAtivas.length - 4} assinatura(s)</p>
        )}
        {assinaturasAtivas.length === 0 && (
          <p className="text-sm text-text-primary/50 text-center py-4">Nenhuma assinatura ativa</p>
        )}
      </div>
    </BentoCard>
  );
}
